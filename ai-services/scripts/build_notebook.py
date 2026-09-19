"""Builds notebooks/museum_ai_service.ipynb from the museum_ai package.

The package is the source of truth (tested locally); the notebook embeds it with
%%writefile cells so Colab needs nothing but the notebook. Run after editing:

    python scripts/build_notebook.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "museum_ai"
OUTPUT = ROOT / "notebooks" / "museum_ai_service.ipynb"

MODULE_ORDER = [
    "__init__.py",
    "config.py",
    "signing.py",
    "schemas.py",
    "languages.py",
    "text.py",
    "translation.py",
    "tts.py",
    "audio.py",
    "backend_client.py",
    "worker.py",
    "server.py",
    "tunnel.py",
    "service.py",
]

INTRO = """# Smart Museum Guide - AI service (Google Colab)

Translates exhibit copy and narrates it for the museum CMS.

```text
Admin saves an exhibit
  -> backend queues one task per language
  -> POST /v1/jobs to this notebook (via a Cloudflare tunnel)
  -> queue: translate (TranslateGemma) -> narrate (VoxCPM2, OmniVoice for cs/uk)
  -> signed webhook -> backend stores the translation and the MP3 for that exhibit
```

### Before running
1. **Runtime -> Change runtime type -> GPU.** L4 or A100 is recommended. A T4 works: the translator is loaded in 4-bit automatically.
2. **Colab secrets** (key icon in the left bar), with notebook access switched on:
   - `AI_SERVICE_SECRET`: the same value as `AI_SERVICE_SECRET` in `backend/api/.env`.
   - `HF_TOKEN`: a Hugging Face token. First accept the Gemma license on https://huggingface.co/google/translategemma-4b-it.
3. **Make the backend API reachable from Colab.** On the machine running the API: `cloudflared tunnel --url http://localhost:3001`. Put `https://<random>.trycloudflare.com/api` in the form below.
4. **Runtime -> Run all**, then keep this tab open. Colab stops idle or long sessions; after a restart just run all again. Tasks that were waiting are picked up automatically.
"""

CONFIG = """#@title Configuration
BACKEND_API_URL = ""  #@param {type:"string"}
TRANSLATION_MODEL = "google/translategemma-4b-it"  #@param ["google/translategemma-4b-it", "google/translategemma-12b-it", "xiaomi-research/MiLMMT-46-4B-v1.0"]
TTS_MODEL = "openbmb/VoxCPM2"  #@param {type:"string"}
FALLBACK_TTS_MODEL = "k2-fsa/OmniVoice"  #@param ["k2-fsa/OmniVoice", ""]
VOICE_DESCRIPTION = "A warm, clear middle-aged female museum guide, calm and friendly storytelling tone"  #@param {type:"string"}
NARRATION_STYLE = ""  #@param {type:"string"}
#@markdown Test the pipeline without GPU models (a tone instead of speech, "[en] ..." instead of a translation):
MOCK_MODELS = False  #@param {type:"boolean"}

import os

def colab_secret(name):
    try:
        from google.colab import userdata
        return userdata.get(name) or ""
    except Exception:
        return os.environ.get(name, "")

os.environ.update({
    "BACKEND_API_URL": BACKEND_API_URL.strip().rstrip("/"),
    "AI_SERVICE_SECRET": colab_secret("AI_SERVICE_SECRET"),
    "TRANSLATION_MODEL": TRANSLATION_MODEL,
    "TTS_MODEL": TTS_MODEL,
    "FALLBACK_TTS_MODEL": FALLBACK_TTS_MODEL,
    "VOICE_DESCRIPTION": VOICE_DESCRIPTION,
    "NARRATION_STYLE": NARRATION_STYLE,
    "MOCK_MODELS": "1" if MOCK_MODELS else "0",
    "WORK_DIR": "/content/museum-ai",
})
if colab_secret("HF_TOKEN"):
    os.environ["HF_TOKEN"] = colab_secret("HF_TOKEN")

assert os.environ["BACKEND_API_URL"].endswith("/api"), "BACKEND_API_URL must look like https://....trycloudflare.com/api"
assert len(os.environ["AI_SERVICE_SECRET"]) >= 16, "Add the AI_SERVICE_SECRET Colab secret (16+ characters)"
print("Backend API:", os.environ["BACKEND_API_URL"])
"""

INSTALL = """#@title Install dependencies (a few minutes the first time)
import subprocess, sys

packages = ["fastapi>=0.115", "uvicorn>=0.30", "httpx>=0.27", "pydantic>=2.7", "soundfile>=0.12"]
if not MOCK_MODELS:
    packages += ["transformers>=4.57", "accelerate>=1.0", "bitsandbytes>=0.45", "voxcpm>=2.0"]
    if FALLBACK_TTS_MODEL:
        packages += ["omnivoice"]
subprocess.run([sys.executable, "-m", "pip", "install", "-q", *packages], check=True)
print("Installed:", ", ".join(packages))
"""

START = """#@title Start the service
import sys

try:
    service.stop()  # re-running this cell replaces the previous instance
except NameError:
    pass
for name in [module for module in list(sys.modules) if module.startswith("museum_ai")]:
    del sys.modules[name]  # pick up edited %%writefile cells

from museum_ai.config import Settings
from museum_ai.service import AiService

service = AiService(Settings.from_env()).start()
service.status()
"""

PREVIEW = """#@title Listening test (does not touch the CMS)
TEXT = "Trống đồng Đông Sơn là biểu tượng tiêu biểu của nền văn minh Việt cổ."  #@param {type:"string"}
SOURCE_LANGUAGE = "vi"  #@param {type:"string"}
TARGET_LANGUAGE = "en"  #@param {type:"string"}

from IPython.display import Audio, display

path = service.preview(TEXT, TARGET_LANGUAGE, source_language=SOURCE_LANGUAGE)
display(Audio(str(path)))
"""

KEEP_ALIVE = """#@title Keep running and show the log (stop this cell to use the notebook)
import json, time

log_file = f"{os.environ['WORK_DIR']}/service.log"
position = 0
while True:
    with open(log_file, encoding="utf-8") as file:
        file.seek(position)
        chunk = file.read()
        position = file.tell()
    if chunk:
        print(chunk, end="")
    time.sleep(10)
"""

TROUBLESHOOTING = """### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `The backend rejected the signature` | `AI_SERVICE_SECRET` here and in `backend/api/.env` differ. |
| `AI_SERVICE_SECRET is not set in backend/api/.env` | Set it, restart the API. |
| `Cannot reach BACKEND_API_URL` | Coolify API down, or local tunnel URL changed; use the stable `https://api.<domain>/api` in production, or restart `cloudflared` and update the form locally. |
| CMS shows *AI service offline* | This notebook stopped, or the tunnel died. Run all again; waiting tasks resume. |
| `401 ... gated repo` while loading TranslateGemma | Accept the license on Hugging Face and add `HF_TOKEN`. |
| CUDA out of memory | Use an L4/A100 runtime, keep `translategemma-4b-it`, or clear `FALLBACK_TTS_MODEL`. |
| A language sounds wrong | Try the listening test; change `VOICE_DESCRIPTION`, then delete `/content/museum-ai/voices` so reference voices are recreated, and press *Regenerate* in the CMS. |
"""


def markdown(source: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(source)}


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": _lines(source),
    }


def _lines(source: str) -> list:
    lines = source.strip("\n").split("\n")
    return [line + "\n" for line in lines[:-1]] + [lines[-1]]


def build() -> dict:
    cells = [
        markdown(INTRO),
        code(
            "!nvidia-smi || echo 'No GPU: switch the runtime type, or tick MOCK_MODELS to test the pipeline.'"
        ),
        code(CONFIG),
        code(INSTALL),
        markdown(
            "## Service code\n\n"
            "Generated from `ai-services/museum_ai` by `scripts/build_notebook.py` - edit the package, not these cells."
        ),
        code("import os\nos.makedirs('museum_ai', exist_ok=True)"),
    ]
    for name in MODULE_ORDER:
        source = (PACKAGE / name).read_text(encoding="utf-8")
        cells.append(code(f"%%writefile museum_ai/{name}\n{source}"))
    cells += [
        markdown("## Run"),
        code(START),
        code(PREVIEW),
        code(KEEP_ALIVE),
        markdown(TROUBLESHOOTING),
    ]
    return {
        "cells": cells,
        "metadata": {
            "accelerator": "GPU",
            "colab": {"gpuType": "L4", "provenance": [], "name": "museum_ai_service.ipynb"},
            "kernelspec": {"display_name": "Python 3", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 0,
    }


if __name__ == "__main__":
    missing = sorted({path.name for path in PACKAGE.glob("*.py")} - set(MODULE_ORDER))
    if missing:
        raise SystemExit(f"Add these modules to MODULE_ORDER: {', '.join(missing)}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(build(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")
