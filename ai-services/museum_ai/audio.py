"""Waveform -> compressed file for the webhook."""

from __future__ import annotations

import io
import shutil
import subprocess
import wave
from typing import Tuple

import numpy as np


def encode(wav: np.ndarray, sample_rate: int, bitrate: str = "64k") -> Tuple[bytes, str]:
    """Returns (file bytes, mime type): MP3 through ffmpeg, or WAV when ffmpeg is missing.

    Mono 64 kbps MP3 keeps a two-minute narration near 1 MB, small enough to
    travel base64-encoded inside the webhook JSON.
    """
    pcm = _to_pcm16(wav)
    if shutil.which("ffmpeg"):
        result = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error",
                "-f", "s16le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0",
                "-codec:a", "libmp3lame", "-b:a", bitrate, "-f", "mp3", "pipe:1",
            ],
            input=pcm,
            capture_output=True,
            check=True,
        )  # fmt: skip
        return result.stdout, "audio/mpeg"

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(sample_rate)
        file.writeframes(pcm)
    return buffer.getvalue(), "audio/wav"


def duration_seconds(wav: np.ndarray, sample_rate: int) -> float:
    return round(len(wav) / sample_rate, 2)


def _to_pcm16(wav: np.ndarray) -> bytes:
    samples = np.asarray(wav, dtype=np.float32).reshape(-1)
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak > 0:
        # Normalise to -1 dBFS so every language plays at a similar volume.
        samples = samples * (0.89 / peak)
    return (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()
