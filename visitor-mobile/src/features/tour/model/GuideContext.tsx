import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
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
import { ActiveExhibitResponse, LanguageOption } from '../../../shared/api/types';
import { env } from '../../../shared/config/env';
import { t } from '../../../shared/i18n';
import { RegisteredBeacon, findZoneName } from '../../beacon-detection/model/beacon-registry';
import { BeaconScanner, DEFAULT_SCANNER_CONFIG } from '../../beacon-detection/model/scanner';
import { RealBleSignalSource } from '../../beacon-detection/model/sources/real-ble-source';
import {
  SimulatedBleSignalSource,
  simulatedBeaconsFromRegistry,
} from '../../beacon-detection/model/sources/simulated-ble-source';
import { DetectionSnapshot, ZoneConfirmedEvent } from '../../beacon-detection/model/types';
import {
  FALLBACK_LANGUAGE_CODES,
  languageOptionsFrom,
  optionsForCodes,
  parseStoredLanguageOptions,
} from '../../preferences/model/language-options';

const STORAGE_LANGUAGE = 'museum.language';
const STORAGE_AUTO_GUIDE = 'museum.autoGuide';
/** Last language list from the server, so the picker stays complete when offline. */
const STORAGE_LANGUAGE_OPTIONS = 'museum.languageOptions';

export interface ZonePrompt {
  zoneCode: string;
  zoneName: string;
  at: number;
}

interface GuideContextValue {
  ready: boolean;
  language: string;
  /** The languages the museum offers - those its AI service can translate and narrate. */
  languageOptions: LanguageOption[];
  setLanguage: (language: string) => void;

  registryError: string | null;
  /** The museum's beacon registry, as downloaded at startup. */
  registry: RegisteredBeacon[];
  /** Downloads the registry again and applies it to the running scanner. */
  reloadRegistry: () => Promise<void>;

  scanning: boolean;
  bleError: string | null;
  snapshot: DetectionSnapshot;
  startScanning: () => Promise<void>;
  bluetoothReady: () => Promise<boolean>;
  stopScanning: () => Promise<void>;
  /**
   * The running pipeline, for features that listen to the same signals
   * (indoor positioning, zone notifications). Null until scanning first starts.
   */
  scanner: BeaconScanner | null;
  /** The simulator feeding the pipeline, when running in simulation mode. */
  simulator: SimulatedBleSignalSource | null;

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
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>(() =>
    optionsForCodes(FALLBACK_LANGUAGE_CODES),
  );
  const [autoGuide, setAutoGuideState] = useState(true);

  const [registry, setRegistry] = useState<RegisteredBeacon[]>([]);
  const [registryError, setRegistryError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DetectionSnapshot>(EMPTY_SNAPSHOT);
  const [activeScanner, setActiveScanner] = useState<BeaconScanner | null>(null);
  const [simulator, setSimulator] = useState<SimulatedBleSignalSource | null>(null);

  const [exhibit, setExhibit] = useState<ActiveExhibitResponse | null>(null);
  const [exhibitLoading, setExhibitLoading] = useState(false);
  const [exhibitError, setExhibitError] = useState<ApiError | null>(null);
  const [exhibitReceivedAt, setExhibitReceivedAt] = useState(0);
  const [prompt, setPrompt] = useState<ZonePrompt | null>(null);
  const scannerRef = useRef<BeaconScanner | null>(null);
  const realSourceRef = useRef<RealBleSignalSource | null>(null);
  const lastExhibitRequest = useRef<
    { kind: 'beacon'; identifier: string } | { kind: 'zone'; code: string } | null
  >(null);
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
      scannerRef.current?.setRegistry(beacons);
    } catch {
      setRegistryError(t(languageRef.current, 'beaconListError'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedLanguage, storedAutoGuide, storedOptions] = await Promise.all([
        AsyncStorage.getItem(STORAGE_LANGUAGE),
        AsyncStorage.getItem(STORAGE_AUTO_GUIDE),
        AsyncStorage.getItem(STORAGE_LANGUAGE_OPTIONS),
      ]);

      if (cancelled) return;
      if (storedLanguage) setLanguageState(storedLanguage);
      if (storedAutoGuide !== null) setAutoGuideState(storedAutoGuide === 'true');
      const cachedOptions = parseStoredLanguageOptions(storedOptions);
      if (cachedOptions) setLanguageOptions(cachedOptions);

      try {
        const languages = await api.languages();
        if (!cancelled) {
          const options = languageOptionsFrom(languages);
          setLanguageOptions(options);
          void AsyncStorage.setItem(STORAGE_LANGUAGE_OPTIONS, JSON.stringify(options));
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
    lastExhibitRequest.current = { kind: 'beacon', identifier };
    setExhibitLoading(true);
    setExhibitError(null);
    try {
      const result = await api.activeExhibitForBeacon(identifier, languageRef.current);
      setExhibit(result);
      setExhibitReceivedAt(Date.now());
    } catch (error) {
      setExhibit(null);
      setExhibitReceivedAt(Date.now());
      setExhibitError(
        error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
      );
    } finally {
      setExhibitLoading(false);
    }
  }, []);

  const openZone = useCallback(async (zoneCode: string) => {
    lastExhibitRequest.current = { kind: 'zone', code: zoneCode };
    setExhibitLoading(true);
    setExhibitError(null);
    try {
      const result = await api.activeExhibitForZone(zoneCode, languageRef.current);
      setExhibit(result);
      setExhibitReceivedAt(Date.now());
    } catch (error) {
      setExhibit(null);
      setExhibitReceivedAt(Date.now());
      setExhibitError(
        error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
      );
    } finally {
      setExhibitLoading(false);
    }
  }, []);

  const reloadExhibit = useCallback(async () => {
    const request = lastExhibitRequest.current;
    if (request?.kind === 'beacon') return loadExhibitForBeacon(request.identifier);
    if (request?.kind === 'zone') return openZone(request.code);
  }, [loadExhibitForBeacon, openZone]);

  // Keep the audio player mounted during background checks and ignore a stale
  // response if the visitor moved to another zone or switched language.
  const refreshExhibit = useCallback(async () => {
    const request = lastExhibitRequest.current;
    const requestedLanguage = languageRef.current;
    if (!request) return;
    try {
      const result =
        request.kind === 'beacon'
          ? await api.activeExhibitForBeacon(request.identifier, requestedLanguage)
          : await api.activeExhibitForZone(request.code, requestedLanguage);
      if (lastExhibitRequest.current !== request || languageRef.current !== requestedLanguage)
        return;
      setExhibit(result);
      setExhibitError(null);
      setExhibitReceivedAt(Date.now());
    } catch (error) {
      if (lastExhibitRequest.current !== request || languageRef.current !== requestedLanguage)
        return;
      if (error instanceof ApiError && error.code !== 'NETWORK_ERROR') {
        setExhibit(null);
        setExhibitError(error);
      }
      setExhibitReceivedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!ready || !lastExhibitRequest.current || exhibitLoading) return;
    const next =
      exhibit?.nextChangeAt ?? exhibit?.assignment.activeTo ?? exhibitError?.details?.nextChangeAt;
    const resolved = exhibit?.resolvedAt ?? exhibitError?.details?.resolvedAt;
    const delay =
      next && resolved
        ? Date.parse(next) - Date.parse(resolved) - (Date.now() - exhibitReceivedAt) + 150
        : 30_000;
    const timer = setTimeout(
      () => {
        if (AppState.currentState === 'active') void refreshExhibit();
      },
      Math.min(30_000, Math.max(1000, delay)),
    );
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshExhibit();
    });
    return () => {
      clearTimeout(timer);
      listener.remove();
    };
  }, [ready, exhibit, exhibitError, exhibitLoading, exhibitReceivedAt, refreshExhibit]);

  // Re-fetch the current content whenever the visitor switches language.
  useEffect(() => {
    if (!ready) return;
    void reloadExhibit();
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

  const getRealSource = useCallback(() => {
    if (!realSourceRef.current) {
      const real = new RealBleSignalSource(registry, {
        onReady: () => {
          setBleError(null);
          setScanning(true);
        },
        onFailure: (reason) => {
          const key =
            reason === 'BLUETOOTH_OFF'
              ? 'bluetoothOff'
              : reason === 'PERMISSION_DENIED'
                ? 'bluetoothDenied'
                : reason === 'UNSUPPORTED'
                  ? 'bluetoothUnsupported'
                  : 'bluetoothFailed';
          setBleError(t(languageRef.current, key));
          setScanning(false);
        },
      });
      realSourceRef.current = real;
    }
    realSourceRef.current.setRegistry(registry);
    return realSourceRef.current;
  }, [registry]);

  const bluetoothReady = useCallback(
    () => (env.bleSimulation ? Promise.resolve(true) : getRealSource().isBluetoothReady()),
    [getRealSource],
  );

  const startScanning = useCallback(async () => {
    if (scannerRef.current) {
      // A failed native scan can leave the processing timer running. Restart
      // the source as well, so Try again really requests another native scan.
      await scannerRef.current.stop();
      setBleError(null);
      setScanning(true);
      await scannerRef.current.start();
      return;
    }

    if (registry.length === 0) {
      setBleError(t(languageRef.current, 'noBeacons'));
      return;
    }

    const config = {
      ...DEFAULT_SCANNER_CONFIG,
      minSamples: env.ble.minSamples,
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
      setSimulator(simulated);
    } else {
      source = getRealSource();
    }

    const scanner = new BeaconScanner(source, registry, config);
    scanner.onSnapshot(setSnapshot);
    scanner.onZoneConfirmed((event) => handleZoneConfirmed(event, registry));
    scannerRef.current = scanner;
    setActiveScanner(scanner);

    setBleError(null);
    setScanning(true);
    await scanner.start();
  }, [registry, handleZoneConfirmed, getRealSource]);

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
      languageOptions,
      setLanguage,
      registryError,
      registry,
      reloadRegistry,
      scanning,
      bleError,
      snapshot,
      startScanning,
      bluetoothReady,
      stopScanning,
      scanner: activeScanner,
      simulator,
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
      languageOptions,
      setLanguage,
      registryError,
      registry,
      reloadRegistry,
      scanning,
      bleError,
      snapshot,
      startScanning,
      bluetoothReady,
      stopScanning,
      activeScanner,
      simulator,
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
