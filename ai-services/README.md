# AI service

Translates exhibit copy and narrates it for the museum CMS. It runs as a separate service, normally a Google Colab notebook, so the translation and speech models can use a free or cheap GPU instead of the API server.

## How it fits together

```text
Admin presses Save
  │
  ▼
backend API ── creates one LocalizationTask per language (status QUEUED)
  │            POST <ai service>/v1/jobs            (signed)
  ▼
AI service queue ── one GPU worker, tasks in arrival order
  │   1. translate the primary copy       (skipped for the primary language)
  │   2. narrate title + summary + body   (sentence chunks, one voice per language)
  │   3. encode MP3
  │
  └── POST <api>/ai-services/webhooks/localization   (signed)
        task.processing (translating | synthesizing)
        task.completed  (translation + base64 audio)
        task.failed     (error)
  │
  ▼
backend API ── stores ExhibitTranslation + audio file, task COMPLETED
Admin exhibit page ── polls GET /admin/exhibits/:id/localization
```

| Piece | Where |
| --- | --- |
| Task table, planner, dispatcher, webhook | `backend/api/src/localization/` |
| Status panel (waiting, translating, audio, content, retry) | `backend/admin/src/features/exhibits/ui/localization-panel.tsx` |
| Service package (source of truth, tested) | `ai-services/museum_ai/` |
| Colab notebook (generated from the package) | `ai-services/notebooks/museum_ai_service.ipynb` |

### Reliability rules

- **Colab URLs change.** The service announces itself with a heartbeat every 20 seconds (`POST /api/ai-services/heartbeat`), carrying its current public URL. The API needs no restart.
- **The models decide the languages.** Each heartbeat also carries the languages the loaded models support (see below). The API stores the latest list in `ai_service_profile`, so it survives API restarts and Colab downtime. The Admin exhibit editor and the visitor apps (`GET /api/public/languages`) offer exactly that list. Until a service has ever reported, `SUPPORTED_LANGUAGES` from `backend/api/.env` is used.
- **Nothing is lost while Colab is down.** Tasks stay `QUEUED` in PostgreSQL and are handed over when a service sends a heartbeat. A new runtime has a new instance id, so tasks held by the old runtime are dispatched again.
- **No duplicate work.** A language whose narration was generated from the current primary copy is skipped. An in-flight task for the same copy is not duplicated. Editing the primary copy supersedes older tasks. The worker checks the progress answer and skips superseded tasks.
- **Results survive API downtime.** Final webhooks are retried from an outbox until the API answers. A result the API rejects becomes `task.failed` with the reason.
- **Authentication.** Both directions sign the raw body: `X-Museum-Signature: t=<unix>,v1=<HMAC-SHA256("<t>.<body>")>` with `AI_SERVICE_SECRET`. Requests older than 5 minutes are refused.

## Models

| Step | Default | Why | License |
| --- | --- | --- | --- |
| Translation | `google/translategemma-4b-it` | Trained on every offered language, including km, lo, my and fil (technical report, appendix C). Use `-12b-it` for better quality on an A100. | Gemma terms, gated (accept on Hugging Face, set `HF_TOKEN`) |
| Translation (alternative) | `xiaomi-research/MiLMMT-46-4B-v1.0` | Reported stronger than TranslateGemma, not gated. Has no Ukrainian or Swahili. | Gemma terms |
| Narration | `openbmb/VoxCPM2` | 30 languages including vi, th, km, lo, id, ms, fil; voice design; 48 kHz | Apache-2.0 |
| Narration fallback | `k2-fsa/OmniVoice` | Loaded only for languages VoxCPM2 lacks (cs, uk) | Weights CC-BY-NC (research only) |

**Offered languages.** A language is offered only when both the translation model and a narration model cover it. With the defaults this gives 33 languages: vi, en, ja, ko, zh, zh-hant, th, id, ms, km, lo, my, fil, hi, ar, he, tr, fr, de, es, it, pt, nl, ru, uk, pl, cs, el, sv, da, no, fi, sw. Switching to MiLMMT drops uk and sw. Clearing `FALLBACK_TTS_MODEL` drops cs and uk. To offer more OmniVoice languages, add their codes to `FALLBACK_TTS_LANGUAGES` and to `LANGUAGE_NAMES` in `museum_ai/languages.py`, and give them display names in `backend/api/src/languages/language-catalog.ts`.

**Voice consistency.** The first time a language is narrated, VoxCPM2 designs a voice from `VOICE_DESCRIPTION` by speaking a short sample sentence in that language. It saves the result to `WORK_DIR/voices/`. Every later narration in that language clones this reference, so all exhibits share one guide voice without a foreign accent. To use a recording of your own voice for every language instead, set `REFERENCE_VOICE_PATH` and `REFERENCE_VOICE_TEXT`.

GPU memory: an L4 (24 GB) holds the translator in bf16 plus VoxCPM2. On a T4 (16 GB) the translator is loaded in 4-bit automatically.

## Run on Google Colab

### Production (Coolify API — preferred)

When the backend is deployed on Coolify, the API HTTPS domain is stable. Use that URL so webhooks keep working without updating the notebook after every local tunnel restart.

1. Deploy the API (see [../README.md](../README.md) and [../deploy/coolify.env.example](../deploy/coolify.env.example)).
2. Set the same `AI_SERVICE_SECRET` in Coolify and in Colab secrets (`openssl rand -hex 24`).
3. Open `notebooks/museum_ai_service.ipynb` in Colab, select a GPU runtime, and add Colab secrets `AI_SERVICE_SECRET` and `HF_TOKEN`.
4. Set `BACKEND_API_URL` to `https://api.<your-domain>/api` **once**.
5. **Runtime → Run all**. The notebook still opens its own tunnel as `PUBLIC_URL`; heartbeats teach the Coolify API the current Colab URL.

Webhook the API must expose publicly:

`POST https://api.<your-domain>/api/ai-services/webhooks/localization`

### Local development (temporary tunnel)

1. In `backend/api/.env`, set `AI_SERVICE_SECRET` to 16 or more random characters (`openssl rand -hex 24`), then restart the API.
2. Expose the API: `cloudflared tunnel --url http://localhost:3001` prints `https://<random>.trycloudflare.com`.
3. Open `notebooks/museum_ai_service.ipynb` in Colab (**File → Upload notebook**), and select a GPU runtime.
4. Add Colab secrets `AI_SERVICE_SECRET` (the same value) and `HF_TOKEN`.
5. Fill `BACKEND_API_URL` with `https://<random>.trycloudflare.com/api`, then **Runtime → Run all**.

The notebook opens its own Cloudflare quick tunnel and starts sending heartbeats. The exhibit page in the Admin panel then shows **AI service online**. The *Listening test* cell translates and narrates a sentence without touching the CMS.

## Run locally

Without a GPU, `MOCK_MODELS=1` replaces the models with fakes: a tone instead of speech, and `[en] …` instead of a translation. The rest of the pipeline is real.

```bash
cd ai-services
AI_SERVICE_SECRET=<same as backend/api/.env> \
BACKEND_API_URL=http://localhost:3001/api \
PUBLIC_URL=http://127.0.0.1:8000 \
MOCK_MODELS=1 \
uv run --python 3.12 --with-requirements requirements.txt python -m museum_ai.service
```

On a machine with an NVIDIA GPU, install `requirements-models.txt` and leave `MOCK_MODELS` unset.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKEND_API_URL` | required | API base including `/api` |
| `AI_SERVICE_SECRET` | required | Same as in `backend/api/.env` |
| `PUBLIC_URL` | quick tunnel | URL the API uses to reach this service |
| `PORT` | `8000` | Local HTTP port |
| `HEARTBEAT_SECONDS` | `20` | Heartbeat interval (the API marks the service offline after 90 s) |
| `TRANSLATION_MODEL` | `google/translategemma-4b-it` | Hugging Face id |
| `TRANSLATION_QUANTIZATION` | `auto` | `auto`, `4bit` or `none` |
| `TTS_MODEL` | `openbmb/VoxCPM2` | Primary narration model |
| `FALLBACK_TTS_MODEL` | `k2-fsa/OmniVoice` | Empty disables it |
| `FALLBACK_TTS_LANGUAGES` | `cs,uk` | Languages narrated (and offered) through the fallback model |
| `VOICE_DESCRIPTION` | warm museum guide | VoxCPM2 voice design prompt |
| `NARRATION_STYLE` | none | VoxCPM2 style for every sentence, e.g. `slightly slower, calm` |
| `OMNIVOICE_INSTRUCT` | `female, middle-aged, moderate pitch` | OmniVoice speaker attributes |
| `REFERENCE_VOICE_PATH`, `REFERENCE_VOICE_TEXT` | none | Your own 3–10 s recording and its transcript |
| `VOXCPM_OPTIMIZE` | `false` | `torch.compile` for VoxCPM2 |
| `MAX_CHUNK_CHARS` | `220` | Longest text passed to TTS at once |
| `MP3_BITRATE` | `64k` | Narration bitrate |
| `WORK_DIR` | `.museum-ai` | Voices, previews, `service.log` |
| `MOCK_MODELS` | `false` | Fake models for pipeline tests |

## Development

```bash
cd ai-services
uv run --python 3.12 --with-requirements requirements-dev.txt python -m pytest
python scripts/build_notebook.py   # after editing museum_ai/
```
