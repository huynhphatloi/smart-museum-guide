import { DEFAULT_SIGNAL_CONFIG } from '../../beacon-detection/model/signal-processor';
import { replayCapture } from './replay';
import { RawSample } from './types';

const options = {
  processor: { ...DEFAULT_SIGNAL_CONFIG, scanWindowMs: 3000, staleAfterMs: 6000 },
  tickMs: 500,
  fillDbm: -100,
};

/** One sample per beacon every `everyMs` for `durationMs`. */
function steady(levels: Record<string, number>, durationMs: number, everyMs = 200): RawSample[] {
  const samples: RawSample[] = [];
  for (let t = 0; t <= durationMs; t += everyMs) {
    for (const [b, r] of Object.entries(levels)) samples.push({ b, r, t });
  }
  return samples;
}

describe('replayCapture', () => {
  it('reproduces steady levels exactly', () => {
    const result = replayCapture(steady({ B1: -60, B2: -75 }, 10_000), options);

    expect(result.fingerprint).toEqual({ B1: -60, B2: -75 });
    expect(result.presence).toEqual({ B1: 1, B2: 1 });
    expect(result.samplesPerBeacon).toEqual({ B1: 51, B2: 51 });
    // 10 s of 500 ms ticks after a 3 s warm-up: 3.0, 3.5, ..., 10.0.
    expect(result.ticks).toBe(15);
  });

  it('shrugs off a single spike like the live processor does', () => {
    const samples = steady({ B1: -60 }, 10_000).map((sample) =>
      sample.t === 5000 ? { ...sample, r: -95 } : sample,
    );
    expect(replayCapture(samples, options).fingerprint.B1).toBeCloseTo(-60, 5);
  });

  it('counts the ticks a flaky beacon was missing as the fill value', () => {
    // B2 is only heard during the first 5 s; the 3 s window keeps it until 8 s.
    const samples = [...steady({ B1: -60 }, 10_000), ...steady({ B2: -80 }, 5000)];
    const result = replayCapture(samples, options);

    // Ticks 3.0..8.0 (11) see -80, ticks 8.5..10.0 (4) see nothing -> -100.
    expect(result.presence.B2).toBeCloseTo(11 / 15, 5);
    expect(result.fingerprint.B2).toBeCloseTo((11 * -80 + 4 * -100) / 15, 1);
  });

  it('sinks a beacon heard only in passing towards the fill value', () => {
    // One B9 sample at t = 0 is still inside the 3 s window at the first tick only.
    const samples = [...steady({ B1: -60 }, 10_000), { b: 'B9', r: -90, t: 0 }];
    const result = replayCapture(samples, options);
    expect(result.presence.B9).toBeCloseTo(1 / 15, 5);
    expect(result.fingerprint.B9).toBeCloseTo((-90 + 14 * -100) / 15, 1);
  });

  it('leaves out a beacon never heard after warm-up', () => {
    const samples = [...steady({ B1: -60 }, 10_000), { b: 'B9', r: -90, t: 0 }];
    const result = replayCapture(samples, { ...options, warmupMs: 4000 });
    expect(result.fingerprint).toEqual({ B1: -60 });
    expect(result.presence.B9).toBe(0);
  });

  it('still yields a fingerprint for a capture shorter than one window', () => {
    const result = replayCapture(steady({ B1: -65 }, 2000), options);
    expect(result.fingerprint.B1).toBe(-65);
    expect(result.ticks).toBeGreaterThan(0);
  });

  it('handles an empty capture', () => {
    expect(replayCapture([], options)).toEqual({
      fingerprint: {},
      ticks: 0,
      presence: {},
      samplesPerBeacon: {},
    });
  });
});
