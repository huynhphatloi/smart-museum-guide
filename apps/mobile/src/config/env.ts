import Constants from 'expo-constants';

const readString = (key: string, fallback: string): string => {
  const fromProcess = process.env[key];
  if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = extra[key];
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;

  return fallback;
};

const readNumber = (key: string, fallback: number): number => {
  const value = Number(readString(key, ''));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const value = readString(key, '').toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
};

/**
 * All runtime configuration in one place.
 *
 * Nothing about BLE calibration is hard coded in a component: the values below
 * are starting points for a specific building and are meant to be re-measured,
 * not treated as constants of nature.
 */
export const env = {
  /** Must be reachable from the phone - `localhost` will NOT work on a device. */
  apiUrl: readString('EXPO_PUBLIC_API_URL', 'http://localhost:3001/api'),

  /** When true the app feeds the pipeline from the developer simulator. */
  bleSimulation: readBoolean('EXPO_PUBLIC_BLE_SIMULATION', true),

  defaultLanguage: readString('EXPO_PUBLIC_DEFAULT_LANGUAGE', 'vi'),

  ble: {
    /** Length of the RSSI sliding window. */
    scanWindowMs: readNumber('EXPO_PUBLIC_SCAN_WINDOW_MS', 4000),
    /** How long a challenger must stay dominant before the zone changes. */
    dwellTimeMs: readNumber('EXPO_PUBLIC_DWELL_TIME_MS', 3000),
    /** How much stronger a challenger must be than the current zone, in dB. */
    hysteresisDb: readNumber('EXPO_PUBLIC_HYSTERESIS_DB', 4),
    /** Beacons weaker than this are considered "another room". */
    minRssi: -Math.abs(readNumber('EXPO_PUBLIC_MIN_RSSI', 95)),
    /** Quiet period before the same zone may prompt the visitor again. */
    notificationCooldownMs: readNumber('EXPO_PUBLIC_COOLDOWN_MS', 60_000),
    /** How often the pipeline re-ranks beacons. */
    tickIntervalMs: readNumber('EXPO_PUBLIC_TICK_INTERVAL_MS', 500),
  },
} as const;
