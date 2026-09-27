import { parseCapturePayload } from './capture-payload';

describe('parseCapturePayload', () => {
  const samples = [
    { b: 'BEACON_A01', r: -61, t: 0 },
    { b: 'BEACON_A02', r: -74.5, t: 120 },
  ];
  const fingerprint = { BEACON_A01: -61.2, BEACON_A02: -74.8 };

  it('accepts well formed samples and fingerprint', () => {
    expect(parseCapturePayload(samples, fingerprint)).toEqual({ ok: true, samples, fingerprint });
  });

  it('rejects a sample with an impossible RSSI and names it', () => {
    const result = parseCapturePayload([{ b: 'BEACON_A01', r: 4, t: 0 }], fingerprint);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('samples.0.r') });
  });

  it('rejects unknown keys inside a sample', () => {
    const result = parseCapturePayload([{ b: 'BEACON_A01', r: -60, t: 0, x: 1 }], fingerprint);
    expect(result.ok).toBe(false);
  });

  it('rejects an empty fingerprint', () => {
    const result = parseCapturePayload(samples, {});
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('no beacons') });
  });

  it('rejects a fingerprint that is not a map of numbers', () => {
    expect(parseCapturePayload(samples, { BEACON_A01: 'loud' }).ok).toBe(false);
    expect(parseCapturePayload(samples, [1, 2]).ok).toBe(false);
  });
});
