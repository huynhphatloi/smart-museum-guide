# Indoor positioning (BLE fingerprinting + WKNN)

The visitor app shows where the visitor is on a room plan. Two algorithms run
side by side on the same BLE signals:

```text
BLE source (real | simulated)
  │ raw readings
  ▼
BeaconScanner ─► SignalProcessor (zone cfg) ─► BeaconZoneDetector ─► zone confirmed
  │                                                     ├─► exhibit content
  │ onSignal                                            └─► local notification
  ├─► PositionEngine: SignalProcessor (positioning cfg) → vector → WKNN → EMA → (x, y) on the map
  └─► CalibrationRecorder (staff): raw readings at a survey point → fingerprint → CMS
```

- **Zone detector** (unchanged) decides *what to play*: strongest beacon, per-beacon
  `minRssi`, dwell time, hysteresis, cooldown. Near a beacon the RSSI slope is steep, so
  "approaching this exhibit" is detected reliably even when (x, y) is ~1 m off.
- **Fingerprint positioning** decides *where to draw the marker*. Everything runs on the
  phone; the server only stores calibration data.

## Algorithm

1. **Calibration (offline).** Staff stand on reference points and record raw RSSI for
   5–10 s per point (optionally 4 orientations). Each recording is replayed through the
   *same* `SignalProcessor` the live engine uses (`replay.ts`), giving one fingerprint per
   capture. A beacon missing at a tick counts as `fillDbm` (-100) for that tick.
2. **Radio map.** One vector per reference point: the mean of its captures, in a fixed
   beacon order, missing beacons filled with `fillDbm` (`radio-map.ts`). Each phone uses
   captures recorded on its own model, then its platform, then any real phone
   (RSSI offsets differ between phones).
3. **Online.** Every 500 ms: live vector → Euclidean distance to every fingerprint →
   k nearest → weights `w = 1 / (d + ε)` → `(x, y) = Σ w·(xᵢ, yᵢ) / Σ w` (`wknn.ts`) →
   exponential moving average for a steady marker (`smoother.ts`). Fewer than 2 beacons
   heard → no estimate ("weak signal"). No radio map → marker at the confirmed zone's
   centre (zone-level fallback).

Worked example (unit-tested in `wknn.spec.ts`): live `R = [-60, -68, -79, -87]`,
`d(P1) = 11.87`, `d(P2) = 3.16`, `d(P3) = 8.89`, `d(P6) = 8.00`; k = 3 picks P2, P6, P3
and gives **(2.20, 1.23)**.

## Where the code lives

| Piece | Path |
|---|---|
| Algorithm (pure TS, tested) | `visitor-mobile/src/features/indoor-positioning/model/` |
| Map, calibration UI | `visitor-mobile/src/features/indoor-positioning/ui/` |
| Zone notifications | `visitor-mobile/src/features/indoor-positioning/model/ZoneNotificationBridge.tsx` |
| API (floor plans, survey points, captures, dataset) | `backend/api/src/positioning/` |
| CMS map editor | `backend/admin/src/app/(app)/floor-plans/` |
| QR page mini map | `visitor-web/src/features/guide/ui/ZoneMap.tsx` |
| Demo room seed | `backend/api/prisma/seed-positioning.ts` |
| Evaluation script | `visitor-mobile/scripts/evaluate-positioning.ts` |

Coordinates are metres from the plan's top-left corner (x right, y down). The API
rejects survey points outside the room and refuses to shrink a room that would leave
points, beacons or zone outlines outside its walls.

A Vietnamese draft of the thesis chapter (method, worked example, experiment design,
results table to fill in) is in [bao-cao-dinh-vi-trong-nha.md](bao-cao-dinh-vi-trong-nha.md).

## Setting up the demo room (25 m², 3 beacons)

1. `npm run db:seed-positioning` (in `backend/`) creates `DEMO_ROOM` (5 × 5 m), puts the
   three demo zones in three corners, places each zone's beacon in its corner, adds a
   1 m grid of 25 reference points and 8 off-grid test points. It only fills in what is
   missing, so edits made in the CMS survive a re-run. It also regenerates synthetic
   `simulator` fingerprints so simulation mode shows a working map.
2. Measure the real room. In the CMS → **Maps**, fix width/height, drag beacons
   (Beacons tab) and zone outlines (Zones tab) to where they really are.
3. Mount the beacons at the same height (~1–1.2 m), away from metal. In BeaconSET+ keep
   Tx at -8 dBm and lower the advertising interval to 100–200 ms (more samples per
   window; battery does not matter for a demo).
4. Build the app with `EXPO_PUBLIC_STAFF_TOOLS=true` and `EXPO_PUBLIC_BLE_SIMULATION=false`.
   A development build is required (`react-native-ble-plx`, `react-native-svg`,
   `expo-notifications` are native modules).
5. **Calibrate each phone** (Settings → Positioning calibration, sign in with a CMS account):
   - full: 25 points × 4 orientations × 10 s ≈ 20–25 min per phone;
   - quick on-site: 9 points × 1 orientation × 5 s ≈ 2–3 min per phone.
   The radio map updates as soon as a capture is saved.
6. Apply the suggested `minRssi` per beacon (calibration screen; fitted from the room's
   own path loss) so each zone triggers within ~1.5 m of its beacon. The running zone
   detector picks the new value up immediately. Without it every beacon keeps the
   global -95 dBm reach, and in a small room the first zone "sticks" until another
   beacon is 4 dB louder.
7. Record the test points **at a different time** than the reference points.

A radio map belongs to one room and one phone model: moving to another room means
recalibrating, which is what the quick mode is for.

Android: scanning runs in `ScanMode.LowLatency`. The library default (LowPower) listens
~0.5 s out of every 5 s — far too few samples.

Notifications are local (no push server) and fire only while the app is open, because
BLE scanning does not run in the background.

## Evaluation

Export the dataset from the CMS (floor plan → *Export dataset*) or fetch it directly:

```bash
cd visitor-mobile
npm run eval:positioning -- --file ../research/datasets/DEMO_ROOM-2026-10-01.json
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run eval:positioning -- --api http://localhost:3001/api --floor DEMO_ROOM
```

The report (`research/results/<timestamp>/report.md`, CSV files and a ready-to-use
`cdf-<phone>.svg` figure) contains, per phone:

- measured path loss per beacon (P0, n);
- **E1** k and weighting chosen by leave-one-out on reference points only;
- **E2** error on held-out test points: WKNN vs KNN vs nearest reference point vs
  nearest-beacon and weighted-centroid baselines (mean, median, P90, max, CDF CSV);
- **E3** preprocessing: raw mean vs processor windows/smoothing;
- **E4** one capture per point vs all orientations;
- **E5** radio map from one phone tested on another, with/without mean-centring;
- **E6** effect of removing each beacon;
- **E7** zone triggering: replayed zone detector vs geofence on the WKNN position.

Synthetic `simulator` captures are excluded unless `--include-synthetic` is passed; they
only prove the pipeline runs, never accuracy (the same model generated the radio map).

## Known limits

- Three beacons give a 3-dimensional fingerprint; expect errors around a metre, worst in
  the corner without a beacon. More beacons is only more data.
- Foreground only.
- Crowds absorb 2.4 GHz and shift RSSI away from the radio map.
- Radio maps are per room and per phone model.
