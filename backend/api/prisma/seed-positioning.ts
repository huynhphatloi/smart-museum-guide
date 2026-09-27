/* eslint-disable no-console */
/**
 * Indoor positioning demo: a 5 x 5 m room with the three demo zones in three
 * corners, a calibration grid, held-out test points, and synthetic "simulator"
 * fingerprints so the map works in simulation mode before anyone calibrates.
 *
 * Safe to run on its own at any time (`npm run db:seed-positioning`). It only
 * fills in what is missing - a zone outline or beacon position set in the CMS
 * is kept - and replaces synthetic captures. Captures recorded on phones are
 * never touched.
 */
import { Prisma, PrismaClient, SurveyPointKind } from '@prisma/client';
import { generateGrid } from '../src/positioning/survey-grid';

export const DEMO_ROOM_CODE = 'DEMO_ROOM';

const ROOM = { widthMeters: 5, heightMeters: 5 };

/**
 * Each demo zone is the area in front of one corner. Its beacon - whichever
 * beacon the zone actually has - is mounted in that corner.
 */
const CORNERS = [
  { zone: 'ZONE_A01', beaconAt: [0.3, 0.3], zoneAt: [0.9, 0.9] },
  { zone: 'ZONE_A02', beaconAt: [4.7, 0.3], zoneAt: [4.1, 0.9] },
  { zone: 'ZONE_B01', beaconAt: [0.3, 4.7], zoneAt: [0.9, 4.1] },
] as const;

interface PlacedBeacon {
  identifier: string;
  at: readonly [number, number];
}

const ZONE_RADIUS_METERS = 1;

/** Off-grid points, held out from the radio map, for measuring error. */
const TEST_POINTS: Array<[number, number]> = [
  [1, 1],
  [2, 2],
  [3, 1],
  [4, 2],
  [1, 3],
  [2, 4],
  [3, 3],
  [4, 4],
];

// Log-distance path loss, rssi = P0 - 10 n log10(d). Keep in step with
// visitor-mobile/src/features/indoor-positioning/model/simulated-rssi.ts so
// the simulator's virtual visitor lands where these fingerprints say.
const RSSI_AT_ONE_METRE = -67;
const PATH_LOSS_EXPONENT = 2;
const NOISE_DB = 2.5;
const SAMPLE_INTERVAL_MS = 200;
const CAPTURE_MS = 10_000;

/** Deterministic PRNG so every seed produces the same synthetic data. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function modelRssi(from: readonly [number, number], to: readonly [number, number]): number {
  const distance = Math.max(0.25, Math.hypot(from[0] - to[0], from[1] - to[1]));
  return RSSI_AT_ONE_METRE - 10 * PATH_LOSS_EXPONENT * Math.log10(distance);
}

function syntheticCapture(
  point: readonly [number, number],
  beacons: readonly PlacedBeacon[],
  random: () => number,
) {
  const samples: Array<{ b: string; r: number; t: number }> = [];
  const sums = new Map<string, { total: number; count: number }>();

  for (let t = 0; t < CAPTURE_MS; t += SAMPLE_INTERVAL_MS) {
    for (const beacon of beacons) {
      const r = Math.round(modelRssi(point, beacon.at) + gaussian(random) * NOISE_DB);
      samples.push({ b: beacon.identifier, r, t });
      const sum = sums.get(beacon.identifier) ?? { total: 0, count: 0 };
      sums.set(beacon.identifier, { total: sum.total + r, count: sum.count + 1 });
    }
  }

  const fingerprint = Object.fromEntries(
    [...sums].map(([beacon, sum]) => [beacon, Math.round((sum.total / sum.count) * 10) / 10]),
  );
  return { samples, fingerprint };
}

export async function seedDemoRoom(prisma: PrismaClient): Promise<void> {
  const plan = await prisma.floorPlan.upsert({
    where: { code: DEMO_ROOM_CODE },
    update: {},
    create: {
      code: DEMO_ROOM_CODE,
      name: 'Demo room',
      level: '1',
      widthMeters: ROOM.widthMeters,
      heightMeters: ROOM.heightMeters,
      positioningK: 3,
      fillDbm: -100,
    },
  });

  const placed: PlacedBeacon[] = [];

  for (const corner of CORNERS) {
    const zone = await prisma.zone.findUnique({
      where: { code: corner.zone },
      include: { beacons: { where: { enabled: true }, orderBy: { identifier: 'asc' } } },
    });
    if (!zone) {
      console.log(`  (skipped ${corner.zone}: zone not found)`);
      continue;
    }

    if (zone.floorPlanId === null || zone.mapShape === null) {
      await prisma.zone.update({
        where: { id: zone.id },
        data: {
          floorPlanId: zone.floorPlanId ?? plan.id,
          mapShape: zone.mapShape ?? {
            type: 'circle',
            x: corner.zoneAt[0],
            y: corner.zoneAt[1],
            r: ZONE_RADIUS_METERS,
          },
        },
      });
    }

    const beacon = zone.beacons[0];
    if (!beacon) {
      console.log(`  (${corner.zone} has no enabled beacon yet - register one in the CMS)`);
      continue;
    }
    if (beacon.mapX === null || beacon.mapY === null) {
      await prisma.beacon.update({
        where: { id: beacon.id },
        data: { mapX: corner.beaconAt[0], mapY: corner.beaconAt[1] },
      });
    }
    placed.push({
      identifier: beacon.identifier,
      at: [beacon.mapX ?? corner.beaconAt[0], beacon.mapY ?? corner.beaconAt[1]],
    });
  }

  // Survey points: created once, then left alone so real captures keep their
  // point. Staff can add or move points in the CMS afterwards.
  const existingPoints = await prisma.surveyPoint.count({ where: { floorPlanId: plan.id } });
  if (existingPoints === 0) {
    const grid = generateGrid({ ...ROOM, spacing: 1, margin: 0.5 });
    await prisma.surveyPoint.createMany({
      data: [
        ...grid.map((point) => ({
          floorPlanId: plan.id,
          label: point.label,
          x: point.x,
          y: point.y,
          kind: SurveyPointKind.REFERENCE,
        })),
        ...TEST_POINTS.map(([x, y], index) => ({
          floorPlanId: plan.id,
          label: `T${index + 1}`,
          x,
          y,
          kind: SurveyPointKind.TEST,
        })),
      ],
    });
  }

  // Synthetic captures are regenerated every time; phone captures are kept.
  await prisma.surveyCapture.deleteMany({
    where: { platform: 'simulator', point: { floorPlanId: plan.id } },
  });

  const points = await prisma.surveyPoint.findMany({
    where: { floorPlanId: plan.id },
    orderBy: { label: 'asc' },
  });
  const random = mulberry32(20260927);
  const startedAt = new Date(Date.UTC(2026, 0, 1));

  if (placed.length === 0) {
    console.log(`  floor plan ${DEMO_ROOM_CODE}: no beacons placed, synthetic captures skipped`);
    return;
  }

  await prisma.surveyCapture.createMany({
    data: points.map((point) => {
      const capture = syntheticCapture([point.x, point.y], placed, random);
      return {
        pointId: point.id,
        deviceModel: 'simulator',
        platform: 'simulator',
        orientationDeg: null,
        startedAt,
        durationMs: CAPTURE_MS,
        samples: capture.samples as unknown as Prisma.InputJsonValue,
        fingerprint: capture.fingerprint,
      };
    }),
  });

  const references = points.filter((point) => point.kind === SurveyPointKind.REFERENCE).length;
  console.log(
    `  floor plan ${DEMO_ROOM_CODE} ${ROOM.widthMeters} x ${ROOM.heightMeters} m: ` +
      `${references} reference + ${points.length - references} test points, ` +
      `${points.length} synthetic captures from ${placed.map((b) => b.identifier).join(', ')}`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDemoRoom(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
