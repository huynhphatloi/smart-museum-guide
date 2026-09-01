import {
  DEFAULT_SIGNAL_CONFIG,
  SignalProcessor,
  mean,
  median,
  removeOutliers,
  smooth,
  weightedMovingAverage,
} from './signal-processor';

describe('smoothing helpers', () => {
  it('computes a median for odd and even sample counts', () => {
    expect(median([-70, -60, -80])).toBe(-70);
    expect(median([-70, -60, -80, -90])).toBe(-75);
  });

  it('computes a mean', () => {
    expect(mean([-60, -70])).toBe(-65);
  });

  it('weights the newest sample most', () => {
    // Weights 1,2,3 -> (-90*1 + -70*2 + -60*3) / 6
    expect(weightedMovingAverage([-90, -70, -60])).toBeCloseTo(-68.33, 1);
    // The result must sit closer to the newest value than a plain mean does.
    expect(weightedMovingAverage([-90, -70, -60])).toBeGreaterThan(mean([-90, -70, -60]));
  });

  it('selects the configured strategy', () => {
    expect(smooth([-70, -60, -80], 'median')).toBe(-70);
    expect(smooth([-70, -60, -80], 'mean')).toBeCloseTo(-70);
  });
});

describe('removeOutliers', () => {
  it('drops a single obvious spike', () => {
    const { kept, removed } = removeOutliers([-68, -69, -65, -30, -67], 12);
    expect(removed).toBe(1);
    expect(kept).not.toContain(-30);
  });

  it('keeps everything when there are too few samples to judge', () => {
    expect(removeOutliers([-68, -30], 12)).toEqual({ kept: [-68, -30], removed: 0 });
  });

  it('never discards every sample', () => {
    // Median is -60; with a 1 dB threshold every value looks like an outlier,
    // which means the threshold is mis-calibrated rather than the data broken.
    const { kept, removed } = removeOutliers([-90, -90, -30, -30], 1);
    expect(kept).toHaveLength(4);
    expect(removed).toBe(0);
  });
});

describe('SignalProcessor', () => {
  const config = { ...DEFAULT_SIGNAL_CONFIG, scanWindowMs: 4000, smoothing: 'mean' as const };

  it('aggregates samples per beacon and ranks the strongest first', () => {
    const processor = new SignalProcessor(config);
    processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: 'ns:1',
      rssi: -60,
      timestamp: 1000,
    });
    processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: 'ns:1',
      rssi: -62,
      timestamp: 1500,
    });
    processor.ingest({
      identifier: 'BEACON_A02',
      protocol: 'eddystone_uid',
      beaconId: 'ns:2',
      rssi: -80,
      timestamp: 1200,
    });
    processor.ingest({
      identifier: 'BEACON_A02',
      protocol: 'eddystone_uid',
      beaconId: 'ns:2',
      rssi: -82,
      timestamp: 1700,
    });

    const stats = processor.snapshot(2000);

    expect(stats.map((stat) => stat.identifier)).toEqual(['BEACON_A01', 'BEACON_A02']);
    expect(stats[0].smoothedRssi).toBeCloseTo(-61);
    expect(stats[0].sampleCount).toBe(2);
    expect(stats[0].protocol).toBe('eddystone_uid');
  });

  it('drops samples that fall outside the sliding window', () => {
    const processor = new SignalProcessor(config);
    processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: 'ns:1',
      rssi: -40,
      timestamp: 1000,
    });
    processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: 'ns:1',
      rssi: -80,
      timestamp: 8000,
    });

    const stats = processor.snapshot(8500);

    expect(stats[0].sampleCount).toBe(1);
    expect(stats[0].smoothedRssi).toBe(-80);
  });

  it('forgets a beacon that has not been heard for a long time', () => {
    const processor = new SignalProcessor(config);
    processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: 'ns:1',
      rssi: -60,
      timestamp: 1000,
    });

    expect(processor.snapshot(20_000)).toHaveLength(0);
    expect(processor.trackedIdentifiers).toHaveLength(0);
  });

  it('reports how many outliers it removed', () => {
    const processor = new SignalProcessor({ ...config, outlierThresholdDb: 10 });
    [-68, -69, -65, -20, -67].forEach((rssi, index) =>
      processor.ingest({
        identifier: 'BEACON_A01',
        protocol: 'eddystone_uid',
        beaconId: 'ns:1',
        rssi,
        timestamp: 1000 + index * 100,
      }),
    );

    const [stat] = processor.snapshot(1500);
    expect(stat.outliersRemoved).toBe(1);
    expect(stat.smoothedRssi).toBeCloseTo(-67.25);
  });
});
