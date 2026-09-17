"""Wires everything together: models, queue, HTTP server, tunnel and heartbeats."""

from __future__ import annotations

import logging
import platform
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import uvicorn

from . import __version__
from .audio import encode
from .backend_client import BackendClient, Outbox, heartbeat_loop
from .config import Settings
from .languages import supported_languages
from .server import create_app
from .translation import load_translator
from .tts import MockEngine, Narrator, OmniVoiceEngine, SpeechEngine, Voice, VoxCPM2Engine
from .tunnel import start_quick_tunnel
from .worker import LocalizationWorker, TaskCancelled

logger = logging.getLogger("museum_ai")


class _ThreadedServer(uvicorn.Server):
    """uvicorn inside a background thread (the notebook keeps its main thread)."""

    def install_signal_handlers(self) -> None:  # pragma: no cover - older uvicorn only
        pass


class AiService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.instance_id = uuid.uuid4().hex
        self.work_dir = Path(settings.work_dir).resolve()
        self.gpu_lock = threading.Lock()
        self.public_url: Optional[str] = None
        self.device = _device_name()
        self._stop = threading.Event()
        self._tunnel: Optional[subprocess.Popen] = None
        self._server: Optional[_ThreadedServer] = None

        self.client = BackendClient(settings.backend_api_url, settings.secret)
        self.outbox = Outbox(self.client)
        self.translator = None
        self.narrator: Optional[Narrator] = None
        self.worker: Optional[LocalizationWorker] = None

    # ---- lifecycle ------------------------------------------------------------

    def start(self) -> "AiService":
        self.work_dir.mkdir(parents=True, exist_ok=True)
        _configure_logging(self.work_dir / "service.log")
        self._check_backend()
        self._load_models()

        self.worker = LocalizationWorker(
            translator=self.translator,
            narrator=self.narrator,
            outbox=self.outbox,
            send_progress=self._send_progress,
            gpu_lock=self.gpu_lock,
            mp3_bitrate=self.settings.mp3_bitrate,
        )
        self.worker.start()
        threading.Thread(target=self.outbox.run, name="webhook-outbox", daemon=True).start()

        self._start_http()
        if self.settings.public_url:
            self.public_url = self.settings.public_url
        else:
            self._tunnel, self.public_url = start_quick_tunnel(self.settings.port, self.work_dir / "bin")
        logger.info("AI service reachable at %s", self.public_url)

        threading.Thread(
            target=heartbeat_loop,
            args=(self.client, self._heartbeat_payload, self.settings.heartbeat_seconds, self._stop),
            name="heartbeat",
            daemon=True,
        ).start()
        return self

    def stop(self) -> None:
        self._stop.set()
        if self.worker:
            self.worker.stop()
        self.outbox.stop()
        if self._server:
            self._server.should_exit = True
        if self._tunnel:
            self._tunnel.terminate()
        logger.info("AI service stopped")

    def languages(self) -> List[str]:
        """Languages both loaded models cover; the CMS offers exactly these."""
        if not self.translator or not self.narrator:
            return []
        return supported_languages(self.translator.languages, self.narrator.supports)

    def status(self) -> Dict[str, Any]:
        return {
            "instanceId": self.instance_id,
            "version": __version__,
            "publicUrl": self.public_url,
            "backendApiUrl": self.settings.backend_api_url,
            "device": self.device,
            "translationModel": getattr(self.translator, "model_id", None),
            "ttsModels": self.narrator.model_ids if self.narrator else [],
            "languages": self.languages(),
            "queueSize": self.worker.queue_size() if self.worker else 0,
            "activeTaskIds": self.worker.active_task_ids() if self.worker else [],
            "pendingWebhooks": len(self.outbox),
        }

    # ---- listening test -------------------------------------------------------

    def preview(
        self, text: str, language: str, source_language: Optional[str] = None, filename: Optional[str] = None
    ) -> Path:
        """Translates (when `source_language` differs) and narrates `text` without the backend.

        Returns the path of an audio file to play in the notebook.
        """
        assert self.narrator and self.translator, "Call start() first."
        with self.gpu_lock:
            if source_language and source_language != language:
                text = self.translator.translate(text, source_language, language)
                logger.info("Translation (%s): %s", language, text)
            wav, sample_rate, _ = self.narrator.narrate(text, language)
        audio, mime_type = encode(wav, sample_rate, self.settings.mp3_bitrate)
        extension = ".mp3" if mime_type == "audio/mpeg" else ".wav"
        path = self.work_dir / "previews" / (filename or f"preview-{language}-{int(time.time())}{extension}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(audio)
        return path

    # ---- internals ----------------------------------------------------------------

    def _check_backend(self) -> None:
        try:
            response = self.client.ping()
        except httpx.HTTPError as error:
            logger.warning(
                "Cannot reach BACKEND_API_URL=%s (%s). The service will keep retrying.",
                self.settings.backend_api_url,
                error,
            )
            return
        if response.status_code == 401:
            raise RuntimeError(
                "The backend rejected the signature: AI_SERVICE_SECRET differs from backend/api/.env."
            )
        if response.status_code == 503:
            raise RuntimeError(
                "AI_SERVICE_SECRET is not set in backend/api/.env - set it and restart the API."
            )
        if response.status_code == 404:
            raise RuntimeError(
                f"{self.settings.backend_api_url}/ai-services/ping was not found. "
                "BACKEND_API_URL must end with /api."
            )
        if response.status_code < 300:
            logger.info("Backend API reachable at %s", self.settings.backend_api_url)

    def _load_models(self) -> None:
        settings = self.settings
        start = time.time()
        self.translator = load_translator(
            settings.translation_model, settings.translation_quantization, settings.mock_models
        )

        primary: SpeechEngine
        fallback_loader = None
        fallback_id = None
        if settings.mock_models:
            primary = MockEngine()
        else:
            logger.info("Loading TTS model %s", settings.tts_model)
            primary = VoxCPM2Engine(
                settings.tts_model,
                settings.voice_description,
                settings.narration_style,
                settings.voxcpm_optimize,
            )
            if settings.fallback_tts_model:
                fallback_id = settings.fallback_tts_model
                fallback_loader = lambda: OmniVoiceEngine(fallback_id, settings.omnivoice_instruct)  # noqa: E731

        reference_voice = None
        if settings.reference_voice_path:
            if not settings.reference_voice_text:
                raise ValueError(
                    "REFERENCE_VOICE_TEXT (the transcript) is required with REFERENCE_VOICE_PATH."
                )
            reference_voice = Voice(settings.reference_voice_path, settings.reference_voice_text)

        self.narrator = Narrator(
            primary=primary,
            fallback_model_id=fallback_id,
            fallback_loader=fallback_loader,
            fallback_languages=settings.fallback_tts_languages,
            translator=self.translator,
            voice_dir=self.work_dir / "voices",
            max_chunk_chars=settings.max_chunk_chars,
            reference_voice=reference_voice,
        )
        logger.info("Models ready in %.0fs on %s", time.time() - start, self.device)
        logger.info("Offering %d languages: %s", len(self.languages()), ", ".join(self.languages()))

    def _start_http(self) -> None:
        app = create_app(self.settings.secret, self.worker, self.status)
        config = uvicorn.Config(app, host=self.settings.host, port=self.settings.port, log_level="warning")
        self._server = _ThreadedServer(config)
        threading.Thread(target=self._server.run, name="http", daemon=True).start()
        deadline = time.time() + 30
        while not self._server.started:
            if time.time() > deadline:
                raise RuntimeError(f"The HTTP server did not start on port {self.settings.port}.")
            time.sleep(0.1)

    def _heartbeat_payload(self) -> Dict[str, Any]:
        return {
            "instanceId": self.instance_id,
            "url": self.public_url,
            "queueSize": self.worker.queue_size() if self.worker else 0,
            "activeTaskIds": self.worker.active_task_ids() if self.worker else [],
            "translationModel": getattr(self.translator, "model_id", None) or self.settings.translation_model,
            "ttsModels": self.narrator.model_ids if self.narrator else [self.settings.tts_model],
            "languages": self.languages(),
            "device": self.device,
        }

    def _send_progress(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            response = self.client.send_event(event)
        except httpx.HTTPError as error:
            logger.warning("Progress update failed: %s", error)
            return None
        if response.status_code == 404:
            raise TaskCancelled("the task no longer exists")
        if response.status_code >= 300:
            logger.warning("Progress update rejected (%s): %s", response.status_code, response.text[:200])
            return None
        return response.json()


def _device_name() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            properties = torch.cuda.get_device_properties(0)
            return f"{properties.name} ({properties.total_memory / 1024**3:.0f} GB)"
    except ImportError:
        pass
    return f"CPU ({platform.machine()})"


def _configure_logging(log_file: Path) -> None:
    """Logs to the console and to a file: Colab shows background-thread output in whichever cell runs."""
    root = logging.getLogger("museum_ai")
    if root.handlers:
        return
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s", "%H:%M:%S")
    for handler in (logging.StreamHandler(), logging.FileHandler(log_file, encoding="utf-8")):
        handler.setFormatter(formatter)
        root.addHandler(handler)
    root.setLevel(logging.INFO)
    root.propagate = False


def main() -> None:
    service = AiService(Settings.from_env()).start()
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        service.stop()


if __name__ == "__main__":
    main()
