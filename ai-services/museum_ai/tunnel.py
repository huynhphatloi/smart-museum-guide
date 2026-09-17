"""Cloudflare quick tunnel: a public https URL for a Colab runtime, no account needed."""

from __future__ import annotations

import logging
import os
import platform
import re
import stat
import subprocess
import threading
import time
import urllib.request
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)

_URL = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
_RELEASES = "https://github.com/cloudflare/cloudflared/releases/latest/download"


def start_quick_tunnel(port: int, bin_dir: Path, timeout: float = 90.0) -> Tuple[subprocess.Popen, str]:
    """Starts `cloudflared tunnel --url http://127.0.0.1:<port>` and returns (process, public URL)."""
    binary = _cloudflared(bin_dir)
    process = subprocess.Popen(
        [binary, "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    found: list = []
    ready = threading.Event()

    def pump() -> None:
        # Keep draining the output for the tunnel's whole life, or cloudflared blocks.
        for line in process.stdout:  # type: ignore[union-attr]
            match = _URL.search(line)
            if match and not found:
                found.append(match.group(0))
                ready.set()
        ready.set()

    threading.Thread(target=pump, name="cloudflared-output", daemon=True).start()
    if not ready.wait(timeout) or not found:
        process.terminate()
        raise RuntimeError("cloudflared did not report a public URL. Set PUBLIC_URL to use another tunnel.")

    # The hostname needs a moment to resolve before the first request arrives.
    time.sleep(3)
    return process, found[0]


def _cloudflared(bin_dir: Path) -> str:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / "cloudflared"
        if candidate.exists():
            return str(candidate)

    machine = platform.machine().lower()
    asset = "cloudflared-linux-arm64" if machine in ("aarch64", "arm64") else "cloudflared-linux-amd64"
    target = bin_dir / "cloudflared"
    if not target.exists():
        bin_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading %s", asset)
        urllib.request.urlretrieve(f"{_RELEASES}/{asset}", target)
        target.chmod(target.stat().st_mode | stat.S_IEXEC)
    return str(target)
