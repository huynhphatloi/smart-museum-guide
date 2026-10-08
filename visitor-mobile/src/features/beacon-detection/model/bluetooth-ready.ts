import { State, Subscription } from 'react-native-ble-plx';

type StateMonitor = {
  onStateChange: (listener: (state: State) => void, emitCurrentState?: boolean) => Subscription;
};

/** PoweredOn includes iOS authorization. Unknown/Resetting need a later update. */
export function bluetoothIsReady(manager: StateMonitor, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: Subscription | undefined;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(ready);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    try {
      subscription = manager.onStateChange((state) => {
        if (state === State.PoweredOn) finish(true);
        else if (state !== State.Unknown && state !== State.Resetting) finish(false);
      }, true);
      // Some adapters emit their state synchronously while subscribing.
      if (settled) subscription.remove();
    } catch {
      finish(false);
    }
  });
}
