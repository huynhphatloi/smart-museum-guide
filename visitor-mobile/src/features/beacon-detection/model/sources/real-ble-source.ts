import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  ScanMode,
  State,
  Subscription,
} from 'react-native-ble-plx';
import { readAdvertisement } from '../advertisement';
import { bluetoothIsReady } from '../bluetooth-ready';
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
  /** A scan has started successfully, including recovery after a state change. */
  onReady?: () => void;
}

/**
 * Real BLE scanning through `react-native-ble-plx`.
 *
 * IMPORTANT: this requires a native build. `react-native-ble-plx` is a native
 * module and does NOT work in the standard Expo Go client - the project must be
 * run through an Expo Development Build (see "Mobile app and BLE" in the README).
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
  private active = false;
  private scanGeneration = 0;

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

  /** Check using the same native manager as scanning; do not prompt twice. */
  isBluetoothReady(): Promise<boolean> {
    return bluetoothIsReady(this.getManager());
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;

    // Subscribe before reading the initial state. iOS commonly starts at
    // Unknown while Core Bluetooth initializes or shows its permission prompt.
    this.stateSubscription = this.getManager().onStateChange((state) => {
      if (!this.active) return;
      if (state === State.PoweredOn) {
        void this.beginScan();
        return;
      }

      this.scanGeneration += 1;
      if (this.scanning) void this.manager?.stopDeviceScan().catch(() => undefined);
      this.scanning = false;
      if (state === State.PoweredOff) this.options.onFailure?.('BLUETOOTH_OFF');
      if (state === State.Unauthorized) this.options.onFailure?.('PERMISSION_DENIED');
      if (state === State.Unsupported) this.options.onFailure?.('UNSUPPORTED');
      // Unknown/Resetting are transitional states, not evidence of a failure.
    }, true);
  }

  async stop(): Promise<void> {
    this.active = false;
    this.scanning = false;
    this.scanGeneration += 1;
    this.stateSubscription?.remove();
    this.stateSubscription = null;
    await this.manager?.stopDeviceScan().catch(() => undefined);
  }

  /** Releases the native manager. Call when the app is torn down. */
  destroy(): void {
    const manager = this.manager;
    void this.stop()
      .then(() => manager?.destroy())
      .catch(() => undefined);
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
    if (!this.active || this.scanning) return;
    const manager = this.getManager();
    this.scanning = true;
    const generation = ++this.scanGeneration;
    const current = () => this.active && generation === this.scanGeneration;
    const fail = (error: unknown) => {
      if (!current()) return;
      this.scanning = false;
      this.scanGeneration += 1;
      const code = (error as BleError | null)?.errorCode;
      const reason: BleFailureReason =
        code === BleErrorCode.BluetoothUnauthorized
          ? 'PERMISSION_DENIED'
          : code === BleErrorCode.BluetoothPoweredOff
            ? 'BLUETOOTH_OFF'
            : code === BleErrorCode.BluetoothUnsupported
              ? 'UNSUPPORTED'
              : 'SCAN_FAILED';
      this.options.onFailure?.(reason, error);
    };

    const serviceUuids = this.options.eddystoneOnly === false ? null : [EDDYSTONE_SERVICE_UUID];
    try {
      await manager.startDeviceScan(
        serviceUuids,
        { allowDuplicates: true, scanMode: ScanMode.LowLatency },
        (error: BleError | null, device: Device | null) => {
          if (!current()) return;
          if (error) {
            fail(error);
            return;
          }
          if (!device || device.rssi === null || device.rssi === undefined) return;
          this.handleDevice(device);
        },
      );
      if (current() && this.scanning) this.options.onReady?.();
    } catch (error) {
      fail(error);
    }
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
