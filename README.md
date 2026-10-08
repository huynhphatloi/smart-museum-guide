# Smart Museum Guide

[![CI](https://github.com/huynhphatloi/smart-museum-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/huynhphatloi/smart-museum-guide/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An open-source, multilingual audio guide for museums. Visitors get the story of the object in front of them, in their own language, either automatically through Bluetooth Low Energy (BLE) beacons or by scanning a QR code. Staff manage exhibits, translations, beacons and schedules from a web console.

The guide is built around **zones** rather than fixed exhibits. A beacon or QR code identifies a place in the gallery, and the backend resolves which exhibit is currently assigned to it. Exhibitions can rotate without reflashing beacons or reprinting labels.

```text
BLE beacon ─┐
            ├──> Zone ──> Active assignment ──> Localized exhibit and audio
QR code  ───┘
```

## Features

- **Two ways in.** A native app detects the nearest beacon (iBeacon or Eddystone-UID) and opens the exhibit automatically. A no-install web page serves the same content from a QR code.
- **Stable zone detection.** RSSI smoothing, per-beacon reach (`minRssi`), dwell time, hysteresis and a notification cooldown keep the guide from jumping between neighbouring exhibits.
- **Multilingual content.** Staff write one source text. An optional AI service translates it and records narration for every offered language, with per-language status and retry in the console.
- **Scheduling.** Choose which exhibit a zone shows and for how long. Overlapping schedules in the same zone are rejected.
- **Staff console.** Exhibits and media, zones and their QR codes, beacons, and a dashboard of what each zone is showing now. When the API runs on a Mac, the console can also scan for nearby beacons (`npm run scanner:build`).
- **Privacy by design.** Raw BLE readings and movement history stay on the visitor's phone. The app contacts the API only to fetch content for a confirmed zone.

The indoor map (positioning the visitor on a floor plan with BLE fingerprinting) is **coming soon**. It is built but turned off by default while field accuracy is improved; see [Roadmap](#roadmap).

## Repository layout

One Git repository holds four independently installed projects. There is no root `package.json`.

| Project | Stack | Purpose |
| --- | --- | --- |
| [`backend/`](backend) | NestJS, Prisma, PostgreSQL, Next.js | Public and staff API (`api/`) and the staff console (`admin/`) |
| [`visitor-mobile/`](visitor-mobile) | React Native, Expo | BLE-guided visitor app with QR scanning |
| [`visitor-web/`](visitor-web) | React, Vite, Tailwind CSS | QR landing pages, no installation needed |
| [`ai-services/`](ai-services) | Python, FastAPI, PyTorch | Optional translation and text-to-speech worker, usually run on Google Colab |

The visitor apps use a feature-first layout:

```text
src/
├── application/        app composition and navigation
├── features/<feature>/
│   ├── api/            feature-specific data access
│   ├── model/          state and domain logic (unit tested)
│   └── ui/             screens and components
└── shared/             API client, config, i18n, theme, UI primitives
```

The API is split by domain: `auth`, `beacons`, `zones`, `exhibits`, `assignments`, `localization`, `languages`, `media`, `positioning`, `public-guide`.

## Getting started

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+
- For the mobile app: Xcode or Android Studio, and a physical phone for real BLE testing
- Optional: Python 3.12 and [uv](https://docs.astral.sh/uv/) for the AI service

### 1. Install

```bash
(cd backend && npm install)        # also generates the Prisma client
(cd visitor-mobile && npm install)
(cd visitor-web && npm install)
```

### 2. Configure

```bash
cp backend/api/.env.example backend/api/.env
cp backend/admin/.env.example backend/admin/.env.local
cp visitor-mobile/.env.example visitor-mobile/.env
cp visitor-web/.env.example visitor-web/.env
```

| File | Main settings |
| --- | --- |
| `backend/api/.env` | Database, JWT secret, public URLs, CORS, media storage, languages, seed account, AI service secret |
| `backend/admin/.env.local` | API URL for the console |
| `visitor-mobile/.env` | API URL, BLE simulation, zone detection defaults |
| `visitor-web/.env` | API URL for the QR pages |

A phone cannot reach your computer through `localhost`. Set `EXPO_PUBLIC_API_URL` to your machine's LAN address, for example `http://192.168.1.20:3001/api`.

### 3. Create and seed the database

Create a database that matches `DATABASE_URL` in `backend/api/.env`, then:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

The seed creates demo zones, beacons and 20 exhibits with openly licensed images (see [Demo content](#demo-content)), plus a staff account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. These defaults are for local development only. The seed replaces demo records and refuses to run with `NODE_ENV=production`.

### 4. Run

Each service runs in its own terminal:

| Service | Command | Address |
| --- | --- | --- |
| API | `cd backend && npm run dev:api` | http://localhost:3001/api (health: `/api/health`) |
| Staff console | `cd backend && npm run dev:admin` | http://localhost:4000 |
| Visitor web | `cd visitor-web && npm run dev` | http://localhost:4173 |
| Visitor mobile | `cd visitor-mobile && npm run start` | shown by Expo |
| AI service (optional) | see [ai-services/README.md](ai-services/README.md) | — |

Without the AI service, saving an exhibit queues its translations and narration; the console shows them as waiting until a worker connects.

## Mobile app and BLE

Real scanning uses `react-native-ble-plx`, a native module that Expo Go cannot load. Use a development build:

```bash
cd visitor-mobile
npm run prebuild
npm run ios        # or: npm run android
```

`EXPO_PUBLIC_BLE_SIMULATION=true` (the default in `.env.example`) feeds the pipeline with simulated beacons, so most flows can be developed without hardware. `npm run start:go` starts Expo Go for screens that do not need BLE.

Beacon settings belong to museum staff and are edited in the console under **Beacons**: identity and protocol, zone, enabled state, and detection reach (`minRssi`). The app reads them and never exposes radio settings to visitors. Values such as `EXPO_PUBLIC_MIN_RSSI` are device-side defaults used only when a beacon has no reach configured.

## Testing

Run the checks for every project you change. CI runs the same commands.

```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run build
cd visitor-mobile && npm run lint && npm run typecheck && npm test
cd visitor-web && npm run lint && npm run typecheck && npm run build
cd ai-services && uv run --python 3.12 --with-requirements requirements-dev.txt python -m pytest
```

## Deployment

The API, staff console and visitor web ship as Docker images. The AI service needs a GPU and usually runs on Google Colab; the mobile app is built with EAS.

| Image | Dockerfile | Build context | Build-time variables |
| --- | --- | --- | --- |
| API | `backend/api/Dockerfile` | `backend/` | — (runs `prisma migrate deploy` on start) |
| Staff console | `backend/admin/Dockerfile` | `backend/` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_INDOOR_MAP` |
| Visitor web | `visitor-web/Dockerfile` | `visitor-web/` | `VITE_API_URL`, `VITE_INDOOR_MAP` |

To smoke-test the images locally (the API runs in development mode here, because production mode only accepts real HTTPS domains):

```bash
docker compose up --build
curl http://localhost:3001/api/health
```

For a real deployment (tested on [Coolify](https://coolify.io)):

- Run PostgreSQL and the three images as separate services on their own domains, for example `api.<domain>`, `admin.<domain>` and `guide.<domain>`. Mount a persistent volume on the API at `/data/uploads`.
- Set the API variables listed in [`deploy/coolify.env.example`](deploy/coolify.env.example). In production the API refuses to start unless `PUBLIC_BASE_URL`, `VISITOR_WEB_URL` and every `CORS_ORIGINS` entry use real HTTPS domains, and the demo seed is disabled.
- AI result webhooks carry base64 audio: allow request bodies of about 40 MB and a read timeout of about 120 s on the proxy.
- Point the AI service at the API with `BACKEND_API_URL=https://api.<domain>/api` and the same `AI_SERVICE_SECRET`.

**Media in Cloudflare R2.** Uploads and narration are stored in `UPLOAD_DIR` and served at `/uploads` by default. Set `MEDIA_STORAGE=r2` with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL` (a bucket with public access and a token with Object Read & Write) to store new files in R2. Files uploaded before the switch are still served from disk.

**iOS builds.** `visitor-mobile/eas.json` has an Ad Hoc profile (`adhoc`, for registered test devices) and a `production` profile for TestFlight. Change `EXPO_PUBLIC_API_URL` in `eas.json` and the bundle identifier in `app.json` to your own first. Both need a paid Apple Developer membership.

```bash
cd visitor-mobile
npx eas-cli@latest build --platform ios --profile adhoc        # register devices first: eas device:create
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest              # upload to TestFlight
```

## Roadmap

- **Indoor map (coming soon).** Built but disabled until field accuracy improves; see [below](#indoor-map-experimental).
- **Offline content.** Cache recently opened exhibits and narration for galleries with poor connectivity.
- **Background detection.** BLE scanning currently runs only while the app is in the foreground.
- **Staff preview.** Preview exactly what a zone shows for a given language and time.

Suggestions and pull requests are welcome.

### Indoor map (experimental)

The map places the visitor on a floor plan using BLE fingerprinting. Staff record the RSSI of every beacon at known reference points with each phone model. The app then compares the live signal vector with these fingerprints, averages the k nearest points weighted by `1 / distance` (WKNN) and smooths the result. Everything runs on the phone; the zone detector keeps driving narration and notifications independently.

With three beacons in a 5 × 5 m room, errors are around a metre and depend on the phone, so the feature is off by default and each app shows a "coming soon" notice. To work on it:

1. Enable it with `EXPO_PUBLIC_INDOOR_MAP=true`, `NEXT_PUBLIC_INDOOR_MAP=true` and `VITE_INDOOR_MAP=true`.
2. `npm run db:seed-positioning` in `backend/` creates a demo room with a 1 m grid of reference points, without touching other data. Rooms can also be drawn or imported from a DXF file in the console under **Maps**.
3. Build the mobile app with `EXPO_PUBLIC_STAFF_TOOLS=true` and record fingerprints from **Settings → Positioning calibration**.
4. Measure accuracy offline with `npm run eval:positioning` in `visitor-mobile/`. It replays a dataset exported from the console through the same code the phone runs and reports error statistics, the choice of k and baseline comparisons.

The algorithm lives in `visitor-mobile/src/features/indoor-positioning/model/` and the API in `backend/api/src/positioning/`.

## Demo content

The seeded exhibits are sample content, not objects owned by any museum deploying this project. Replace them with your own catalogue before going live. Images are in `backend/api/prisma/seed-assets/images/`:

| Image | Source | License |
| --- | --- | --- |
| `isana-my-son.jpg` | [Isana, Mỹ Sơn B](https://commons.wikimedia.org/wiki/File:Isana,_My_Son_B,_10th_century_Quang_Nam_-_Museum_of_Cham_Sculpture_-_Danang,_Vietnam_-_DSC01695.JPG), photo by Daderot, Wikimedia Commons | CC0 1.0 |
| `dong-son-drum.jpg` | [Đông Sơn bronze drum](https://commons.wikimedia.org/wiki/File:Dong_Son_Bronze_Drum_17.jpg), photo by Gary Todd, Wikimedia Commons | CC0 1.0 |
| `five-tigers-hang-trong.jpg` | [Five Tigers, Hàng Trống painting](https://commons.wikimedia.org/wiki/File:Five_tigers,_Hang_Trong_painting,_Hanoi,_paper,_view_1_-_Vietnam_National_Museum_of_Fine_Arts_-_Hanoi,_Vietnam_-_DSC05281.JPG), photo by Daderot, Wikimedia Commons | CC0 1.0 |
| `vietnamese-elephant-dish.jpg` | [The Met, object 40001](https://www.metmuseum.org/art/collection/search/40001) | Public domain (Met Open Access) |
| `met-<id>.jpg` | [The Met](https://metmuseum.github.io/) objects 37428, 37449, 37450, 37451, 37558, 37559, 37664, 37759, 37760, 37766, 38157, 38293, 38617, 39209, 39215 and 51170 (`https://www.metmuseum.org/art/collection/search/<id>`) | Public domain (Met Open Access) |

The seeded descriptions are original Vietnamese texts based on the linked records. Translations and narration are not bundled; the AI service generates them.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding conventions and how to submit changes.

## License

The source code is released under the [MIT License](LICENSE).

Bundled third-party material keeps its own license:

- Fonts: Be Vietnam Pro and Newsreader, [SIL Open Font License 1.1](visitor-web/public/fonts/OFL-BeVietnamPro.txt).
- Demo exhibit images: CC0 or public domain, listed under [Demo content](#demo-content).
- AI models used by `ai-services/` are downloaded at runtime under their own terms, summarized in [ai-services/README.md](ai-services/README.md#models). Check them before commercial use.
