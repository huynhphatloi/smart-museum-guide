import { RegisteredBeacon, buildMinRssiLookup, buildZoneLookup } from './beacon-registry';
import { DEFAULT_SIGNAL_CONFIG, SignalProcessor } from './signal-processor';
import { ZoneConfirmedEvent } from './types';
import { BeaconZoneDetector, DEFAULT_DETECTOR_CONFIG, ZoneDetectorConfig } from './zone-detector';

const NAMESPACE = 'a1b2c3d4e5f607182930';

const beacon = (
  identifier: string,
  instanceId: string,
  zoneCode: string,
  zoneName: string,
): RegisteredBeacon => ({
  identifier,
  name: identifier,
  protocol: 'EDDYSTONE_UID',
  namespaceId: NAMESPACE,
  instanceId,
  uuid: null,
  major: null,
  minor: null,
  txPower: -8,
  advertisingIntervalMs: 500,
  minRssi: null,
  zoneCode,
  zoneName,
});

const registry: RegisteredBeacon[] = [
  beacon('BEACON_A01', '000000000001', 'ZONE_A01', 'Ancient Sculpture'),
  beacon('BEACON_A02', '000000000002', 'ZONE_A02', 'Traditional Painting'),
];

const STEP_MS = 500;

/**
 * Drives the real pipeline (SignalProcessor -> BeaconZoneDetector) on a virtual
 * clock. No Bluetooth, no timers, no React - exactly the code that runs on a
 * device, only fed by hand.
 */
class Rig {
  readonly processor: SignalProcessor;
  readonly detector: BeaconZoneDetector;
  readonly events: ZoneConfirmedEvent[] = [];
  now = 0;

  constructor(overrides: Partial<ZoneDetectorConfig> = {}, beacons: RegisteredBeacon[] = registry) {
    this.processor = new SignalProcessor({ ...DEFAULT_SIGNAL_CONFIG, smoothing: 'mean' });
    this.detector = new BeaconZoneDetector(
      buildZoneLookup(beacons),
      { ...DEFAULT_DETECTOR_CONFIG, ...overrides },
      buildMinRssiLookup(beacons),
    );
    this.detector.start();
  }

  /** Advances the clock, emitting one sample per beacon per 500 ms step. */
  advance(durationMs: number, levels: Record<string, number | null>): void {
    for (let elapsed = 0; elapsed < durationMs; elapsed += STEP_MS) {
      this.now += STEP_MS;
      for (const [identifier, rssi] of Object.entries(levels)) {
        if (rssi === null) continue;
        this.processor.ingest({
          identifier,
          protocol: 'eddystone_uid',
          beaconId: `${NAMESPACE}:${identifier}`,
          rssi,
          txPower: -8,
          timestamp: this.now,
        });
      }
      const event = this.detector.update(this.processor.snapshot(this.now), this.now);
      if (event) this.events.push(event);
    }
  }

  get zone(): string | null {
    return this.detector.snapshotAt(this.now).confirmedZone;
  }

  get state(): string {
    return this.detector.snapshotAt(this.now).state;
  }

  get candidateZone(): string | null {
    return this.detector.snapshotAt(this.now).candidateZone;
  }
}

describe('BeaconZoneDetector', () => {
  it('confirms the stable strongest beacon', () => {
    const rig = new Rig();
    rig.advance(5000, { BEACON_A01: -60, BEACON_A02: -85 });

    expect(rig.zone).toBe('ZONE_A01');
    expect(rig.state).toBe('CONTENT_ACTIVE');
    expect(rig.events).toHaveLength(1);
    expect(rig.events[0]).toMatchObject({
      zoneCode: 'ZONE_A01',
      previousZoneCode: null,
      shouldNotify: true,
    });
  });

  it('does not confirm anything before the dwell time has elapsed', () => {
    const rig = new Rig({ dwellTimeMs: 3000 });
    rig.advance(2000, { BEACON_A01: -60, BEACON_A02: -85 });

    expect(rig.zone).toBeNull();
    expect(rig.state).toBe('CANDIDATE');
    expect(rig.candidateZone).toBe('ZONE_A01');
    expect(rig.events).toHaveLength(0);

    rig.advance(2000, { BEACON_A01: -60, BEACON_A02: -85 });
    expect(rig.zone).toBe('ZONE_A01');
  });

  it('ignores a single RSSI spike from a neighbouring beacon', () => {
    const rig = new Rig();
    rig.advance(6000, { BEACON_A01: -60, BEACON_A02: -85 });
    expect(rig.zone).toBe('ZONE_A01');

    // One momentary very strong reading from the other room.
    rig.now += STEP_MS;
    rig.processor.ingest({
      identifier: 'BEACON_A02',
      protocol: 'eddystone_uid',
      beaconId: `${NAMESPACE}:BEACON_A02`,
      rssi: -30,
      timestamp: rig.now,
    });
    rig.processor.ingest({
      identifier: 'BEACON_A01',
      protocol: 'eddystone_uid',
      beaconId: `${NAMESPACE}:BEACON_A01`,
      rssi: -60,
      timestamp: rig.now,
    });
    const event = rig.detector.update(rig.processor.snapshot(rig.now), rig.now);

    expect(event).toBeNull();
    expect(rig.zone).toBe('ZONE_A01');
    expect(rig.events).toHaveLength(1);
  });

  it('does not flap between two beacons of nearly equal strength', () => {
    const rig = new Rig({ hysteresisDb: 4 });
    rig.advance(5000, { BEACON_A01: -70, BEACON_A02: -73 });
    expect(rig.zone).toBe('ZONE_A01');

    // Alternate which one is marginally stronger, for a long time.
    for (let round = 0; round < 12; round += 1) {
      rig.advance(1000, {
        BEACON_A01: round % 2 === 0 ? -72 : -70,
        BEACON_A02: round % 2 === 0 ? -70 : -72,
      });
    }

    expect(rig.zone).toBe('ZONE_A01');
    expect(rig.events).toHaveLength(1);
  });

  it('changes zone once another beacon stays clearly dominant', () => {
    const rig = new Rig();
    rig.advance(5000, { BEACON_A01: -60, BEACON_A02: -85 });
    expect(rig.zone).toBe('ZONE_A01');

    // The visitor walks into the next room.
    rig.advance(8000, { BEACON_A01: -85, BEACON_A02: -55 });

    expect(rig.zone).toBe('ZONE_A02');
    expect(rig.events).toHaveLength(2);
    expect(rig.events[1]).toMatchObject({ zoneCode: 'ZONE_A02', previousZoneCode: 'ZONE_A01' });
  });

  it('does not re-announce the same zone within the cooldown window', () => {
    const rig = new Rig({ notificationCooldownMs: 60_000 });
    rig.advance(5000, { BEACON_A01: -60, BEACON_A02: -85 });
    rig.advance(8000, { BEACON_A01: -85, BEACON_A02: -55 });
    rig.advance(8000, { BEACON_A01: -55, BEACON_A02: -85 });

    expect(rig.zone).toBe('ZONE_A01');
    expect(rig.events).toHaveLength(3);
    expect(rig.events[2].zoneCode).toBe('ZONE_A01');
    // Back in a zone we already announced a moment ago: stay quiet.
    expect(rig.events[2].shouldNotify).toBe(false);
  });

  it('announces the zone again once the cooldown has expired', () => {
    const rig = new Rig({ notificationCooldownMs: 5000 });
    rig.advance(5000, { BEACON_A01: -60, BEACON_A02: -85 });
    rig.advance(20_000, { BEACON_A01: -85, BEACON_A02: -55 });
    rig.advance(8000, { BEACON_A01: -55, BEACON_A02: -85 });

    expect(rig.events[rig.events.length - 1]).toMatchObject({
      zoneCode: 'ZONE_A01',
      shouldNotify: true,
    });
  });

  it('ignores beacons that are not registered in this museum', () => {
    const rig = new Rig();
    rig.advance(6000, { BEACON_UNKNOWN: -40, BEACON_A01: -70 });

    expect(rig.zone).toBe('ZONE_A01');
  });

  it('ignores beacons weaker than the configured floor', () => {
    const rig = new Rig({ minRssi: -80 });
    rig.advance(6000, { BEACON_A01: -92, BEACON_A02: -95 });

    expect(rig.zone).toBeNull();
    expect(rig.state).toBe('SCANNING');
  });

  it('drops the confirmed zone when its beacon disappears', () => {
    const rig = new Rig({ loseConfirmationAfterMs: 5000 });
    rig.advance(5000, { BEACON_A01: -60 });
    expect(rig.zone).toBe('ZONE_A01');

    // The visitor leaves the building: no advertisements at all any more.
    rig.advance(12_000, {});

    expect(rig.zone).toBeNull();
    expect(rig.state).toBe('SCANNING');
  });

  it('reports dwell progress so the UI can show a countdown', () => {
    const rig = new Rig({ dwellTimeMs: 4000 });
    rig.advance(2000, { BEACON_A01: -60 });

    const progress = rig.detector.snapshotAt(rig.now).dwellProgress;
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it('stays idle until start() is called', () => {
    const detector = new BeaconZoneDetector(buildZoneLookup(registry));
    const event = detector.update(
      [
        {
          identifier: 'BEACON_A01',
          smoothedRssi: -50,
          lastRssi: -50,
          sampleCount: 10,
          outliersRemoved: 0,
          lastSeen: 1000,
          protocol: 'eddystone_uid',
        },
      ],
      1000,
    );

    expect(event).toBeNull();
    expect(detector.snapshotAt(1000).state).toBe('IDLE');
  });

  describe('per-beacon minRssi (zone reach set in the CMS)', () => {
    /** A display case tuned tight; anything weaker than -60 is another room. */
    const tightRegistry: RegisteredBeacon[] = [{ ...registry[0], minRssi: -60 }, registry[1]];

    it('ignores a beacon weaker than its own threshold, even though the global default would accept it', () => {
      // -75 clears DEFAULT_DETECTOR_CONFIG.minRssi (-95) but not the -60 set on this beacon.
      const rig = new Rig({}, tightRegistry);
      rig.advance(6000, { BEACON_A01: -75 });

      expect(rig.zone).toBeNull();
      expect(rig.events).toHaveLength(0);
    });

    it('confirms the same beacon once it is close enough to clear its threshold', () => {
      const rig = new Rig({}, tightRegistry);
      rig.advance(6000, { BEACON_A01: -48 });

      expect(rig.zone).toBe('ZONE_A01');
    });

    it('leaves beacons without a threshold on the global default', () => {
      // BEACON_A02 has minRssi null, so -75 is still inside its zone.
      const rig = new Rig({}, tightRegistry);
      rig.advance(6000, { BEACON_A02: -75 });

      expect(rig.zone).toBe('ZONE_A02');
    });

    it('lets a tight zone and a wide zone coexist - the point of the setting', () => {
      // Both beacons at -70: the display case rejects it, the hall accepts it.
      const rig = new Rig({}, tightRegistry);
      rig.advance(6000, { BEACON_A01: -70, BEACON_A02: -72 });

      expect(rig.zone).toBe('ZONE_A02');
    });
  });
});
