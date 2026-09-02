# Demo guide

A 10–12 minute walkthrough that demonstrates every claim the project makes.
Read [`../README.md`](../README.md) first for installation.

## 0. Before you start

Four terminals:

```bash
npm run dev:api      # http://localhost:3001/api
npm run dev:admin    # http://localhost:4000
npm run dev:web      # http://localhost:4173
npm run dev:mobile   # Expo
```

Reset to a known state:

```bash
npm run db:reset     # migrate + seed
curl http://localhost:3001/api/health
```

Sign in at <http://localhost:4000/login> with `admin@museum.local` / `Admin@12345`.

---

## Scenario 1 — Admin: create content and put it in a room

**Goal: show that everything a visitor sees is managed, not hard-coded.**

1. **Dashboard.** The "Live zone status" table shows what each zone resolves to
   *right now* and since when — the same resolver the BLE and QR endpoints use.
2. **Zones ▸ New zone** — code `ZONE_C01`, name `Ceramics`, floor `2`. The QR
   payload is generated immediately.
3. **Beacons ▸ New beacon** — identifier `BEACON_C01`, name
   `Minew i3 — Hall C01`, zone `ZONE_C01`, protocol **Eddystone UID**, namespace
   `a1b2c3d4e5f607182930`, instance `000000000004`, Tx power `-8`, interval
   `500`. Point out the note under the form: the MAC address is deliberately not
   an identity, because Android and iOS report different things there.
4. **Exhibits ▸ New exhibit** — code `EX_CELADON`, title `Men ngọc Chu Đậu`.
5. On the exhibit page, **Translations**: save a `vi` entry, then *Add language*
   and save an `en` entry. Say it out loud: *adding Korean here is a row, not a
   migration.*
6. **Media ▸ Upload file** for an image or narration audio, or paste a
   `/uploads/...` URL into the translation's audio field.
7. Press **Publish**. The badge turns green.
8. **Zones ▸ ZONE_C01 ▸ Change the exhibit in this room** — pick `EX_CELADON`,
   press **Set as current**. That is the whole workflow; there are no dates to
   fill in anywhere.

---

## Scenario 2 — QR visitor: no app, no account

1. Open <http://localhost:4173/q/ZONE_A01> (or scan the QR from the zone page
   with a phone on the same network — put your LAN IP in `VISITOR_WEB_URL`).
2. The page loads whatever is currently in `ZONE_A01`. No login, no install.
3. Switch the language selector to **Tiếng Việt** — title, descriptions and the
   narration track all change.
4. Press play on the audio player.
5. Choose **한국어**. There is no Korean translation, so the page falls back and
   *says so*: "이 전시물은 아직 해당 언어를 지원하지 않습니다."
6. Visit <http://localhost:4173/q/NOPE> — a clean "Zone not found" state.

---

## Scenario 3 — Simulated BLE: the detection algorithm, visible

Ensure `EXPO_PUBLIC_BLE_SIMULATION=true` in `apps/mobile/.env`, then open the app.

1. **Welcome** — pick English. Press **Start tour**.
2. **Permission** — read the explanation aloud: signal strength is processed on
   the phone; nothing about the visitor's position leaves the device.
3. **Explore** — the status card shows `SCANNING`, the candidate, and a dwell
   progress bar.
4. Go to **Settings ▸ BLE simulator**. Each simulated beacon shows the identity
   it broadcasts — `Eddystone UID · a1b2c3d4e5f607182930:000000000001` — because
   the simulator is built from the museum's real registry.

### 3a — Entering a zone

Press **Stand in the first zone** and narrate the screen:

| Watch this | What it means |
| --- | --- |
| `smoothed −58 · n=8 · outliers 0` | the sliding window is filling |
| candidate becomes `BEACON_A01` | it is only a *candidate* |
| the dwell bar fills over ~3 s | it must stay dominant to be trusted |
| state → `CONTENT_ACTIVE` | zone confirmed, exhibit fetched |

Back on **Explore**: "You are in Ancient Sculpture — would you like to hear the
narration?" Press **Listen**.

### 3b — Walking to the next zone

Press **Walk to the second zone**. `BEACON_A02` rises to −55, `BEACON_A01` drops
to −88. The app does **not** switch instantly: the candidate changes, the dwell
bar restarts, and only after the threshold does the zone — and the exhibit —
change.

### 3c — A single RSSI spike

Press **Inject a single RSSI spike** while zone A02 is confirmed. `BEACON_A01`
briefly reads −32 dBm — stronger than the confirmed beacon. **Nothing happens.**
The outlier filter drops it, the smoothed value barely moves, and hysteresis was
never beaten. This is the most convincing moment of the demo: a naive
"strongest reading wins" implementation would have jumped rooms.

### 3d — The cooldown

Press **Stand in the first zone** again. The exhibit switches back, but no prompt
appears — that zone was announced less than a minute ago. State updates; the
visitor is not nagged.

---

## Scenario 4 — Change what is in a room: the architectural point

**Goal: rotating an exhibition touches no hardware and no printed material.**

1. **Zones ▸ ZONE_A01** — note the current exhibit and the QR image.
2. In **Change the exhibit in this room**, pick a different exhibit and press
   **Set as current**.
3. **Reload the visitor web page** at `/q/ZONE_A01` — different exhibit, same URL.
4. In the mobile app the exhibit card refreshes on the next zone confirmation.
5. Scroll down on the zone page: **Previously in this room** now lists the
   exhibit you just replaced, with the dates it was up.

Nothing was reprinted. No beacon was touched. Both entry points changed together
because both go through `ExhibitResolverService`.

Prove the same thing from the command line:

```bash
curl -s "http://localhost:3001/api/public/beacons/BEACON_A01/active-exhibit?lang=en" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['exhibit']['title'])"

# what this beacon resolved to earlier in the year
curl -s "http://localhost:3001/api/public/beacons/BEACON_A01/active-exhibit?lang=en&at=2026-02-01T00:00:00Z" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['exhibit']['title'])"
```

---

## Scenario 5 — The invariant still holds

There is no scheduling UI to abuse any more, so demonstrate the guarantee
underneath instead:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@museum.local","password":"Admin@12345"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")

ZID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/zones \
  | python3 -c "import json,sys; print([z['id'] for z in json.load(sys.stdin)['items'] if z['code']=='ZONE_A01'][0])")

# the zone detail always returns exactly one current assignment
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/zones/$ZID \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['currentAssignment']['exhibit']['code'], '| history:', len(d['history']))"
```

Setting the same exhibit twice performs **no write at all** (`changed: false`),
and setting a different one closes the old row rather than deleting it — which is
where the history on the zone page comes from.

Then show the unit tests that pin this down:

```bash
npm --workspace apps/api run test -- current-exhibit
```

---

## Scenario 6 — Real BLE (requires hardware)

Only with physical beacons and a development build (README §7.2,
[`hardware.md`](hardware.md)).

1. Configure each Minew i3 in BeaconSET+: Eddystone namespace + instance,
   Tx power `-8 dBm`, interval `500 ms`. Fill the iBeacon UUID/major/minor too.
2. Register the same values in the CMS.
3. Set `EXPO_PUBLIC_BLE_SIMULATION=false`, restart with
   `npx expo start -c --dev-client`.
4. Launch the **development client** (not Expo Go) and grant Bluetooth / nearby
   devices.
5. Walk the building. **Settings ▸ BLE status** shows the live state and which
   identity scheme is in use.
6. Tune dwell time and hysteresis on the Settings screen while walking.

Failure modes worth demonstrating deliberately: turn Bluetooth off (the app
explains and offers QR), deny the permission (same), disable a beacon in the CMS
(the API answers `BEACON_DISABLED`).

Also worth saying out loud: **background zone entry is not implemented.** iOS
throttles background BLE scanning enough to break the dwell logic, and the honest
route is a Core Location native module. The seam exists
(`ios-region-monitor.ts`), reports itself unavailable, and the Settings screen
says so.

---

## Scenario 7 — Error handling

| Do this | Expected |
| --- | --- |
| Open `/q/NOPE` | "Zone not found", no crash |
| **Empty zone** on a zone page, reload its QR page | "Nothing on display here right now" |
| Set an exhibit back to `DRAFT` and reload | same empty state — drafts never reach visitors |
| Stop the API, reload the visitor web | "Cannot reach the museum server" + retry |
| Stop the API, open the mobile app | same message; QR entry still explains itself |
| Request `?lang=ko` where no Korean exists | content in the fallback language, with a notice |
| Create a beacon with protocol Eddystone but no instance | `400 BEACON_IDENTITY_INVALID` |

---

## Running the automated tests during the demo

```bash
npm run test        # backend + mobile BLE algorithm
npm run typecheck
npm run lint
```

Expect **59 backend tests** (exhibit resolution, the current-exhibit planner,
the one-exhibit-per-zone invariant, beacon identity rules, language fallback,
interval maths) and **58 mobile tests** (Eddystone and iBeacon frame parsing,
advertisement → beaconId, registry matching, signal processing, and the full
detection state machine on a virtual clock).
