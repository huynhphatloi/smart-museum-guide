import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, api } from '../../../shared/api/client';
import { ActiveExhibitResponse } from '../../../shared/api/types';
import { env } from '../../../shared/config/env';
import { RegisteredBeacon, findZoneName } from '../../beacon-detection/model/beacon-registry';
import { BeaconScanner, DEFAULT_SCANNER_CONFIG } from '../../beacon-detection/model/scanner';
import { RealBleSignalSource } from '../../beacon-detection/model/sources/real-ble-source';
import {
  SimulatedBleSignalSource,
  simulatedBeaconsFromRegistry,
} from '../../beacon-detection/model/sources/simulated-ble-source';
import { DetectionSnapshot, ZoneConfirmedEvent } from '../../beacon-detection/model/types';

const STORAGE_LANGUAGE = 'museum.language';
const STORAGE_AUTO_GUIDE = 'museum.autoGuide';

export interface ZonePrompt {
  zoneCode: string;
  zoneName: string;
  at: number;
}

interface GuideContextValue {
  ready: boolean;
  language: string;
  supportedLanguages: string[];
  setLanguage: (language: string) => void;

  registryError: string | null;

  scanning: boolean;
  bleError: string | null;
  snapshot: DetectionSnapshot;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;

  autoGuide: boolean;
  setAutoGuide: (value: boolean) => void;

  exhibit: ActiveExhibitResponse | null;
  exhibitLoading: boolean;
  exhibitError: ApiError | null;
  prompt: ZonePrompt | null;
  dismissPrompt: () => void;

  /** QR / manual entry path. Uses the same backend resolution as BLE. */
  openZone: (zoneCode: string) => Promise<void>;
  reloadExhibit: () => Promise<void>;
}

const EMPTY_SNAPSHOT: DetectionSnapshot = {
  state: 'IDLE',
  candidateBeacon: null,
  candidateZone: null,
  dwellProgress: 0,
  confirmedBeacon: null,
  confirmedZone: null,
  confirmedAt: null,
  stats: [],
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide(): GuideContextValue {
  const context = useContext(GuideContext);
  if (!context) throw new Error('useGuide must be used inside <GuideProvider>.');
  return context;
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState(env.defaultLanguage);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['vi', 'en']);
  const [autoGuide, setAutoGuideState] = useState(true);

  const [registry, setRegistry] = useState<RegisteredBeacon[]>([]);
  const [registryError, setRegistryError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DetectionSnapshot>(EMPTY_SNAPSHOT);

  const [exhibit, setExhibit] = useState<ActiveExhibitResponse | null>(null);
  const [exhibitLoading, setExhibitLoading] = useState(false);
  const [exhibitError, setExhibitError] = useState<ApiError | null>(null);
  const [prompt, setPrompt] = useState<ZonePrompt | null>(null);
  const scannerRef = useRef<BeaconScanner | null>(null);
  const realSourceRef = useRef<RealBleSignalSource | null>(null);
  const languageRef = useRef(language);
  const autoGuideRef = useRef(autoGuide);

  languageRef.current = language;
  autoGuideRef.current = autoGuide;

  // --- bootstrap -----------------------------------------------------------

  const reloadRegistry = useCallback(async () => {
    try {
      const beacons = await api.beacons();
      setRegistry(beacons);
      setRegistryError(null);
      realSourceRef.current?.setRegistry(beacons);
    } catch (error) {
      setRegistryError(
        error instanceof ApiError ? error.message : 'Could not load the beacon list.',
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedLanguage, storedAutoGuide] = await Promise.all([
        AsyncStorage.getItem(STORAGE_LANGUAGE),
        AsyncStorage.getItem(STORAGE_AUTO_GUIDE),
      ]);

      if (cancelled) return;
      if (storedLanguage) setLanguageState(storedLanguage);
      if (storedAutoGuide !== null) setAutoGuideState(storedAutoGuide === 'true');

      try {
        const languages = await api.languages();
        if (!cancelled) {
          setSupportedLanguages(languages.supported);
          if (!storedLanguage) setLanguageState(languages.default);
        }
      } catch {
        // The museum server may be unreachable at startup - the app still
        // works offline enough to explain what is wrong.
      }

      await reloadRegistry();
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadRegistry]);

  // --- content resolution --------------------------------------------------

  const loadExhibitForBeacon = useCallback(async (identifier: string) => {
    setExhibitLoading(true);
    setExhibitError(null);
    try {
      const result = await api.activeExhibitForBeacon(identifier, languageRef.current);
      setExhibit(result);
    } catch (error) {
      setExhibit(null);
      setExhibitError(
        error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
      );
    } finally {
      setExhibitLoading(false);
    }
  }, []);

  const openZone = useCallback(async (zoneCode: string) => {
    setExhibitLoading(true);
    setExhibitError(null);
    try {
      const result = await api.activeExhibitForZone(zoneCode, languageRef.current);
      setExhibit(result);
    } catch (error) {
      setExhibit(null);
      setExhibitError(
        error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
      );
    } finally {
      setExhibitLoading(false);
    }
  }, []);

  const reloadExhibit = useCallback(async () => {
    const beacon = snapshot.confirmedBeacon;
    if (beacon) return loadExhibitForBeacon(beacon);
    if (exhibit) return openZone(exhibit.zone.code);
  }, [snapshot.confirmedBeacon, exhibit, loadExhibitForBeacon, openZone]);

  // Re-fetch the current content whenever the visitor switches language.
  useEffect(() => {
    if (!ready) return;
    if (snapshot.confirmedBeacon) {
      void loadExhibitForBeacon(snapshot.confirmedBeacon);
    } else if (exhibit) {
      void openZone(exhibit.zone.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // --- scanner -------------------------------------------------------------

  const handleZoneConfirmed = useCallback(
    (event: ZoneConfirmedEvent, beacons: RegisteredBeacon[]) => {
      void loadExhibitForBeacon(event.beaconIdentifier);

      // The cooldown lives in the detector: `shouldNotify` is already false
      // when the visitor has just been here.
      if (event.shouldNotify && autoGuideRef.current) {
        setPrompt({
          zoneCode: event.zoneCode,
          zoneName: findZoneName(beacons, event.zoneCode) ?? event.zoneCode,
          at: event.at,
        });
      }
    },
    [loadExhibitForBeacon],
  );

  const startScanning = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.start();
      setScanning(true);
      return;
    }

    if (registry.length === 0) {
      setBleError('No beacons are registered yet. Check the API connection.');
      return;
    }

    const config = {
      ...DEFAULT_SCANNER_CONFIG,
      scanWindowMs: env.ble.scanWindowMs,
      dwellTimeMs: env.ble.dwellTimeMs,
      hysteresisDb: env.ble.hysteresisDb,
      minRssi: env.ble.minRssi,
      notificationCooldownMs: env.ble.notificationCooldownMs,
      tickIntervalMs: env.ble.tickIntervalMs,
    };

    let source;
    if (env.bleSimulation) {
      const simulated = new SimulatedBleSignalSource(
        // Built from the museum's real registry, so the simulator advertises
        // the same protocol and namespace/instance the hardware would.
        simulatedBeaconsFromRegistry(registry, (_beacon, index) => (index === 0 ? -62 : -88)),
      );
      source = simulated;
    } else {
      const real = new RealBleSignalSource(registry, {
        onFailure: (reason) => {
          setBleError(
            reason === 'BLUETOOTH_OFF'
              ? 'Bluetooth is turned off. Turn it on to use the automatic guide.'
              : reason === 'PERMISSION_DENIED'
                ? 'Bluetooth permission was denied. You can still use QR codes.'
                : reason === 'UNSUPPORTED'
                  ? 'This device does not support Bluetooth Low Energy.'
                  : 'Bluetooth scanning failed. You can still use QR codes.',
          );
          setScanning(false);
        },
      });
      realSourceRef.current = real;
      source = real;
    }

    const scanner = new BeaconScanner(source, registry, config);
    scanner.onSnapshot(setSnapshot);
    scanner.onZoneConfirmed((event) => handleZoneConfirmed(event, registry));
    scannerRef.current = scanner;

    setBleError(null);
    await scanner.start();
    setScanning(true);
  }, [registry, handleZoneConfirmed]);

  const stopScanning = useCallback(async () => {
    await scannerRef.current?.stop();
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop();
      realSourceRef.current?.destroy();
    };
  }, []);

  // --- preferences ---------------------------------------------------------

  const setLanguage = useCallback((next: string) => {
    setLanguageState(next);
    void AsyncStorage.setItem(STORAGE_LANGUAGE, next);
  }, []);

  const setAutoGuide = useCallback((value: boolean) => {
    setAutoGuideState(value);
    void AsyncStorage.setItem(STORAGE_AUTO_GUIDE, String(value));
  }, []);

  const value = useMemo<GuideContextValue>(
    () => ({
      ready,
      language,
      supportedLanguages,
      setLanguage,
      registryError,
      scanning,
      bleError,
      snapshot,
      startScanning,
      stopScanning,
      autoGuide,
      setAutoGuide,
      exhibit,
      exhibitLoading,
      exhibitError,
      prompt,
      dismissPrompt: () => setPrompt(null),
      openZone,
      reloadExhibit,
    }),
    [
      ready,
      language,
      supportedLanguages,
      setLanguage,
      registryError,
      scanning,
      bleError,
      snapshot,
      startScanning,
      stopScanning,
      autoGuide,
      setAutoGuide,
      exhibit,
      exhibitLoading,
      exhibitError,
      prompt,
      openZone,
      reloadExhibit,
    ],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
