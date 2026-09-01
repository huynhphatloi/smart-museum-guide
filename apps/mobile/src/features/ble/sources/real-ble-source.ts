import { BleError, BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { readAdvertisement } from '../advertisement';
import { RegisteredBeacon, buildBeaconIndex, matchBeacon } from '../beacon-registry';
import { EDDYSTONE_SERVICE_UUID } from '../eddystone';
import { BeaconSignal, BeaconSignalSource } from '../types';

export type BleFailureReason =
  'BLUETOOTH_OFF' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'SCAN_FAILED';

export interface RealBleSourceOptions {
  /**
   * Restrict the scan to Eddystone advertisers. Set to false when the museum
   * also runs iBeacon-only hardware, since an iBeacon frame carries no service
   * UUID and would be filtered out.
   */
  eddystoneOnly?: boolean;
  onFailure?: (reason: BleFailureReason, error?: unknown) => void;
}

/**
 * Real BLE scanning through `react-native-ble-plx`.
 *
 * IMPORTANT: this requires a native build. `react-native-ble-plx` is a native
 * module and does NOT work in the standard Expo Go client - the project must be
 * run through an Expo Development Build (see README / docs/ble-detection.md).
 *
 * Identity comes from the advertised payload: Eddystone UID service data first
 * (readable on both Android and iOS), iBeacon manufacturer data second. The BLE
 * device id is never used, because it is a MAC on Android and a
 * per-installation UUID on iOS.
 *
 * The class implements exactly the same {@link BeaconSignalSource} interface as
 * the simulator, so everything downstream is identical in both modes.
 */
export class RealBleSignalSource implements BeaconSignalSource {
  readonly kind = 'real' as const;
  readonly description = 'react-native-ble-plx · Eddystone UID (requires a development build)';

  private readonly listeners = new Set<(signal: BeaconSignal) => void>();
  private index: Map<string, RegisteredBeacon>;
  private manager: BleManager | null = null;
  private stateSubscription: Subscription | null = null;
  private scanning = false;

  constructor(
    registry: readonly RegisteredBeacon[],
    private readonly options: RealBleSourceOptions = {},
  ) {
    this.index = buildBeaconIndex(registry);
  }

  /** The registry can be refreshed while the app runs (staff added a beacon). */
  setRegistry(registry: readonly RegisteredBeacon[]): void {
    this.index = buildBeaconIndex(registry);
  }

  async start(): Promise<void> {
    if (this.scanning) return;

    const manager = this.getManager();

    const state = await manager.state();
    if (state === State.Unsupported) {
      this.options.onFailure?.('UNSUPPORTED');
      return;
    }
    if (state !== State.PoweredOn) {
      this.options.onFailure?.('BLUETOOTH_OFF');
      // Keep listening: scanning starts by itself once the visitor turns
      // Bluetooth on, instead of forcing them back through the app.
      this.stateSubscription?.remove();
      this.stateSubscription = manager.onStateChange((next) => {
        if (next === State.PoweredOn) void this.beginScan();
      }, false);
      return;
    }

    await this.beginScan();
  }

  async stop(): Promise<void> {
    this.scanning = false;
    this.stateSubscription?.remove();
    this.stateSubscription = null;
    this.manager?.stopDeviceScan();
  }

  /** Releases the native manager. Call when the app is torn down. */
  destroy(): void {
    void this.stop();
    this.manager?.destroy();
    this.manager = null;
  }

  subscribe(listener: (signal: BeaconSignal) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // -------------------------------------------------------------------------

  private getManager(): BleManager {
    if (this.manager === null) this.manager = new BleManager();
    return this.manager;
  }

  private async beginScan(): Promise<void> {
    const manager = this.getManager();
    this.scanning = true;

    // Filtering by the Eddystone service UUID lets the OS drop everything else
    // before it reaches JS, which matters for battery on a long museum visit.
    const serviceUuids = this.options.eddystoneOnly === false ? null : [EDDYSTONE_SERVICE_UUID];

    manager.startDeviceScan(
      serviceUuids,
      // Museum beacons advertise continuously; duplicates are exactly what the
      // sliding window needs.
      { allowDuplicates: true },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          this.scanning = false;
          const reason: BleFailureReason =
            error.message?.toLowerCase().includes('permission') === true
              ? 'PERMISSION_DENIED'
              : 'SCAN_FAILED';
          this.options.onFailure?.(reason, error);
          return;
        }
        if (!device || device.rssi === null || device.rssi === undefined) return;

        this.handleDevice(device);
      },
    );
  }

  private handleDevice(device: Device): void {
    const identity = readAdvertisement({
      manufacturerData: device.manufacturerData,
      serviceData: device.serviceData,
    });

    // Not a beacon frame at all - a phone, headphones, the café speaker.
    if (!identity) return;

    const matched = matchBeacon(this.index, identity);
    // A beacon from another building, or one not registered in the CMS yet.
    if (!matched) return;

    this.listeners.forEach((listener) =>
      listener({
        identifier: matched.identifier,
        protocol: identity.protocol,
        beaconId: identity.beaconId,
        rssi: device.rssi as number,
        txPower: identity.txPower,
        timestamp: Date.now(),
      }),
    );
  }
}
