# Smart Museum Guide

A multilingual museum guide that delivers exhibit content through automatic BLE beacon detection or a QR fallback.

Visitors interact with a zone rather than a fixed exhibit. The backend resolves the exhibit currently assigned to that zone, which allows museum staff to rotate exhibitions without reflashing beacons or reprinting QR codes.

```text
BLE beacon ─┐
            ├──> Zone ──> Active assignment ──> Localized exhibit and audio
QR code  ───┘
```

## Repository structure

This is one Git repository containing four independently managed projects. There is no root Node.js workspace or root `node_modules` directory.

| Project           | Technology                          | Responsibility                                            |
| ----------------- | ----------------------------------- | --------------------------------------------------------- |
| `backend/`        | NestJS, Next.js, Prisma, PostgreSQL | Public API and staff Admin panel                          |
| `ai-services/`    | Python, FastAPI, Google Colab       | Translation and narration (TTS) queue for exhibit content |
| `visitor-mobile/` | React Native, Expo                  | BLE-guided mobile experience and QR scanning              |
| `visitor-web/`    | React, Vite                         | No-install QR visitor experience                          |

```text
smart-museum-guide/
├── backend/
│   ├── api/                  NestJS API, Prisma schema and seed data
│   ├── admin/                Next.js staff Admin panel
│   ├── package.json          Backend workspace commands
│   └── package-lock.json     Backend dependency lockfile
├── ai-services/
│   ├── museum_ai/            Queue worker, translation and TTS models, webhooks
│   └── notebooks/            Google Colab notebook generated from museum_ai/
├── visitor-mobile/
│   ├── src/                  Feature-first Expo application
│   ├── package.json
│   └── package-lock.json
└── visitor-web/
    ├── src/                  Feature-first Vite application
    ├── package.json
    └── package-lock.json
```

The visitor applications organize source by product feature:

```text
src/
├── application/              Application composition and navigation
├── features/<feature>/
│   ├── api/                  Feature-specific data access when required
│   ├── model/                State and domain logic
│   └── ui/                   Screens and components
└── shared/                   Shared API, configuration, i18n, theme and UI
```

The API is organized by backend domains including `auth`, `beacons`, `zones`, `exhibits`, `localization`, `assignments`, `media` and `public-guide`.

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 14 or later
- Xcode for iOS development, or Android Studio for Android development
- A physical BLE-capable phone for real beacon testing

## Quick start

All commands below assume the current directory is the repository root.

### 1. Install dependencies

Each project must be installed independently:

```bash
cd backend
npm install

cd ../visitor-mobile
npm install

cd ../visitor-web
npm install

cd ..
```

The backend install also generates the Prisma Client.

### 2. Create local environment files

```bash
cp backend/api/.env.example backend/api/.env
cp backend/admin/.env.example backend/admin/.env.local
cp visitor-mobile/.env.example visitor-mobile/.env
cp visitor-web/.env.example visitor-web/.env
```

Environment ownership:

| File                       | Main configuration                                                  |
| -------------------------- | ------------------------------------------------------------------- |
| `backend/api/.env`         | Database, JWT, ports, CORS, uploads / Cloudflare R2, languages, seed credentials and `AI_SERVICE_SECRET` |
| `backend/admin/.env.local` | Public API URL used by the Admin panel                              |
| `visitor-mobile/.env`      | Public API URL and device-side BLE runtime defaults                 |
| `visitor-web/.env`         | Public API URL used by the QR web experience                        |

A physical phone cannot reach the computer through `localhost`. Set `EXPO_PUBLIC_API_URL` in `visitor-mobile/.env` to the computer's LAN address, for example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:3001/api
```

### 3. Prepare the database

Create a PostgreSQL database that matches `DATABASE_URL` in `backend/api/.env`, then run:

```bash
cd backend
npm run db:migrate
npm run db:seed
cd ..
```

The default local Admin account comes from the seed variables in `backend/api/.env`:

```text
Email:    admin@museum.local
Password: Admin@12345
```

These credentials are for local development only. Replace them before using the application in another environment.

### 4. Run the system

Start each service in a separate terminal:

**Backend API**

```bash
cd backend
npm run dev:api
```

**Admin panel**

```bash
cd backend
npm run dev:admin
```

**Visitor Web**

```bash
cd visitor-web
npm run dev
```

**Visitor Mobile**

```bash
cd visitor-mobile
npm run start
```

**AI service** (translation and narration, optional)

Saving an exhibit queues translation and narration for the selected languages. The work is done by `ai-services/`, normally a Google Colab notebook on a GPU. Until it is running, the exhibit page shows the languages as waiting. See [ai-services/README.md](ai-services/README.md) for setup.

| Service                 | Local address                      |
| ----------------------- | ---------------------------------- |
| API                     | `http://localhost:3001/api`        |
| API health check        | `http://localhost:3001/api/health` |
| Admin panel             | `http://localhost:4000`            |
| Visitor Web             | `http://localhost:4173`            |
| Expo development server | Displayed by Expo at startup       |

## Beacon configuration ownership

Beacon configuration belongs to museum staff and is managed in **Admin → Beacons**.

Admin controls:

- Beacon identity and protocol values
- Zone assignment
- Enabled or disabled state
- Per-beacon detection reach (`minRssi`)

The visitor mobile app consumes these values read-only. Visitor Settings does not expose RSSI, reach, dwell, hysteresis or calibration controls.

Mobile environment values such as `EXPO_PUBLIC_MIN_RSSI` are device-side defaults. A per-beacon reach configured in Admin takes precedence; the global mobile value is used only when a beacon has no custom value.

`EXPO_PUBLIC_BLE_SIMULATION=true` enables deterministic development signals without exposing a simulator screen to visitors.

## Mobile BLE development

Real BLE scanning uses `react-native-ble-plx`, which requires an Expo development build. Expo Go cannot load this native module.

```bash
cd visitor-mobile
npm run prebuild
npm run ios
```

For Android, replace the final command with:

```bash
npm run android
```

Use `npm run start:go` only for flows that do not require native BLE scanning.

## Indoor positioning map

The mobile app's **Map** tab positions the visitor in a room by BLE fingerprinting (weighted k-nearest neighbours), while the zone detector keeps triggering narration and "you are near …" notifications. Staff calibrate each phone with the in-app calibration mode (`EXPO_PUBLIC_STAFF_TOOLS=true`), draw rooms in the CMS under **Maps**, and measure accuracy with `npm run eval:positioning` in `visitor-mobile/`. `npm run db:seed-positioning` (in `backend/`) creates a 5 × 5 m demo room without touching other data. See [docs/indoor-positioning.md](docs/indoor-positioning.md).

## Project commands

### Backend

Run from `backend/`:

| Command                 | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `npm run dev:api`       | Start the API in watch mode             |
| `npm run dev:admin`     | Start the Admin panel                   |
| `npm run build`         | Build API and Admin                     |
| `npm run lint`          | Lint API and Admin                      |
| `npm run typecheck`     | Type-check API and Admin                |
| `npm test`              | Run API tests                           |
| `npm run db:generate`   | Generate the Prisma Client              |
| `npm run db:migrate`    | Apply development database migrations   |
| `npm run db:seed`       | Seed local museum and Admin data        |
| `npm run db:studio`     | Open Prisma Studio                      |
| `npm run db:reset`      | Recreate and reseed the local database  |
| `npm run scanner:build` | Build the macOS beacon discovery helper |
| `npm run format`        | Format Backend source files             |

### Visitor Mobile

Run from `visitor-mobile/`:

| Command             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run start`     | Start Expo for a development build       |
| `npm run start:go`  | Start Expo Go without native BLE support |
| `npm run ios`       | Build and run the iOS application        |
| `npm run android`   | Build and run the Android application    |
| `npm run lint`      | Lint source files                        |
| `npm run typecheck` | Type-check source files                  |
| `npm test`          | Run unit tests                           |
| `npm run format`    | Format Mobile source files               |

### Install the iOS app using an Ad Hoc certificate

The `adhoc` profile in `visitor-mobile/eas.json` creates a standalone Release build for registered iPhones. It uses the production API and real BLE. It requires an Apple Developer Program distribution certificate (with its private key) and an Ad Hoc provisioning profile for `com.museum.smartguide`. Every recipient's iPhone UDID must be included in that profile; this is not a universal installer for arbitrary iPhones.

With EAS-managed signing, run from `visitor-mobile/`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile adhoc
```

Register each tester's iPhone before building and select those devices when EAS creates the provisioning profile. Share the resulting EAS installation link with registered testers. When adding devices, create an updated profile and rebuild or re-sign the app. TestFlight is not involved.

For local signing with an existing certificate, import its `.p12` into Keychain and supply the matching `.mobileprovision` to the Xcode export. Keep certificate private keys and passwords out of Git and chat. The profile's app identifier, certificate, expiry, and device list must be verified before the signed `.ipa` is shared. An unsigned build still needs this signing step before it can be installed.

See [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) and [Apple Ad Hoc provisioning](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile).

### Share the iOS app through TestFlight

The `production` profile in `visitor-mobile/eas.json` builds a standalone Release app using the production API and real BLE. EAS manages and increments its build number remotely. The `preview` profile uses ad hoc distribution and requires each tester's device to be registered; use `production` for a public TestFlight link.

Prerequisites: an active paid [Apple Developer Program membership](https://developer.apple.com/programs/enroll/), an Expo account, and an App Store Connect app with bundle identifier `com.museum.smartguide`. A free Apple ID / Personal Team supports personal device testing and cannot publish this TestFlight build. The production profile has been prepared; a successful signed build and upload still need to be verified.

Run from `visitor-mobile/` after the membership is active:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Use the enrolled Apple Developer team when signing. After the upload finishes processing, open App Store Connect → Museum Guide → TestFlight, create an external testing group, add the build, complete the beta review information, and submit it for TestFlight App Review. After approval, enable the group's public link and share it. Testers install Apple's TestFlight app, open the link, and install Museum Guide without sending a device UDID or installing a signing profile.

[TestFlight](https://developer.apple.com/testflight/) supports up to 10,000 external testers and each build is available for 90 days. Upload replacement builds before expiry. For an ongoing public release, submit the app to the App Store separately.

### Visitor Web

Run from `visitor-web/`:

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Vite development server    |
| `npm run build`     | Create a production build            |
| `npm run preview`   | Preview the production build locally |
| `npm run lint`      | Lint source files                    |
| `npm run typecheck` | Type-check source files              |
| `npm run format`    | Format Web source files              |

## Verification before commit

Run the following checks after changing a project:

```bash
cd backend
npm run lint
npm run typecheck
npm test
npm run build
```

```bash
cd visitor-mobile
npm run lint
npm run typecheck
npm test
```

```bash
cd visitor-web
npm run lint
npm run typecheck
npm run build
```

```bash
cd ai-services
uv run --python 3.12 --with-requirements requirements-dev.txt python -m pytest
python scripts/build_notebook.py
```

## Production deploy (Coolify)

The public API must have a stable HTTPS URL so the Colab AI worker can post localization webhooks without changing `BACKEND_API_URL` every session. Docker images are provided for that stack; the AI service itself stays on Colab (GPU) and is not deployed to Coolify.

| Image | Path | Coolify base directory |
| ----- | ---- | ---------------------- |
| API | [`backend/api/Dockerfile`](backend/api/Dockerfile) | `backend` |
| Admin | [`backend/admin/Dockerfile`](backend/admin/Dockerfile) | `backend` |
| Visitor Web | [`visitor-web/Dockerfile`](visitor-web/Dockerfile) | `visitor-web` |

Local smoke test before Coolify:

```bash
docker compose up --build
curl http://localhost:3001/api/health
```

Create four Coolify resources (Postgres + three Applications), set domains such as `api.<domain>`, `admin.<domain>`, `guide.<domain>`, mount a persistent volume on the API at `/data/uploads`, and raise the proxy body limit to ~40 MB / timeout to ~120 s for webhook payloads. Full variable list: [`deploy/coolify.env.example`](deploy/coolify.env.example).

After the API is live, set Colab `BACKEND_API_URL=https://api.<domain>/api` once (see [ai-services/README.md](ai-services/README.md)).

### Media storage (Cloudflare R2)

By default, uploads and AI narration (TTS) are written to `UPLOAD_DIR` and served by the API at `/uploads`. To store them in Cloudflare R2 instead:

1. Create an R2 bucket and enable public access, either through the `r2.dev` subdomain or a custom domain such as `media.<domain>`.
2. Create an R2 API token with **Object Read & Write** on that bucket.
3. In `backend/api/.env` (or Coolify), set `MEDIA_STORAGE=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL`, then restart the API. The startup log shows which storage is active.

New files get absolute URLs such as `https://media.<domain>/audio/<uuid>.mp3`, and every client loads them straight from R2. Files uploaded earlier keep their `/uploads/...` URLs and are still served from disk, so keep the volume until you no longer need them.

## Privacy model

Raw BLE readings and visitor movement histories remain on the visitor's device. The mobile app contacts the API only after it confirms a zone and needs to resolve the active exhibit content.
