"""Runtime settings, read from environment variables (set them in the notebook)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Tuple


def _text(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    return value.strip()


def _flag(name: str, default: bool) -> bool:
    value = _text(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _codes(name: str, default: Tuple[str, ...]) -> Tuple[str, ...]:
    value = os.environ.get(name)
    if value is None:
        return default
    return tuple(code.strip().lower() for code in value.split(",") if code.strip())


def _number(name: str, default: float) -> float:
    value = _text(name)
    return float(value) if value is not None else default


@dataclass
class Settings:
    #: Backend API base URL including `/api`, reachable from Colab
    #: (e.g. `https://abc.trycloudflare.com/api`).
    backend_api_url: str
    #: Must equal AI_SERVICE_SECRET in backend/api/.env.
    secret: str

    host: str = "127.0.0.1"
    port: int = 8000
    #: Public URL of this service. Unset: open a Cloudflare quick tunnel.
    public_url: Optional[str] = None
    heartbeat_seconds: float = 20.0

    translation_model: str = "google/translategemma-4b-it"
    #: `auto` quantises the translator to 4-bit on GPUs under 20 GB (e.g. a T4).
    translation_quantization: str = "auto"
    tts_model: str = "openbmb/VoxCPM2"
    #: Used for languages the primary TTS model does not cover. Empty disables it.
    fallback_tts_model: Optional[str] = "k2-fsa/OmniVoice"
    #: Languages narrated by the fallback model, and therefore offered to the CMS.
    fallback_tts_languages: Tuple[str, ...] = ("cs", "uk")
    #: VoxCPM2 voice design prompt; one reference voice per language is created from it.
    voice_description: str = (
        "A warm, clear middle-aged female museum guide, calm and friendly storytelling tone"
    )
    #: Optional VoxCPM2 style instruction applied to every narrated sentence.
    narration_style: Optional[str] = None
    #: OmniVoice speaker attributes (gender, age, pitch).
    omnivoice_instruct: str = "female, middle-aged, moderate pitch"
    #: Your own reference recording (3-10 s) cloned for every language instead.
    reference_voice_path: Optional[str] = None
    reference_voice_text: Optional[str] = None
    #: torch.compile for VoxCPM2: faster once warm, but slow to start and fragile on older GPUs.
    voxcpm_optimize: bool = False

    max_chunk_chars: int = 220
    mp3_bitrate: str = "64k"
    work_dir: str = ".museum-ai"
    #: Replace every model with a fast fake, to test the pipeline without a GPU.
    mock_models: bool = False

    @classmethod
    def from_env(cls) -> "Settings":
        backend_api_url = _text("BACKEND_API_URL")
        secret = _text("AI_SERVICE_SECRET")
        if not backend_api_url:
            raise ValueError("BACKEND_API_URL is required (e.g. https://abc.trycloudflare.com/api).")
        if not secret or len(secret) < 16:
            raise ValueError("AI_SERVICE_SECRET is required and must be at least 16 characters.")

        defaults = cls(backend_api_url="", secret="")
        # Unset keeps the default; an empty value disables the fallback model.
        fallback = os.environ.get("FALLBACK_TTS_MODEL")
        return cls(
            backend_api_url=backend_api_url.rstrip("/"),
            secret=secret,
            host=_text("HOST", defaults.host),
            port=int(_number("PORT", defaults.port)),
            public_url=(_text("PUBLIC_URL") or "").rstrip("/") or None,
            heartbeat_seconds=_number("HEARTBEAT_SECONDS", defaults.heartbeat_seconds),
            translation_model=_text("TRANSLATION_MODEL", defaults.translation_model),
            translation_quantization=_text(
                "TRANSLATION_QUANTIZATION", defaults.translation_quantization
            ).lower(),
            tts_model=_text("TTS_MODEL", defaults.tts_model),
            fallback_tts_model=defaults.fallback_tts_model
            if fallback is None
            else (fallback.strip() or None),
            fallback_tts_languages=_codes("FALLBACK_TTS_LANGUAGES", defaults.fallback_tts_languages),
            voice_description=_text("VOICE_DESCRIPTION", defaults.voice_description),
            narration_style=_text("NARRATION_STYLE"),
            omnivoice_instruct=_text("OMNIVOICE_INSTRUCT", defaults.omnivoice_instruct),
            reference_voice_path=_text("REFERENCE_VOICE_PATH"),
            reference_voice_text=_text("REFERENCE_VOICE_TEXT"),
            voxcpm_optimize=_flag("VOXCPM_OPTIMIZE", defaults.voxcpm_optimize),
            max_chunk_chars=int(_number("MAX_CHUNK_CHARS", defaults.max_chunk_chars)),
            mp3_bitrate=_text("MP3_BITRATE", defaults.mp3_bitrate),
            work_dir=_text("WORK_DIR", defaults.work_dir),
            mock_models=_flag("MOCK_MODELS", defaults.mock_models),
        )
