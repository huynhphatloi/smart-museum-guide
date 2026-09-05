# Smart Museum Guide

A multilingual museum guide with BLE zone detection and QR fallback.

Beacons and QR codes identify a **zone**, never an exhibit. The backend resolves
the exhibit currently assigned to that zone, so exhibition changes do not
require reflashing hardware or reprinting QR codes.

```text
BLE beacon ─┐
            ├─> zone ─> current assignment ─> translated exhibit + audio
QR code  ───┘
```

## Products

The repository has three product boundaries:

| Directory | Stack | Responsibility |
| --- | --- | --- |
| `backend/` | NestJS + Next.js + Prisma | API and staff Admin panel |
| `visitor-mobile/` | React Native + Expo | Automatic BLE guide and QR scanner |
| `visitor-web/` | React + Vite | No-install QR experience |

```text
smart-museum-guide/
├── backend/
│   ├── package.json        Backend workspace commands
│   ├── api/                NestJS API, Prisma schema and seed data
│   ├── admin/              Next.js staff console
│   └── package-lock.json   Backend dependency lockfile
├── visitor-mobile/         Expo visitor app
└── visitor-web/            Browser-based visitor guide
```

Each product owns its package configuration, lockfile, dependencies and
development commands. The repository root does not manage Node dependencies.

The client applications use feature-first source boundaries:

```text
src/
├── application/            app composition and navigation
├── features/<feature>/
│   ├── api/                feature-specific transport when needed
│   ├── model/              state and domain logic
│   └── ui/                 screens and components
└── shared/                 cross-feature API, theme, i18n and UI primitives
```

The backend is already grouped by domain modules such as `beacons`, `zones`,
`exhibits`, `assignments` and `public-guide`.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- Xcode or Android Studio for a native mobile development build

## Install

Install each product independently:

```bash
cd backend
npm install

cd ../visitor-mobile
npm install

cd ../visitor-web
npm install
```

Create local environment files:

```bash
cp backend/api/.env.example backend/api/.env
cp backend/admin/.env.example backend/admin/.env.local
cp visitor-web/.env.example visitor-web/.env
cp visitor-mobile/.env.example visitor-mobile/.env
```

A physical phone cannot reach `localhost`; set `EXPO_PUBLIC_API_URL` in
`visitor-mobile/.env` to the computer's LAN address.

## Database

```bash
cd backend
npm run db:migrate
npm run db:seed
```

Default local Admin login:

```text
http://localhost:4000/login
admin@museum.local / Admin@12345
```

Change the seed credentials before using the project outside local development.

## Run

Use four terminals. API and Admin commands run from `backend/`:

```bash
cd backend && npm run dev:api             # http://localhost:3001/api
cd backend && npm run dev:admin           # http://localhost:4000
cd visitor-web && npm run dev              # http://localhost:4173
cd visitor-mobile && npm run start         # Expo development server
```

## Beacon ownership

Museum staff manage beacon identity, zone assignment, radio values and
**Detection reach** in **Admin > Beacon setup**. The visitor app receives those
values read-only and never exposes RSSI, dwell, hysteresis or calibration
controls in visitor Settings.

`EXPO_PUBLIC_BLE_SIMULATION=true` supplies deterministic development signals
without adding a simulator screen to the visitor experience. Real BLE requires
an Expo development build because `react-native-ble-plx` is a native module.

```bash
cd visitor-mobile
npx expo prebuild
npx expo run:ios       # or npx expo run:android
```

## Verification

Run checks inside each product:

```bash
cd backend
npm run lint
npm run typecheck
npm test
npm run build

cd ../visitor-web
npm run lint
npm run typecheck
npm run build

cd ../visitor-mobile
npm run lint
npm run typecheck
npm test
```

Additional commands:

| Command | Purpose |
| --- | --- |
| `backend: npm run scanner:build` | Build the macOS helper used by Admin beacon discovery |
| `backend: npm run db:generate` | Generate the Prisma client |
| `backend: npm run db:studio` | Open Prisma Studio |
| `backend: npm run db:reset` | Recreate and reseed the local database |
| Any product: `npm run format` | Format that product's source files |

Raw BLE readings and visitor movement histories are never uploaded. The phone
contacts the API only after it confirms a zone.
