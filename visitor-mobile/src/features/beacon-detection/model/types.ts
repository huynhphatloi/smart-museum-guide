/**
 * Types shared by every part of the BLE pipeline.
 *
 * The pipeline is deliberately split so each stage can be tested on its own:
 *
 *   BeaconSignalSource -> SignalProcessor -> BeaconZoneDetector -> UI / API
 *   (real or simulated)   (window+smooth)    (candidate, dwell,
 *                                             hysteresis, cooldown)
 */

/**
 * How the identity was read from the air.
 *
 * `eddystone_uid` is the primary protocol: its payload travels in BLE service
 * data (0xFEAA), which Android and iOS both expose to a normal scan.
 * `ibeacon` is secondary - the same hardware can advertise both, and on iOS it
 * is the identity Core Location region monitoring would use.
 */
export type BeaconProtocol = 'eddystone_uid' | 'ibeacon';

/** One RSSI reading of one beacon at one instant. */
export interface BeaconSignal {
  /** Logical beacon identifier as registered in the CMS, e.g. BEACON_A01. */
  identifier: string;
  /** How this reading was identified. */
  protocol: BeaconProtocol;
  /**
   * Protocol-qualified identity as broadcast:
   *   eddystone_uid -> "<namespace>:<instance>"
   *   ibeacon       -> "<uuid>:<major>:<minor>"
   * Keeping it on the signal means the vendor can change without the pipeline
   * changing.
   */
  beaconId: string;
  /** Raw RSSI in dBm. Typically between -30 (very close) and -100 (far). */
  rssi: number;
  /** Transmit power advertised by the beacon, when present. */
  txPower?: number;
  /** Epoch milliseconds. */
  timestamp: number;
}

/**
 * Where beacon signals come from. The detector never knows - and never needs
 * to know - whether it is fed by real hardware or by the simulator.
 */
export interface BeaconSignalSource {
  readonly kind: 'real' | 'simulated';
  /** Human readable description shown on the Explore / Settings screens. */
  readonly description: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe(listener: (signal: BeaconSignal) => void): () => void;
}

/** Aggregated, de-noised view of one beacon over the sliding window. */
export interface BeaconStat {
  identifier: string;
  /** Smoothed RSSI in dBm - what ranking decisions are based on. */
  smoothedRssi: number;
  /** Most recent raw reading, useful for the developer screen. */
  lastRssi: number;
  sampleCount: number;
  /** Number of samples dropped as outliers in the current window. */
  outliersRemoved: number;
  lastSeen: number;
  /** Protocol of the most recent reading. */
  protocol: BeaconProtocol | null;
}

export type DetectionState = 'IDLE' | 'SCANNING' | 'CANDIDATE' | 'CONFIRMED' | 'CONTENT_ACTIVE';

/** Everything the UI (and the developer screen) needs to render. */
export interface DetectionSnapshot {
  state: DetectionState;
  candidateBeacon: string | null;
  candidateZone: string | null;
  /** 0..1 - how far the candidate is through its dwell requirement. */
  dwellProgress: number;
  confirmedBeacon: string | null;
  confirmedZone: string | null;
  confirmedAt: number | null;
  stats: BeaconStat[];
}

/** Emitted exactly once when a new zone becomes confirmed. */
export interface ZoneConfirmedEvent {
  beaconIdentifier: string;
  zoneCode: string;
  previousZoneCode: string | null;
  at: number;
  /**
   * False when the cooldown for this zone is still active, e.g. the visitor
   * stepped out and back in. The app updates state but stays quiet.
   */
  shouldNotify: boolean;
}
