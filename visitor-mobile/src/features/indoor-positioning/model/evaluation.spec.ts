import { DEMO_BEACONS, modelFingerprint, modelRadioMap } from './demo-room.fixture';
import {
  cdf,
  chooseK,
  evaluate,
  leaveOneOut,
  nearestBeaconEstimator,
  percentile,
  summarise,
  weightedCentroidEstimator,
  wknnEstimator,
} from './evaluation';

describe('error statistics', () => {
  it('summarises errors', () => {
    expect(summarise([1, 2, 3, 4])).toEqual({ count: 4, mean: 2.5, median: 2.5, p90: 3.7, max: 4 });
    expect(summarise([]).count).toBe(0);
  });

  it('interpolates percentiles', () => {
    expect(percentile([0, 10], 50)).toBe(5);
    expect(percentile([3], 90)).toBe(3);
  });

  it('builds an empirical CDF', () => {
    expect(cdf([0.2, 0.6, 1.1], 0.5)).toEqual([
      { errorM: 0, fraction: 0 },
      { errorM: 0.5, fraction: 1 / 3 },
      { errorM: 1, fraction: 2 / 3 },
      { errorM: 1.5, fraction: 1 },
    ]);
  });
});

describe('leave-one-out and k selection', () => {
  const radioMap = modelRadioMap();

  it('positions each held-out reference point from its neighbours', () => {
    const errors = leaveOneOut(radioMap, 3, 'inverse');
    expect(errors).toHaveLength(25);
    // Noise-free model on a 1 m grid: interpolation error stays under a metre.
    expect(summarise(errors).mean).toBeLessThan(1);
  });

  it('tries every candidate and picks the lowest mean', () => {
    const { candidates, best } = chooseK(radioMap, [1, 3], ['uniform', 'inverse']);
    expect(candidates).toHaveLength(4);
    expect(Math.min(...candidates.map((c) => c.summary.mean))).toBe(best.summary.mean);
  });
});

describe('baselines vs WKNN on off-grid test points', () => {
  const radioMap = modelRadioMap();
  const tests = [
    [1, 1],
    [2, 2],
    [3, 1],
    [4, 2],
    [1, 3],
    [2, 4],
    [3, 3],
    [4, 4],
  ].map(([x, y]) => {
    const fingerprint = modelFingerprint(x, y);
    return {
      label: `${x},${y}`,
      x,
      y,
      vector: radioMap.beaconOrder.map((identifier) => fingerprint[identifier]),
    };
  });

  it('WKNN beats both beacon-position baselines', () => {
    const wknn = summarise(evaluate(wknnEstimator(radioMap.entries, 3, 'inverse'), tests));
    const nearest = summarise(
      evaluate(nearestBeaconEstimator(radioMap.beaconOrder, DEMO_BEACONS), tests),
    );
    const centroid = summarise(
      evaluate(weightedCentroidEstimator(radioMap.beaconOrder, DEMO_BEACONS, -100), tests),
    );

    expect(wknn.count).toBe(8);
    expect(wknn.mean).toBeLessThan(nearest.mean);
    expect(wknn.mean).toBeLessThan(centroid.mean);
  });

  it('nearest-beacon returns the loudest beacon position', () => {
    const estimate = nearestBeaconEstimator(radioMap.beaconOrder, DEMO_BEACONS)([-50, -80, -90]);
    expect(estimate).toMatchObject({ x: 0.3, y: 0.3 });
  });
});
