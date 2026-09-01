import { RegisteredBeacon, buildMinRssiLookup, buildZoneLookup } from './beacon-registry';
import { DEFAULT_SIGNAL_CONFIG, SignalProcessor, SignalProcessorConfig } from './signal-processor';
import { BeaconSignalSource, DetectionSnapshot, ZoneConfirmedEvent } from './types';
import { BeaconZoneDetector, DEFAULT_DETECTOR_CONFIG, ZoneDetectorConfig } from './zone-detector';

export interface ScannerConfig extends SignalProcessorConfig, ZoneDetectorConfig {
  /** How often the pipeline re-evaluates the ranking. */
  tickIntervalMs: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  ...DEFAULT_SIGNAL_CONFIG,
  ...DEFAULT_DETECTOR_CONFIG,
  tickIntervalMs: 500,
};

/**
 * Wires a signal source (real or simulated) to the processing pipeline and
 * pushes results out to the UI.
 *
 * The React layer only ever talks to this class - it never touches BLE, RSSI
 * windows or the state machine directly, which keeps the algorithm out of
 * components and inside testable modules.
 */
export class BeaconScanner {
  private readonly processor: SignalProcessor;
  private readonly detector: BeaconZoneDetector;
  private unsubscribeSource: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly snapshotListeners = new Set<(snapshot: DetectionSnapshot) => void>();
  private readonly zoneListeners = new Set<(event: ZoneConfirmedEvent) => void>();

  constructor(
    private source: BeaconSignalSource,
    registry: readonly RegisteredBeacon[],
    private config: ScannerConfig = DEFAULT_SCANNER_CONFIG,
  ) {
    this.processor = new SignalProcessor(config);
    this.detector = new BeaconZoneDetector(
      buildZoneLookup(registry),
      config,
      buildMinRssiLookup(registry),
    );
  }

  get sourceKind(): 'real' | 'simulated' {
    return this.source.kind;
  }

  get sourceDescription(): string {
    return this.source.description;
  }

  getConfig(): ScannerConfig {
    return this.config;
  }

  updateDetectorConfig(patch: Partial<ZoneDetectorConfig>): void {
    this.config = { ...this.config, ...patch };
    this.detector.updateConfig(patch);
  }

  onSnapshot(listener: (snapshot: DetectionSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  onZoneConfirmed(listener: (event: ZoneConfirmedEvent) => void): () => void {
    this.zoneListeners.add(listener);
    return () => {
      this.zoneListeners.delete(listener);
    };
  }

  async start(): Promise<void> {
    if (this.timer !== null) return;

    this.detector.start();
    this.unsubscribeSource = this.source.subscribe((signal) => this.processor.ingest(signal));
    await this.source.start();

    this.timer = setInterval(() => this.tick(Date.now()), this.config.tickIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribeSource?.();
    this.unsubscribeSource = null;
    await this.source.stop();
    this.processor.reset();
    this.detector.stop();
    this.emitSnapshot(Date.now());
  }

  /** Clears "already announced" state, e.g. when a new tour starts. */
  resetCooldowns(): void {
    this.detector.resetCooldowns();
  }

  /** One pipeline pass. Exposed so tests can drive it with a virtual clock. */
  tick(now: number): void {
    const stats = this.processor.snapshot(now);
    const event = this.detector.update(stats, now);
    this.emitSnapshot(now);
    if (event) this.zoneListeners.forEach((listener) => listener(event));
  }

  private emitSnapshot(now: number): void {
    const snapshot = this.detector.snapshotAt(now);
    this.snapshotListeners.forEach((listener) => listener(snapshot));
  }
}
