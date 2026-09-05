import { BeaconStat, DetectionSnapshot, DetectionState, ZoneConfirmedEvent } from './types';

export interface ZoneDetectorConfig {
  /**
   * A candidate must stay dominant this long before the zone changes.
   * This is what stops the guide from jumping around while a visitor walks
   * past a doorway.
   */
  dwellTimeMs: number;
  /**
   * Hysteresis: a challenger must be this many dB stronger than the currently
   * confirmed beacon before it is even considered a candidate. Without it, two
   * beacons of near equal strength make the app flap between zones.
   */
  hysteresisDb: number;
  /** Ignore beacons weaker than this - they are in another room. */
  minRssi: number;
  /** A beacon needs at least this many samples before it can be trusted. */
  minSamples: number;
  /**
   * After confirming a zone, suppress the "you are now in ..." prompt for the
   * same zone for this long, so stepping out and back in stays quiet.
   */
  notificationCooldownMs: number;
  /** Drop the confirmed zone when its beacon has not been heard this long. */
  loseConfirmationAfterMs: number;
}

export const DEFAULT_DETECTOR_CONFIG: ZoneDetectorConfig = {
  dwellTimeMs: 3000,
  hysteresisDb: 4,
  minRssi: -95,
  minSamples: 2,
  notificationCooldownMs: 60_000,
  loseConfirmationAfterMs: 10_000,
};

/** Maps a beacon identifier to the zone it is installed in. */
export type ZoneLookup = (beaconIdentifier: string) => string | undefined;

/**
 * Maps a beacon identifier to its own minimum RSSI, when the CMS sets one.
 * Returning undefined falls back to the detector's global `minRssi`.
 */
export type MinRssiLookup = (beaconIdentifier: string) => number | undefined;

/**
 * The zone state machine.
 *
 *   IDLE -> SCANNING -> CANDIDATE -> CONFIRMED -> CONTENT_ACTIVE
 *                          ^                          |
 *                          +--------------------------+
 *                            (a challenger appears)
 *
 * Everything is driven by explicit `now` values so the whole thing is testable
 * without Bluetooth, timers, or a device.
 */
export class BeaconZoneDetector {
  private state: DetectionState = 'IDLE';
  private candidate: string | null = null;
  private candidateSince: number | null = null;
  private confirmed: string | null = null;
  private confirmedAt: number | null = null;
  private confirmedZone: string | null = null;
  private lastStats: BeaconStat[] = [];
  private readonly lastNotifiedAt = new Map<string, number>();

  constructor(
    private readonly lookupZone: ZoneLookup,
    private config: ZoneDetectorConfig = DEFAULT_DETECTOR_CONFIG,
    private lookupMinRssi: MinRssiLookup = () => undefined,
  ) {}

  /** Refreshed when the registry reloads, so a CMS change takes effect live. */
  setMinRssiLookup(lookup: MinRssiLookup): void {
    this.lookupMinRssi = lookup;
  }

  /** Allows the scanner to refresh centrally supplied detector configuration. */
  updateConfig(patch: Partial<ZoneDetectorConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  getConfig(): ZoneDetectorConfig {
    return this.config;
  }

  start(): void {
    this.state = 'SCANNING';
  }

  stop(): void {
    this.state = 'IDLE';
    this.candidate = null;
    this.candidateSince = null;
    this.confirmed = null;
    this.confirmedAt = null;
    this.confirmedZone = null;
    this.lastStats = [];
  }

  /** Forgets cooldowns, e.g. when the visitor switches language or restarts a tour. */
  resetCooldowns(): void {
    this.lastNotifiedAt.clear();
  }

  /**
   * Feeds one processed snapshot into the state machine.
   *
   * @returns a {@link ZoneConfirmedEvent} when - and only when - the confirmed
   *   zone changes. Every other call returns null.
   */
  update(stats: BeaconStat[], now: number): ZoneConfirmedEvent | null {
    this.lastStats = stats;
    if (this.state === 'IDLE') return null;

    const eligible = stats.filter(
      (stat) =>
        stat.sampleCount >= this.config.minSamples &&
        // A beacon's own threshold wins when the CMS sets one: a display case
        // and a hall need different reach, and one global value cannot be both.
        stat.smoothedRssi >= (this.lookupMinRssi(stat.identifier) ?? this.config.minRssi) &&
        this.lookupZone(stat.identifier) !== undefined,
    );

    // Nothing usable in range.
    if (eligible.length === 0) {
      this.candidate = null;
      this.candidateSince = null;
      this.expireConfirmationIfStale(now, null);
      if (this.confirmed === null) this.state = 'SCANNING';
      return null;
    }

    const best = eligible[0];
    const confirmedStat = this.confirmed
      ? (eligible.find((stat) => stat.identifier === this.confirmed) ?? null)
      : null;

    this.expireConfirmationIfStale(now, confirmedStat);

    // The strongest beacon is the one we are already showing: nothing to do.
    if (this.confirmed !== null && best.identifier === this.confirmed) {
      this.candidate = null;
      this.candidateSince = null;
      this.state = 'CONTENT_ACTIVE';
      return null;
    }

    // Hysteresis: a challenger has to be *meaningfully* better, not just better.
    if (
      confirmedStat !== null &&
      best.smoothedRssi < confirmedStat.smoothedRssi + this.config.hysteresisDb
    ) {
      this.candidate = null;
      this.candidateSince = null;
      this.state = 'CONTENT_ACTIVE';
      return null;
    }

    // Track the challenger; restart the dwell clock whenever it changes.
    if (this.candidate !== best.identifier) {
      this.candidate = best.identifier;
      this.candidateSince = now;
      this.state = 'CANDIDATE';
      return null;
    }

    const heldFor = now - (this.candidateSince ?? now);
    if (heldFor < this.config.dwellTimeMs) {
      this.state = 'CANDIDATE';
      return null;
    }

    return this.confirm(best.identifier, now);
  }

  snapshot(): DetectionSnapshot {
    const dwellProgress =
      this.candidateSince === null
        ? 0
        : Math.min(1, (Date.now() - this.candidateSince) / this.config.dwellTimeMs);

    return {
      state: this.state,
      candidateBeacon: this.candidate,
      candidateZone: this.candidate ? (this.lookupZone(this.candidate) ?? null) : null,
      dwellProgress,
      confirmedBeacon: this.confirmed,
      confirmedZone: this.confirmedZone,
      confirmedAt: this.confirmedAt,
      stats: this.lastStats,
    };
  }

  /** Same as {@link snapshot} but with an injectable clock, for tests. */
  snapshotAt(now: number): DetectionSnapshot {
    const snapshot = this.snapshot();
    return {
      ...snapshot,
      dwellProgress:
        this.candidateSince === null
          ? 0
          : Math.min(1, (now - this.candidateSince) / this.config.dwellTimeMs),
    };
  }

  // -------------------------------------------------------------------------

  private confirm(identifier: string, now: number): ZoneConfirmedEvent | null {
    const zoneCode = this.lookupZone(identifier);
    if (!zoneCode) return null;

    const previousZoneCode = this.confirmedZone;

    this.confirmed = identifier;
    this.confirmedZone = zoneCode;
    this.confirmedAt = now;
    this.candidate = null;
    this.candidateSince = null;
    this.state = 'CONTENT_ACTIVE';

    const lastNotified = this.lastNotifiedAt.get(zoneCode);
    const shouldNotify =
      lastNotified === undefined || now - lastNotified >= this.config.notificationCooldownMs;

    if (shouldNotify) this.lastNotifiedAt.set(zoneCode, now);

    return { beaconIdentifier: identifier, zoneCode, previousZoneCode, at: now, shouldNotify };
  }

  private expireConfirmationIfStale(now: number, confirmedStat: BeaconStat | null): void {
    if (this.confirmed === null) return;

    const lastSeen = confirmedStat?.lastSeen ?? null;
    if (lastSeen !== null && now - lastSeen <= this.config.loseConfirmationAfterMs) return;
    if (
      lastSeen === null &&
      this.confirmedAt !== null &&
      now - this.confirmedAt <= this.config.loseConfirmationAfterMs
    ) {
      return;
    }

    this.confirmed = null;
    this.confirmedZone = null;
    this.confirmedAt = null;
    this.state = 'SCANNING';
  }
}
