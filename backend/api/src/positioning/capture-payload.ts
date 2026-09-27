import { z } from 'zod';

/** One raw reading inside a capture: beacon identifier, RSSI, ms since start. */
export interface RawSample {
  b: string;
  r: number;
  t: number;
}

export type FingerprintValues = Record<string, number>;

/**
 * Generous upper bound: 60 s of 10 Hz advertising from 20 beacons. Anything
 * bigger is a client bug, not a calibration.
 */
const MAX_SAMPLES = 12_000;

const sampleSchema = z
  .object({
    b: z.string().min(1).max(64),
    // RSSI is received power in dBm - it is never positive.
    r: z.number().finite().min(-127).max(0),
    t: z.number().finite().min(0).max(600_000),
  })
  .strict();

const fingerprintSchema = z
  .record(z.string().min(1).max(64), z.number().finite().min(-127).max(0))
  .refine((value) => Object.keys(value).length > 0, 'fingerprint has no beacons');

/**
 * Validates the JSON parts of a capture upload. Kept apart from the DTO so it
 * can be unit tested and so a bad sample produces one clear message.
 */
export function parseCapturePayload(
  samples: unknown,
  fingerprint: unknown,
):
  | { ok: true; samples: RawSample[]; fingerprint: FingerprintValues }
  | { ok: false; reason: string } {
  const parsedSamples = z.array(sampleSchema).max(MAX_SAMPLES).safeParse(samples);
  if (!parsedSamples.success) {
    const issue = parsedSamples.error.issues[0];
    return { ok: false, reason: `samples${formatPath(issue.path)}: ${issue.message}` };
  }

  const parsedFingerprint = fingerprintSchema.safeParse(fingerprint);
  if (!parsedFingerprint.success) {
    const issue = parsedFingerprint.error.issues[0];
    return { ok: false, reason: `fingerprint${formatPath(issue.path)}: ${issue.message}` };
  }

  return { ok: true, samples: parsedSamples.data, fingerprint: parsedFingerprint.data };
}

function formatPath(path: Array<string | number>): string {
  return path.length > 0 ? `.${path.join('.')}` : '';
}
