import { beaconIdsFor, RegisteredBeacon } from '../beacon-registry';
import { BeaconProtocol, BeaconSignal, BeaconSignalSource } from '../types';

export interface SimulatedBeaconState {
  identifier: string;
  /** The RSSI the developer screen is currently dialling in. */
  rssi: number;
  enabled: boolean;
  /** Which protocol this simulated beacon pretends to advertise. */
  protocol: BeaconProtocol;
  /** The identity it broadcasts, exactly as the real hardware would. */
  beaconId: string;
  /** Configured transmit power, mirrored from the registry. */
  txPower?: number;
}

export interface SimulatedSourceOptions {
  /** How often a simulated advertisement is emitted, per beacon. */
  emitIntervalMs?: number;
  /**
   * Random jitter added to every emitted sample, in dB. Real BLE is never
   * perfectly stable, and the smoothing stage should be exercised.
   */
  jitterDb?: number;
  /** Injectable for deterministic tests. */
  now?: () => number;
  random?: () => number;
}

/**
 * Builds simulated beacons straight from the museum's real registry, so the
 * simulator advertises the same protocol and the same namespace/instance the
 * hardware would.
 */
export function simulatedBeaconsFromRegistry(
  registry: readonly RegisteredBeacon[],
  rssiFor: (beacon: RegisteredBeacon, index: number) => number,
): SimulatedBeaconState[] {
  return registry.map((beacon, index) => {
    const ids = beaconIdsFor(beacon);
    const usesEddystone = Boolean(beacon.namespaceId && beacon.instanceId);

    return {
      identifier: beacon.identifier,
      rssi: rssiFor(beacon, index),
      enabled: true,
      protocol: usesEddystone ? 'eddystone_uid' : 'ibeacon',
      beaconId: ids[0] ?? beacon.identifier.toLowerCase(),
      txPower: beacon.txPower ?? undefined,
    };
  });
}

/**
 * Feeds hand-dialled RSSI values into the *real* pipeline.
 *
 * This is not a mock navigation flow: signals produced here go through exactly
 * the same SignalProcessor and BeaconZoneDetector as hardware readings, which
 * is what makes the algorithm demonstrable without physical beacons.
 */
export class SimulatedBleSignalSource implements BeaconSignalSource {
  readonly kind = 'simulated' as const;
  readonly description = 'Simulated beacons (developer mode)';

  private readonly listeners = new Set<(signal: BeaconSignal) => void>();
  private readonly beacons = new Map<string, SimulatedBeaconState>();
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly emitIntervalMs: number;
  private readonly jitterDb: number;
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(initial: SimulatedBeaconState[] = [], options: SimulatedSourceOptions = {}) {
    this.emitIntervalMs = options.emitIntervalMs ?? 500;
    this.jitterDb = options.jitterDb ?? 2;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    initial.forEach((beacon) => this.beacons.set(beacon.identifier, { ...beacon }));
  }

  async start(): Promise<void> {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.emitOnce(), this.emitIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(listener: (signal: BeaconSignal) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- developer controls --------------------------------------------------

  setBeacons(beacons: SimulatedBeaconState[]): void {
    this.beacons.clear();
    beacons.forEach((beacon) => this.beacons.set(beacon.identifier, { ...beacon }));
  }

  setRssi(identifier: string, rssi: number): void {
    const existing = this.beacons.get(identifier);
    if (!existing) return;
    this.beacons.set(identifier, { ...existing, rssi });
  }

  setEnabled(identifier: string, enabled: boolean): void {
    const existing = this.beacons.get(identifier);
    if (!existing) return;
    this.beacons.set(identifier, { ...existing, enabled });
  }

  list(): SimulatedBeaconState[] {
    return [...this.beacons.values()];
  }

  /** Emits one round of advertisements immediately (also used by tests). */
  emitOnce(): void {
    const timestamp = this.now();
    for (const beacon of this.beacons.values()) {
      if (!beacon.enabled) continue;
      const jitter = (this.random() * 2 - 1) * this.jitterDb;
      const signal: BeaconSignal = {
        identifier: beacon.identifier,
        protocol: beacon.protocol,
        beaconId: beacon.beaconId,
        rssi: Math.round((beacon.rssi + jitter) * 10) / 10,
        txPower: beacon.txPower,
        timestamp,
      };
      this.listeners.forEach((listener) => listener(signal));
    }
  }
}
