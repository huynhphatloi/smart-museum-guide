import { fitPathLoss, suggestMinRssi } from './calibration-tuning';
import { DEMO_BEACONS, modelRadioMap } from './demo-room.fixture';

describe('fitPathLoss', () => {
  it('recovers the model the radio map was generated from', () => {
    const fit = fitPathLoss(modelRadioMap(), 'BEACON_A01', DEMO_BEACONS[0]);
    expect(fit?.rssiAtOneMetre).toBeCloseTo(-67, 5);
    expect(fit?.pathLossExponent).toBeCloseTo(2, 5);
    // A1 is 0.28 m from the beacon - too close to trust, so it is left out.
    expect(fit?.points).toBe(24);
  });

  it('ignores readings that are only the fill value', () => {
    const map = modelRadioMap();
    map.entries.forEach((entry, index) => {
      if (index % 2 === 0) entry.vector[0] = map.fillDbm;
    });
    const fit = fitPathLoss(map, 'BEACON_A01', DEMO_BEACONS[0]);
    expect(fit?.points).toBe(12);
    expect(fit?.pathLossExponent).toBeCloseTo(2, 5);
  });

  it('returns null for an unknown beacon', () => {
    expect(fitPathLoss(modelRadioMap(), 'NOPE', { x: 0, y: 0 })).toBeNull();
  });
});

describe('suggestMinRssi', () => {
  it('predicts the level at the trigger distance', () => {
    const suggestion = suggestMinRssi(modelRadioMap(), 'BEACON_A02', DEMO_BEACONS[1], 1.5);
    // -67 - 20 log10(1.5) = -70.52
    expect(suggestion?.minRssi).toBe(-71);
    expect(suggestion?.triggerDistanceM).toBe(1.5);
  });

  it('clamps to what the CMS accepts', () => {
    expect(suggestMinRssi(modelRadioMap(), 'BEACON_A02', DEMO_BEACONS[1], 5000)?.minRssi).toBe(
      -100,
    );
  });
});
