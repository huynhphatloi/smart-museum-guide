/* eslint-disable no-console */
/**
 * Offline evaluation of BLE fingerprint positioning.
 *
 * Runs the very same TypeScript the phone runs (signal processor, replay,
 * WKNN) over a calibration dataset and writes an accuracy report: error
 * statistics, CDF, the choice of k, and ablations.
 *
 *   npx tsx scripts/evaluate-positioning.ts --file ../research/datasets/DEMO_ROOM-2026-10-01.json
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/evaluate-positioning.ts \
 *       --api http://localhost:3001/api --floor DEMO_ROOM
 *
 * Options:
 *   --file <path>          dataset exported from the CMS ("Export dataset")
 *   --api <url> --floor <code>
 *                          fetch the dataset instead; a snapshot is saved to
 *                          research/datasets/ so the run can be reproduced
 *   --out <dir>            default research/results/<timestamp>
 *   --include-synthetic    also evaluate the seed's simulator captures
 *                          (pipeline check only - never evidence of accuracy)
 *
 * Nothing here is tuned on the test points: k is chosen by leave-one-out on
 * the reference points, then the held-out test points are scored once.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import {
  DEFAULT_SIGNAL_CONFIG,
  SignalProcessor,
  SignalProcessorConfig,
} from '../src/features/beacon-detection/model/signal-processor';
import {
  BeaconZoneDetector,
  DEFAULT_DETECTOR_CONFIG,
} from '../src/features/beacon-detection/model/zone-detector';
import { fitPathLoss } from '../src/features/indoor-positioning/model/calibration-tuning';
import {
  ErrorSummary,
  Estimator,
  LabelledVector,
  PlacedBeacon,
  cdf,
  chooseK,
  evaluate,
  nearestBeaconEstimator,
  positionError,
  summarise,
  weightedCentroidEstimator,
  wknnEstimator,
} from '../src/features/indoor-positioning/model/evaluation';
import {
  beaconOrderFor,
  centreVector,
  meanVector,
  vectorFromFingerprint,
} from '../src/features/indoor-positioning/model/fingerprint-vector';
import { DEFAULT_POSITIONING_PROCESSOR } from '../src/features/indoor-positioning/model/position-engine';
import { replayCapture } from '../src/features/indoor-positioning/model/replay';
import {
  Fingerprint,
  FloorPlan,
  RadioMap,
  RawSample,
} from '../src/features/indoor-positioning/model/types';
import { containsPoint } from '../src/features/indoor-positioning/model/zone-geometry';

// --- dataset ------------------------------------------------------------------

interface DatasetCapture {
  id: string;
  deviceModel: string;
  platform: string;
  orientationDeg: number | null;
  startedAt: string;
  durationMs: number;
  samples: RawSample[];
  fingerprint: Fingerprint;
}

interface DatasetPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'REFERENCE' | 'TEST';
  captures: DatasetCapture[];
}

interface Dataset {
  exportedAt: string;
  floorPlan: FloorPlan;
  beaconReach?: Record<string, number | null>;
  points: DatasetPoint[];
}

// --- arguments ----------------------------------------------------------------

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TICK_MS = 500;
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);

async function loadDataset(): Promise<Dataset> {
  const file = argument('file');
  if (file) return JSON.parse(readFileSync(path.resolve(file), 'utf8')) as Dataset;

  const api = argument('api');
  const floor = argument('floor');
  if (!api || !floor) {
    throw new Error(
      'Pass --file <dataset.json>, or --api <url> --floor <code> with ADMIN_EMAIL / ADMIN_PASSWORD set.',
    );
  }
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to fetch from the API.');

  const login = (await (
    await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  ).json()) as { accessToken?: string; message?: string };
  if (!login.accessToken) throw new Error(`Login failed: ${login.message ?? 'no token'}`);
  const headers = { authorization: `Bearer ${login.accessToken}` };

  const plans = (await (await fetch(`${api}/admin/floor-plans`, { headers })).json()) as Array<{
    id: string;
    code: string;
  }>;
  const plan = plans.find((candidate) => candidate.code === floor.toUpperCase());
  if (!plan)
    throw new Error(`Floor plan ${floor} not found. Have: ${plans.map((p) => p.code).join(', ')}`);

  const dataset = (await (
    await fetch(`${api}/admin/floor-plans/${plan.id}/dataset`, { headers })
  ).json()) as Dataset;
  const snapshotDir = path.join(REPO_ROOT, 'research', 'datasets');
  mkdirSync(snapshotDir, { recursive: true });
  const snapshot = path.join(snapshotDir, `${plan.code}-${stamp}.json`);
  writeFileSync(snapshot, JSON.stringify(dataset, null, 2));
  console.log(`Dataset snapshot saved to ${path.relative(process.cwd(), snapshot)}`);
  return dataset;
}

// --- fingerprint variants (E3) ------------------------------------------------

type FingerprintOf = (capture: DatasetCapture) => Fingerprint;

function viaProcessor(processor: SignalProcessorConfig, fillDbm: number): FingerprintOf {
  return (capture) =>
    replayCapture(capture.samples, { processor, tickMs: TICK_MS, fillDbm }).fingerprint;
}

const rawMean: FingerprintOf = (capture) => {
  const sums = new Map<string, { total: number; count: number }>();
  for (const sample of capture.samples) {
    const sum = sums.get(sample.b) ?? { total: 0, count: 0 };
    sums.set(sample.b, { total: sum.total + sample.r, count: sum.count + 1 });
  }
  return Object.fromEntries([...sums].map(([beacon, sum]) => [beacon, sum.total / sum.count]));
};

// --- building blocks ----------------------------------------------------------

interface DeviceData {
  key: string;
  references: Array<{ point: DatasetPoint; captures: DatasetCapture[] }>;
  tests: Array<{ point: DatasetPoint; capture: DatasetCapture }>;
}

function radioMapFrom(
  data: DeviceData['references'],
  order: string[],
  fillDbm: number,
  fingerprintOf: FingerprintOf,
  pick: (captures: DatasetCapture[]) => DatasetCapture[] = (captures) => captures,
): RadioMap {
  return {
    beaconOrder: order,
    fillDbm,
    source: 'model',
    entries: data
      .map(({ point, captures }) => ({ point, chosen: pick(captures) }))
      .filter(({ chosen }) => chosen.length > 0)
      .map(({ point, chosen }) => ({
        pointId: point.id,
        label: point.label,
        x: point.x,
        y: point.y,
        vector: meanVector(
          chosen.map((capture) => vectorFromFingerprint(fingerprintOf(capture), order, fillDbm)),
        ),
        captureCount: chosen.length,
      })),
  };
}

function testsFrom(
  data: DeviceData['tests'],
  order: string[],
  fillDbm: number,
  fingerprintOf: FingerprintOf,
): LabelledVector[] {
  return data.map(({ point, capture }) => ({
    label: point.label,
    x: point.x,
    y: point.y,
    vector: vectorFromFingerprint(fingerprintOf(capture), order, fillDbm),
  }));
}

function project(map: RadioMap, keep: number[]): RadioMap {
  return {
    ...map,
    beaconOrder: keep.map((index) => map.beaconOrder[index]),
    entries: map.entries.map((entry) => ({
      ...entry,
      vector: keep.map((index) => entry.vector[index]),
    })),
  };
}

function centred(map: RadioMap): RadioMap {
  return {
    ...map,
    entries: map.entries.map((entry) => ({ ...entry, vector: centreVector(entry.vector) })),
  };
}

const fmt = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '-');
const summaryRow = (name: string, s: ErrorSummary) =>
  `| ${name} | ${s.count} | ${fmt(s.mean)} | ${fmt(s.median)} | ${fmt(s.p90)} | ${fmt(s.max)} |`;
const SUMMARY_HEADER =
  '| Method | n | Mean (m) | Median (m) | P90 (m) | Max (m) |\n|---|---|---|---|---|---|';

// --- figure --------------------------------------------------------------------

const SERIES_COLOURS = ['#8c392f', '#2f6f8c', '#5f8c2f', '#a77c42', '#6b4f8c', '#444444'];

/**
 * Empirical CDF of positioning error as a standalone SVG - drops straight
 * into the report or a slide without a plotting tool.
 */
function cdfSvg(series: Array<{ name: string; errors: number[] }>, title: string): string {
  const width = 780;
  const height = 400;
  const left = 56;
  const right = 250;
  const top = 36;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxError = Math.max(0.5, ...series.flatMap((item) => item.errors));
  const xMax = Math.ceil(maxError * 2) / 2;
  const x = (metres: number) => left + (metres / xMax) * plotW;
  const y = (fraction: number) => top + (1 - fraction) * plotH;
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="${left}" y="22" font-size="14" font-weight="bold">${escape(title)}</text>`,
  ];

  for (let tick = 0; tick <= 1.0001; tick += 0.25) {
    parts.push(
      `<line x1="${left}" x2="${left + plotW}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e5e5e5"/>`,
      `<text x="${left - 8}" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`,
    );
  }
  const step = xMax <= 2 ? 0.25 : xMax <= 5 ? 0.5 : 1;
  for (let tick = 0; tick <= xMax + 1e-9; tick += step) {
    parts.push(
      `<line x1="${x(tick)}" x2="${x(tick)}" y1="${top}" y2="${top + plotH}" stroke="#f0f0f0"/>`,
      `<text x="${x(tick)}" y="${top + plotH + 18}" text-anchor="middle">${Number(tick.toFixed(2))}</text>`,
    );
  }
  parts.push(
    `<rect x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="none" stroke="#999999"/>`,
    `<text x="${left + plotW / 2}" y="${height - 10}" text-anchor="middle">Positioning error (m)</text>`,
  );

  series.forEach((item, index) => {
    const colour = SERIES_COLOURS[index % SERIES_COLOURS.length];
    const sorted = [...item.errors].sort((a, b) => a - b);
    // Step function: flat, then up by 1/n at each observed error.
    let d = `M ${x(0)} ${y(0)}`;
    sorted.forEach((error, rank) => {
      d += ` H ${x(error)} V ${y((rank + 1) / sorted.length)}`;
    });
    d += ` H ${x(xMax)}`;
    parts.push(`<path d="${d}" fill="none" stroke="${colour}" stroke-width="2"/>`);
    const legendY = top + 12 + index * 20;
    parts.push(
      `<line x1="${left + plotW + 14}" x2="${left + plotW + 34}" y1="${legendY - 4}" y2="${legendY - 4}" stroke="${colour}" stroke-width="2"/>`,
      `<text x="${left + plotW + 40}" y="${legendY}">${escape(item.name)}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('\n');
}

// --- zone trigger replay (E7) -------------------------------------------------

function zoneAt(plan: FloorPlan, x: number, y: number): string | null {
  return (
    plan.zones.find((zone) => zone.mapShape && containsPoint(zone.mapShape, x, y))?.code ?? null
  );
}

function replayZoneDetector(
  plan: FloorPlan,
  reach: Record<string, number | null>,
  capture: DatasetCapture,
): string | null {
  const zoneOf = new Map(plan.beacons.map((beacon) => [beacon.identifier, beacon.zoneCode]));
  const processor = new SignalProcessor(DEFAULT_SIGNAL_CONFIG);
  const detector = new BeaconZoneDetector(
    (identifier) => zoneOf.get(identifier),
    DEFAULT_DETECTOR_CONFIG,
    (identifier) => reach[identifier] ?? undefined,
  );
  detector.start();
  const samples = [...capture.samples].sort((a, b) => a.t - b.t);
  let cursor = 0;
  for (let now = 0; now <= capture.durationMs; now += TICK_MS) {
    while (cursor < samples.length && samples[cursor].t <= now) {
      const sample = samples[cursor];
      processor.ingest({
        identifier: sample.b,
        protocol: 'eddystone_uid',
        beaconId: sample.b,
        rssi: sample.r,
        timestamp: sample.t,
      });
      cursor += 1;
    }
    detector.update(processor.snapshot(now), now);
  }
  return detector.snapshotAt(capture.durationMs).confirmedZone;
}

// --- main ---------------------------------------------------------------------

async function main(): Promise<void> {
  const dataset = await loadDataset();
  const plan = dataset.floorPlan;
  const order = beaconOrderFor(plan);
  const fill = plan.fillDbm;
  const reach = dataset.beaconReach ?? {};
  const includeSynthetic = flag('include-synthetic');
  const outDir = path.resolve(
    argument('out') ?? path.join(REPO_ROOT, 'research', 'results', stamp),
  );
  mkdirSync(outDir, { recursive: true });

  const placed: PlacedBeacon[] = plan.beacons
    .filter((beacon) => beacon.mapX !== null && beacon.mapY !== null)
    .map((beacon) => ({
      identifier: beacon.identifier,
      x: beacon.mapX as number,
      y: beacon.mapY as number,
    }));

  // Group captures by device.
  const devices = new Map<string, DeviceData>();
  const deviceOf = (capture: DatasetCapture) => `${capture.platform}:${capture.deviceModel}`;
  for (const point of dataset.points) {
    for (const capture of point.captures) {
      if (capture.platform === 'simulator' && !includeSynthetic) continue;
      const key = deviceOf(capture);
      const data = devices.get(key) ?? { key, references: [], tests: [] };
      if (point.kind === 'TEST') data.tests.push({ point, capture });
      else {
        const existing = data.references.find((entry) => entry.point.id === point.id);
        if (existing) existing.captures.push(capture);
        else data.references.push({ point, captures: [capture] });
      }
      devices.set(key, data);
    }
  }

  const standard = viaProcessor(DEFAULT_POSITIONING_PROCESSOR, fill);
  const lines: string[] = [];
  const log = (line = '') => lines.push(line);

  log(`# Positioning evaluation - ${plan.name} (${plan.code})`);
  log();
  log(`- Dataset exported: ${dataset.exportedAt}; evaluated: ${new Date().toISOString()}`);
  log(
    `- Room: ${plan.widthMeters} x ${plan.heightMeters} m; beacons: ${order.join(', ')}; fill ${fill} dBm`,
  );
  log(
    `- Fingerprints rebuilt from raw samples with the app's positioning processor ` +
      `(${DEFAULT_POSITIONING_PROCESSOR.smoothing}, ${DEFAULT_POSITIONING_PROCESSOR.scanWindowMs} ms window, tick ${TICK_MS} ms).`,
  );
  log(`- k is chosen by leave-one-out on reference points only; test points are scored once.`);
  if (includeSynthetic)
    log(`- **Includes synthetic simulator captures: pipeline check, not evidence of accuracy.**`);
  log();

  const evaluated: Array<{ key: string; map: RadioMap; k: number }> = [];

  for (const data of devices.values()) {
    const map = radioMapFrom(data.references, order, fill, standard);
    const tests = testsFrom(data.tests, order, fill, standard);
    log(`## Device ${data.key}`);
    log();
    log(
      `Reference points: ${map.entries.length} (${data.references.reduce((n, r) => n + r.captures.length, 0)} captures). ` +
        `Test captures: ${tests.length}.`,
    );
    log();
    if (map.entries.length < 3) {
      log('_Fewer than 3 reference points - skipped._');
      log();
      continue;
    }

    // Path loss actually measured in this room (report figure + sanity check).
    log('### Measured path loss (fit of rssi = P0 - 10 n log10 d)');
    log();
    log('| Beacon | P0 at 1 m (dBm) | n | points |');
    log('|---|---|---|---|');
    for (const beacon of placed) {
      const fit = fitPathLoss(map, beacon.identifier, beacon);
      log(
        fit
          ? `| ${beacon.identifier} | ${fmt(fit.rssiAtOneMetre, 1)} | ${fmt(fit.pathLossExponent)} | ${fit.points} |`
          : `| ${beacon.identifier} | - | - | - |`,
      );
    }
    log();

    // E1 - choose k.
    const { candidates, best } = chooseK(map);
    log('### E1 - Choice of k (leave-one-out on reference points)');
    log();
    log('| k | Weighting | Mean (m) | Median (m) | P90 (m) |');
    log('|---|---|---|---|---|');
    for (const candidate of candidates) {
      const mark = candidate === best ? ' **(chosen)**' : '';
      log(
        `| ${candidate.k} | ${candidate.weighting}${mark} | ${fmt(candidate.summary.mean)} | ${fmt(candidate.summary.median)} | ${fmt(candidate.summary.p90)} |`,
      );
    }
    log();
    evaluated.push({ key: data.key, map, k: best.k });

    if (tests.length === 0) {
      log('_No test captures for this device - E2..E7 skipped._');
      log();
      continue;
    }

    // E2 - accuracy on held-out test points.
    const estimators: Array<[string, Estimator]> = [
      [`WKNN (k=${best.k}, 1/d)`, wknnEstimator(map.entries, best.k, 'inverse')],
      [`KNN (k=${best.k})`, wknnEstimator(map.entries, best.k, 'uniform')],
      ['Nearest reference point (k=1)', wknnEstimator(map.entries, 1, 'uniform')],
      ['Nearest beacon (baseline)', nearestBeaconEstimator(order, placed)],
      ['Weighted centroid (baseline)', weightedCentroidEstimator(order, placed, fill)],
    ];
    log('### E2 - Accuracy on held-out test points');
    log();
    log(SUMMARY_HEADER);
    const errorsByMethod = new Map<string, number[]>();
    const rows = ['test,x,y,method,est_x,est_y,error_m'];
    for (const [name, estimator] of estimators) {
      const errors = evaluate(estimator, tests);
      errorsByMethod.set(name, errors);
      log(summaryRow(name, summarise(errors)));
      for (const test of tests) {
        const estimate = estimator(test.vector);
        if (estimate)
          rows.push(
            [
              test.label,
              test.x,
              test.y,
              `"${name}"`,
              fmt(estimate.x, 3),
              fmt(estimate.y, 3),
              fmt(positionError(estimate, test), 3),
            ].join(','),
          );
      }
    }
    log();
    const safeKey = data.key.replace(/[^a-z0-9]+/gi, '_');
    writeFileSync(path.join(outDir, `errors-${safeKey}.csv`), rows.join('\n') + '\n');
    const allErrors = [...errorsByMethod.values()].flat();
    const upTo = Math.ceil(Math.max(...allErrors, 0.25) / 0.25) * 0.25;
    const curves = [...errorsByMethod].map(([name, errors]) => ({
      name,
      rows: cdf(errors, 0.25, upTo),
    }));
    const cdfCsv = [`error_m,${curves.map((curve) => `"${curve.name}"`).join(',')}`];
    curves[0].rows.forEach((row, index) =>
      cdfCsv.push(
        [row.errorM, ...curves.map((curve) => fmt(curve.rows[index].fraction, 3))].join(','),
      ),
    );
    writeFileSync(path.join(outDir, `cdf-${safeKey}.csv`), cdfCsv.join('\n') + '\n');
    writeFileSync(
      path.join(outDir, `cdf-${safeKey}.svg`),
      cdfSvg(
        [...errorsByMethod].map(([name, errors]) => ({ name, errors })),
        `CDF - ${data.key}`,
      ),
    );
    log(`![CDF of positioning error](cdf-${safeKey}.svg)`);
    log();
    log(`CSV: \`errors-${safeKey}.csv\` (every estimate), \`cdf-${safeKey}.csv\` (CDF table).`);
    log();

    // E3 - preprocessing.
    log('### E3 - Signal preprocessing (WKNN, same k)');
    log();
    log(SUMMARY_HEADER);
    const variants: Array<[string, FingerprintOf]> = [
      ['Raw mean (no window, no outlier removal)', rawMean],
      [
        'Processor, weighted, 2 s',
        viaProcessor({ ...DEFAULT_POSITIONING_PROCESSOR, scanWindowMs: 2000 }, fill),
      ],
      ['Processor, weighted, 3 s (app default)', standard],
      [
        'Processor, weighted, 4 s',
        viaProcessor({ ...DEFAULT_POSITIONING_PROCESSOR, scanWindowMs: 4000 }, fill),
      ],
      [
        'Processor, median, 3 s',
        viaProcessor({ ...DEFAULT_POSITIONING_PROCESSOR, smoothing: 'median' }, fill),
      ],
    ];
    for (const [name, fingerprintOf] of variants) {
      const variantMap = radioMapFrom(data.references, order, fill, fingerprintOf);
      const variantTests = testsFrom(data.tests, order, fill, fingerprintOf);
      log(
        summaryRow(
          name,
          summarise(evaluate(wknnEstimator(variantMap.entries, best.k, 'inverse'), variantTests)),
        ),
      );
    }
    log();

    // E4 - orientations.
    const multi = data.references.some((reference) => reference.captures.length > 1);
    log('### E4 - Captures per reference point');
    log();
    if (!multi) {
      log('_Only one capture per point - nothing to compare._');
    } else {
      log(SUMMARY_HEADER);
      const single = radioMapFrom(data.references, order, fill, standard, (captures) =>
        captures.slice(0, 1),
      );
      log(
        summaryRow(
          'First capture only (one orientation)',
          summarise(evaluate(wknnEstimator(single.entries, best.k, 'inverse'), tests)),
        ),
      );
      log(
        summaryRow(
          'All captures (all orientations)',
          summarise(evaluate(wknnEstimator(map.entries, best.k, 'inverse'), tests)),
        ),
      );
    }
    log();

    // E6 - beacon count.
    log('### E6 - Removing one beacon');
    log();
    log(SUMMARY_HEADER);
    log(
      summaryRow(
        `All ${order.length} beacons`,
        summarise(evaluate(wknnEstimator(map.entries, best.k, 'inverse'), tests)),
      ),
    );
    order.forEach((dropped, droppedIndex) => {
      const keep = order.map((_, index) => index).filter((index) => index !== droppedIndex);
      const reduced = project(map, keep);
      const reducedTests = tests.map((test) => ({
        ...test,
        vector: keep.map((index) => test.vector[index]),
      }));
      log(
        summaryRow(
          `Without ${dropped}`,
          summarise(evaluate(wknnEstimator(reduced.entries, best.k, 'inverse'), reducedTests)),
        ),
      );
    });
    log();

    // E7 - which zone triggers.
    log('### E7 - Zone triggering on test captures');
    log();
    let detectorHits = 0;
    let geofenceHits = 0;
    const wknn = wknnEstimator(map.entries, best.k, 'inverse');
    for (const [index, { point, capture }] of data.tests.entries()) {
      const truth = zoneAt(plan, point.x, point.y);
      if (replayZoneDetector(plan, reach, capture) === truth) detectorHits += 1;
      const estimate = wknn(tests[index].vector);
      if ((estimate ? zoneAt(plan, estimate.x, estimate.y) : null) === truth) geofenceHits += 1;
    }
    log('| Trigger | Correct zone (or correctly none) |');
    log('|---|---|');
    log(
      `| Zone detector (strongest beacon + minRssi + dwell + hysteresis) | ${detectorHits}/${tests.length} (${fmt((100 * detectorHits) / tests.length, 0)}%) |`,
    );
    log(
      `| Geofence on WKNN position | ${geofenceHits}/${tests.length} (${fmt((100 * geofenceHits) / tests.length, 0)}%) |`,
    );
    log();
  }

  // E5 - cross-device.
  const withTests = [...devices.values()].filter((data) => data.tests.length > 0);
  if (evaluated.length > 1 && withTests.length > 0) {
    log('## E5 - Radio map from one phone, tested on another (WKNN)');
    log();
    log('| Radio map | Tested on | Plain mean (m) | Mean-centred mean (m) |');
    log('|---|---|---|---|');
    for (const source of evaluated) {
      for (const target of withTests) {
        if (target.key === source.key) continue;
        const tests = testsFrom(target.tests, order, fill, standard);
        const plain = summarise(
          evaluate(wknnEstimator(source.map.entries, source.k, 'inverse'), tests),
        );
        const centredTests = tests.map((test) => ({ ...test, vector: centreVector(test.vector) }));
        const centredMean = summarise(
          evaluate(wknnEstimator(centred(source.map).entries, source.k, 'inverse'), centredTests),
        );
        log(`| ${source.key} | ${target.key} | ${fmt(plain.mean)} | ${fmt(centredMean.mean)} |`);
      }
    }
    log();
  }

  if (devices.size === 0)
    log(
      '_No captures to evaluate. Record reference and test points with the calibration mode first._',
    );

  const report = path.join(outDir, 'report.md');
  writeFileSync(report, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(`\nReport written to ${path.relative(process.cwd(), report)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
