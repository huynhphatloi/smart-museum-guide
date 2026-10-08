import { BleErrorCode, BleManager, State } from 'react-native-ble-plx';
import { RegisteredBeacon } from '../beacon-registry';
import { RealBleSignalSource } from './real-ble-source';

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn(),
  State: {
    Unknown: 'Unknown',
    Resetting: 'Resetting',
    Unsupported: 'Unsupported',
    Unauthorized: 'Unauthorized',
    PoweredOff: 'PoweredOff',
    PoweredOn: 'PoweredOn',
  },
  ScanMode: { LowLatency: 2 },
  BleErrorCode: { BluetoothUnsupported: 100, BluetoothUnauthorized: 101, BluetoothPoweredOff: 102 },
}));

const beacon: RegisteredBeacon = {
  identifier: 'MINEW_I3_F133',
  name: 'Minew i3',
  protocol: 'EDDYSTONE_UID',
  namespaceId: '00112233445566778899',
  instanceId: 'abcde82b03b0',
  uuid: null,
  major: null,
  minor: null,
  txPower: -24,
  advertisingIntervalMs: null,
  minRssi: null,
  zoneCode: 'ZONE_A01',
  zoneName: 'A01',
};

function setup(initial = State.Unknown) {
  let stateListener: (state: State) => void = () => undefined;
  const remove = jest.fn();
  const manager = {
    onStateChange: jest.fn((listener: (state: State) => void, emitCurrent: boolean) => {
      stateListener = listener;
      let removed = false;
      if (emitCurrent)
        Promise.resolve().then(() => {
          if (!removed) listener(initial);
        });
      return {
        remove: () => {
          removed = true;
          remove();
        },
      };
    }),
    startDeviceScan: jest.fn().mockResolvedValue(undefined),
    stopDeviceScan: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  (BleManager as unknown as jest.Mock).mockImplementation(() => manager);
  const onFailure = jest.fn();
  const onReady = jest.fn();
  const source = new RealBleSignalSource([beacon], { onFailure, onReady });
  return {
    source,
    manager,
    onFailure,
    onReady,
    remove,
    state: (state: State) => stateListener(state),
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('RealBleSignalSource iOS startup and recovery', () => {
  it('uses one native manager for the readiness check and the actual scan', async () => {
    const { source, manager, onReady } = setup(State.PoweredOn);
    const before = (BleManager as unknown as jest.Mock).mock.calls.length;
    await expect(source.isBluetoothReady()).resolves.toBe(true);
    expect(manager.startDeviceScan).not.toHaveBeenCalled();
    await source.start();
    await settle();
    expect((BleManager as unknown as jest.Mock).mock.calls.length - before).toBe(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    await source.stop();
  });

  it('waits for Unknown/Resetting without claiming Bluetooth is off', async () => {
    const { source, state, manager, onFailure, onReady } = setup();
    await source.start();
    state(State.Resetting);
    expect(onFailure).not.toHaveBeenCalled();
    expect(manager.startDeviceScan).not.toHaveBeenCalled();
    state(State.PoweredOn);
    await settle();
    expect(manager.onStateChange.mock.calls[0][1]).toBe(true);
    expect(manager.startDeviceScan).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    await source.stop();
  });

  it('scans an already-powered-on manager from the initial state emission', async () => {
    const { source, manager, onReady } = setup(State.PoweredOn);
    await source.start();
    await settle();
    expect(manager.startDeviceScan).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    await source.stop();
  });

  it.each([
    [State.PoweredOff, 'BLUETOOTH_OFF'],
    [State.Unauthorized, 'PERMISSION_DENIED'],
    [State.Unsupported, 'UNSUPPORTED'],
  ])('reports %s accurately and recovers when Bluetooth becomes ready', async (initial, reason) => {
    const { source, state, onFailure, onReady } = setup(initial as State);
    await source.start();
    expect(onFailure).toHaveBeenCalledWith(reason);
    state(State.PoweredOn);
    await settle();
    expect(onReady).toHaveBeenCalledTimes(1);
    await source.stop();
  });

  it('stops on power loss and resumes once, without duplicate scan listeners', async () => {
    const { source, state, manager, onReady } = setup(State.PoweredOn);
    await source.start();
    await settle();
    state(State.PoweredOn);
    expect(manager.startDeviceScan).toHaveBeenCalledTimes(1);
    state(State.PoweredOff);
    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(1);
    state(State.PoweredOn);
    await settle();
    expect(manager.startDeviceScan).toHaveBeenCalledTimes(2);
    expect(onReady).toHaveBeenCalledTimes(2);
    await source.stop();
  });

  it('does not restart from a late state callback after the user stops', async () => {
    const { source, state, manager, remove } = setup();
    await source.start();
    await source.stop();
    state(State.PoweredOn);
    await settle();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(manager.startDeviceScan).not.toHaveBeenCalled();
  });

  it('does not mark a pending scan ready after the user stops', async () => {
    const { source, state, manager, onReady } = setup();
    let finish: () => void = () => undefined;
    manager.startDeviceScan.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await source.start();
    state(State.PoweredOn);
    await source.stop();
    finish();
    await settle();
    expect(onReady).not.toHaveBeenCalled();
  });

  it('catches native scan rejection by error code and supports an explicit retry', async () => {
    const { source, manager, onReady, onFailure } = setup(State.PoweredOn);
    manager.startDeviceScan.mockRejectedValueOnce({
      errorCode: BleErrorCode.BluetoothUnauthorized,
    });
    await source.start();
    await settle();
    expect(onFailure).toHaveBeenCalledWith('PERMISSION_DENIED', expect.any(Object));
    expect(onReady).not.toHaveBeenCalled();
    await source.stop();
    // A new subscription emits the current state after an explicit retry.
    manager.onStateChange.mockImplementation((listener, emitCurrent) => {
      if (emitCurrent) Promise.resolve().then(() => listener(State.PoweredOn));
      return { remove: jest.fn() };
    });
    await source.start();
    await settle();
    expect(onReady).toHaveBeenCalledTimes(1);
    await source.stop();
  });

  it('matches the real Minew UID and discards callbacks from a stopped scan', async () => {
    const { source, manager } = setup(State.PoweredOn);
    const signals = jest.fn();
    source.subscribe(signals);
    await source.start();
    await settle();
    const callback = manager.startDeviceScan.mock.calls[0][2];
    const frame = Buffer.from('00e800112233445566778899abcde82b03b00000', 'hex').toString('base64');
    const device = { rssi: -62, serviceData: { feaa: frame } };
    callback(null, device);
    expect(signals).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'MINEW_I3_F133', rssi: -62 }),
    );
    await source.stop();
    callback(null, device);
    expect(signals).toHaveBeenCalledTimes(1);
  });

  it('does not clear an error when the scan callback fails before startup resolves', async () => {
    const { source, manager, onFailure, onReady } = setup(State.PoweredOn);
    manager.startDeviceScan.mockImplementation((_uuids, _options, callback) => {
      callback({ errorCode: BleErrorCode.BluetoothPoweredOff }, null);
      return Promise.resolve();
    });
    await source.start();
    await settle();
    expect(onFailure).toHaveBeenCalledWith('BLUETOOTH_OFF', expect.any(Object));
    expect(onReady).not.toHaveBeenCalled();
    await source.stop();
  });
});
