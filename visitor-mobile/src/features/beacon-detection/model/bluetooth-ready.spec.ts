import { State } from 'react-native-ble-plx';
import { bluetoothIsReady } from './bluetooth-ready';

jest.mock('react-native-ble-plx', () => ({
  State: {
    Unknown: 'Unknown',
    Resetting: 'Resetting',
    Unsupported: 'Unsupported',
    Unauthorized: 'Unauthorized',
    PoweredOff: 'PoweredOff',
    PoweredOn: 'PoweredOn',
  },
}));

function monitor(initial: State) {
  let emit: (state: State) => void = () => undefined;
  const remove = jest.fn();
  const manager = {
    onStateChange: jest.fn((listener: (state: State) => void, current?: boolean) => {
      emit = listener;
      if (current) listener(initial);
      return { remove };
    }),
  };
  return { manager, remove, emit: (state: State) => emit(state) };
}

describe('Bluetooth onboarding readiness', () => {
  it('skips the app permission screen when Bluetooth is authorized and on', async () => {
    const { manager, remove } = monitor(State.PoweredOn);
    await expect(bluetoothIsReady(manager)).resolves.toBe(true);
    expect(manager.onStateChange.mock.calls[0][1]).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it.each([State.PoweredOff, State.Unauthorized, State.Unsupported])(
    'keeps the permission/help flow when the state is %s',
    async (state) => {
      const { manager, remove } = monitor(state);
      await expect(bluetoothIsReady(manager)).resolves.toBe(false);
      expect(remove).toHaveBeenCalledTimes(1);
    },
  );

  it('waits through initialization and uses the actual ready state', async () => {
    const { manager, emit, remove } = monitor(State.Unknown);
    const check = bluetoothIsReady(manager);
    emit(State.Resetting);
    expect(remove).not.toHaveBeenCalled();
    emit(State.PoweredOn);
    await expect(check).resolves.toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('shows the help flow when initialization cannot finish, and releases the listener', async () => {
    jest.useFakeTimers();
    try {
      const { manager, remove } = monitor(State.Unknown);
      const check = bluetoothIsReady(manager, 2500);
      jest.advanceTimersByTime(2500);
      await expect(check).resolves.toBe(false);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not crash the welcome flow if the native monitor is unavailable', async () => {
    const manager = {
      onStateChange: () => {
        throw new Error('Unavailable');
      },
    };
    await expect(bluetoothIsReady(manager)).resolves.toBe(false);
  });
});
