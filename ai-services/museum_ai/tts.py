"""Narration: text-to-speech with a consistent voice per language.

Primary model: openbmb/VoxCPM2 (Apache-2.0, 30 languages incl. vi, th, km, lo,
id, ms, fil). The languages listed in FALLBACK_TTS_LANGUAGES (cs, uk by default)
use k2-fsa/OmniVoice instead (600+ languages, but only these are offered, as
quality varies widely; its weights are CC-BY-NC - fine for research, not for
commercial use).

Voice consistency: on first use of a language, the engine designs a reference
voice from the voice description by speaking a short sample sentence in that
language. Every narration in that language then clones this reference, so all
exhibits share one guide voice, and cloning within the same language avoids a
foreign accent.
"""

from __future__ import annotations

import json
import logging
import math
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, FrozenSet, Iterable, List, Optional, Protocol, Tuple

import numpy as np

from .languages import VOICE_SAMPLE_SENTENCE
from .text import chunk_text
from .translation import Translator

logger = logging.getLogger(__name__)

PAUSE_BETWEEN_CHUNKS_SECONDS = 0.25


@dataclass
class Voice:
    wav_path: str
    transcript: str


class SpeechEngine(Protocol):
    model_id: str
    sample_rate: int

    def supports(self, language: str) -> bool: ...

    def design(self, text: str, language: str) -> np.ndarray: ...

    def clone(self, text: str, language: str, voice: Voice) -> np.ndarray: ...


class VoxCPM2Engine:
    #: From the VoxCPM2 model card (fil = Tagalog, zh-hant read as Chinese).
    LANGUAGES = {
        "ar", "my", "zh", "zh-hant", "da", "nl", "en", "fi", "fr", "de", "el", "he", "hi", "id",
        "it", "ja", "km", "ko", "lo", "ms", "no", "pl", "pt", "ru", "es", "sw", "sv", "fil",
        "th", "tr", "vi",
    }  # fmt: skip

    def __init__(self, model_id: str, voice_description: str, style: Optional[str], optimize: bool):
        from voxcpm import VoxCPM

        self.model_id = model_id
        self.voice_description = voice_description
        self.style = style
        self.model = VoxCPM.from_pretrained(model_id, load_denoiser=False, optimize=optimize)
        self.sample_rate = int(self.model.tts_model.sample_rate)

    def supports(self, language: str) -> bool:
        return language in self.LANGUAGES

    def design(self, text: str, language: str) -> np.ndarray:
        # Voice design: the description goes in parentheses before the text.
        return self._generate(f"({self.voice_description}){text}")

    def clone(self, text: str, language: str, voice: Voice) -> np.ndarray:
        prefix = f"({self.style})" if self.style else ""
        return self._generate(f"{prefix}{text}", reference_wav_path=voice.wav_path)

    def _generate(self, text: str, **kwargs) -> np.ndarray:
        wav = self.model.generate(text=text, cfg_value=2.0, inference_timesteps=10, seed=42, **kwargs)
        return np.asarray(wav, dtype=np.float32)


class OmniVoiceEngine:
    sample_rate = 24000
    CODES = {"zh-hant": "zh"}

    def __init__(self, model_id: str, instruct: str):
        import torch
        from omnivoice import OmniVoice

        self.model_id = model_id
        self.instruct = instruct
        self.model = OmniVoice.from_pretrained(
            model_id,
            device_map="cuda:0" if torch.cuda.is_available() else "cpu",
            dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        )

    def supports(self, language: str) -> bool:
        return True

    def design(self, text: str, language: str) -> np.ndarray:
        audio = self.model.generate(text=text, language=self._code(language), instruct=self.instruct)
        return np.asarray(audio[0], dtype=np.float32)

    def clone(self, text: str, language: str, voice: Voice) -> np.ndarray:
        audio = self.model.generate(
            text=text,
            language=self._code(language),
            ref_audio=voice.wav_path,
            ref_text=voice.transcript,
        )
        return np.asarray(audio[0], dtype=np.float32)

    def _code(self, language: str) -> str:
        return self.CODES.get(language, language)


class MockEngine:
    """A soft tone whose length follows the text; used with MOCK_MODELS=1."""

    model_id = "mock-tts"
    sample_rate = 24000

    def supports(self, language: str) -> bool:
        return True

    def design(self, text: str, language: str) -> np.ndarray:
        return self._tone(text)

    def clone(self, text: str, language: str, voice: Voice) -> np.ndarray:
        return self._tone(text)

    def _tone(self, text: str) -> np.ndarray:
        seconds = min(8.0, 0.4 + 0.04 * len(text))
        t = np.arange(int(seconds * self.sample_rate)) / self.sample_rate
        return (0.2 * np.sin(2 * math.pi * 440 * t)).astype(np.float32)


class Narrator:
    """Chooses the engine per language, manages reference voices and joins chunks."""

    def __init__(
        self,
        primary: SpeechEngine,
        fallback_model_id: Optional[str],
        fallback_loader: Optional[Callable[[], SpeechEngine]],
        fallback_languages: Iterable[str],
        translator: Translator,
        voice_dir: Path,
        max_chunk_chars: int,
        reference_voice: Optional[Voice] = None,
    ) -> None:
        self.primary = primary
        self.fallback_model_id = fallback_model_id
        self._fallback_loader = fallback_loader
        self.fallback_languages: FrozenSet[str] = frozenset(fallback_languages)
        self._fallback: Optional[SpeechEngine] = None
        self.translator = translator
        self.voice_dir = voice_dir
        self.max_chunk_chars = max_chunk_chars
        self.reference_voice = reference_voice
        self._voices: Dict[Tuple[str, str], Voice] = {}
        self._lock = threading.Lock()
        voice_dir.mkdir(parents=True, exist_ok=True)

    @property
    def model_ids(self) -> List[str]:
        return [self.primary.model_id] + ([self.fallback_model_id] if self.fallback_model_id else [])

    def supports(self, language: str) -> bool:
        if self.primary.supports(language):
            return True
        return self._fallback_loader is not None and language in self.fallback_languages

    def narrate(self, text: str, language: str) -> Tuple[np.ndarray, int, str]:
        """Returns (mono float32 waveform, sample rate, model id)."""
        engine = self.engine_for(language)
        voice = self.voice_for(engine, language)
        chunks = chunk_text(text, self.max_chunk_chars)
        if not chunks:
            raise ValueError("Nothing to narrate: the text is empty.")

        pause = np.zeros(int(PAUSE_BETWEEN_CHUNKS_SECONDS * engine.sample_rate), dtype=np.float32)
        pieces = []
        for index, chunk in enumerate(chunks):
            if index:
                pieces.append(pause)
            pieces.append(engine.clone(chunk, language, voice))
        return np.concatenate(pieces), engine.sample_rate, engine.model_id

    def engine_for(self, language: str) -> SpeechEngine:
        if self.primary.supports(language):
            return self.primary
        if not self.supports(language):
            raise ValueError(f"No narration model is configured for '{language}'.")
        with self._lock:
            if self._fallback is None:
                logger.info("Loading fallback TTS model for '%s'", language)
                self._fallback = self._fallback_loader()
        return self._fallback

    def voice_for(self, engine: SpeechEngine, language: str) -> Voice:
        if self.reference_voice:
            return self.reference_voice

        key = (engine.model_id, language)
        if key in self._voices:
            return self._voices[key]

        stem = f"{engine.model_id.replace('/', '_')}-{language}"
        wav_path = self.voice_dir / f"{stem}.wav"
        meta_path = self.voice_dir / f"{stem}.json"
        if wav_path.exists() and meta_path.exists():
            voice = Voice(str(wav_path), json.loads(meta_path.read_text())["transcript"])
        else:
            transcript = self._sample_sentence(language)
            logger.info("Designing the %s reference voice with %s", language, engine.model_id)
            _write_wav(wav_path, engine.design(transcript, language), engine.sample_rate)
            meta_path.write_text(json.dumps({"transcript": transcript}, ensure_ascii=False))
            voice = Voice(str(wav_path), transcript)
        self._voices[key] = voice
        return voice

    def _sample_sentence(self, language: str) -> str:
        if language == "en":
            return VOICE_SAMPLE_SENTENCE
        try:
            return self.translator.translate(VOICE_SAMPLE_SENTENCE, "en", language)
        except Exception:  # noqa: BLE001 - an English sample still yields a usable voice
            logger.exception("Could not translate the voice sample into %s", language)
            return VOICE_SAMPLE_SENTENCE


def _write_wav(path: Path, wav: np.ndarray, sample_rate: int) -> None:
    import soundfile as sf

    sf.write(str(path), wav, sample_rate)
