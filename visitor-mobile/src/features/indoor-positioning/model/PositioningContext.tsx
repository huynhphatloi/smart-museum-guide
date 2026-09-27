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
import { api } from '../../../shared/api/client';
import { useGuide } from '../../tour/model/GuideContext';
import { currentDeviceProfile } from './device';
import { DEFAULT_POSITION_ENGINE, PositionEngine, PositionTick } from './position-engine';
import { buildRadioMap } from './radio-map';
import { simulatedRssi } from './simulated-rssi';
import { CaptureFingerprint, DeviceProfile, FloorPlan, RadioMap } from './types';

/** Last floor plans and fingerprints, so the map still works offline. */
const STORAGE_POSITIONING = 'museum.positioning';

interface CachedPositioning {
  floorPlans: FloorPlan[];
  fingerprints: Record<string, CaptureFingerprint[]>;
}

interface PositioningContextValue {
  floorPlans: FloorPlan[];
  /** The room the visitor is in - the plan of the loudest beacon, or the one picked. */
  plan: FloorPlan | null;
  radioMap: RadioMap | null;
  /** Fingerprints of the active plan, every device - the calibration tool shows coverage. */
  fingerprints: CaptureFingerprint[];
  device: DeviceProfile;
  /** Latest engine output while scanning; null when idle. */
  tick: PositionTick | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  selectPlan: (id: string | null) => void;
  /** Simulation mode only: place the virtual visitor, in metres. */
  moveVirtualVisitor: ((x: number, y: number) => void) | null;
  virtualVisitor: { x: number; y: number } | null;
}

const PositioningContext = createContext<PositioningContextValue | null>(null);

export function usePositioning(): PositioningContextValue {
  const context = useContext(PositioningContext);
  if (!context) throw new Error('usePositioning must be used inside <PositioningProvider>.');
  return context;
}

export function PositioningProvider({ children }: { children: React.ReactNode }) {
  const { scanner, scanning, snapshot, simulator, registry } = useGuide();
  const device = useMemo(currentDeviceProfile, []);

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [fingerprints, setFingerprints] = useState<Record<string, CaptureFingerprint[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tick, setTick] = useState<PositionTick | null>(null);
  const [virtualVisitor, setVirtualVisitor] = useState<{ x: number; y: number } | null>(null);

  // --- data ----------------------------------------------------------------

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const plans = await api.floorPlans();
      const lists = await Promise.all(plans.map((plan) => api.fingerprints(plan.id)));
      const byPlan = Object.fromEntries(plans.map((plan, index) => [plan.id, lists[index]]));
      setFloorPlans(plans);
      setFingerprints(byPlan);
      setError(null);
      const cache: CachedPositioning = { floorPlans: plans, fingerprints: byPlan };
      void AsyncStorage.setItem(STORAGE_POSITIONING, JSON.stringify(cache));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the floor plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_POSITIONING);
        const cached = raw ? (JSON.parse(raw) as CachedPositioning) : null;
        if (!cancelled && cached?.floorPlans) {
          setFloorPlans(cached.floorPlans);
          setFingerprints(cached.fingerprints ?? {});
        }
      } catch {
        // A corrupt cache is simply ignored - the server copy replaces it.
      }
      if (!cancelled) await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // --- which room ----------------------------------------------------------

  const planByBeacon = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of floorPlans) {
      for (const beacon of plan.beacons) map.set(beacon.identifier, plan.id);
    }
    return map;
  }, [floorPlans]);

  const loudestPlanId = useMemo(() => {
    for (const stat of snapshot.stats) {
      const planId = planByBeacon.get(stat.identifier);
      if (planId) return planId;
    }
    return null;
  }, [snapshot.stats, planByBeacon]);

  const radioMaps = useMemo(() => {
    const maps = new Map<string, RadioMap | null>();
    for (const plan of floorPlans) {
      maps.set(plan.id, buildRadioMap(plan, fingerprints[plan.id] ?? [], device));
    }
    return maps;
  }, [floorPlans, fingerprints, device]);

  const plan = useMemo(() => {
    const byId = (id: string | null) => floorPlans.find((candidate) => candidate.id === id) ?? null;
    return (
      byId(selectedPlanId) ??
      byId(loudestPlanId) ??
      floorPlans.find((candidate) => radioMaps.get(candidate.id)) ??
      floorPlans[0] ??
      null
    );
  }, [floorPlans, selectedPlanId, loudestPlanId, radioMaps]);

  const radioMap = plan ? (radioMaps.get(plan.id) ?? null) : null;

  // --- engine --------------------------------------------------------------

  const engineRef = useRef<PositionEngine | null>(null);

  useEffect(() => {
    // One engine per room: k is a per-room setting chosen by the evaluation.
    engineRef.current = new PositionEngine(radioMap, {
      ...DEFAULT_POSITION_ENGINE,
      k: plan?.positioningK ?? DEFAULT_POSITION_ENGINE.k,
    });
  }, [plan?.id, plan?.positioningK, radioMap]);

  useEffect(() => {
    if (!scanner) return undefined;
    const stopSignals = scanner.onSignal((signal) => engineRef.current?.ingest(signal));
    // The scanner's tick is the positioning clock too, so map and zone agree.
    const stopTicks = scanner.onSnapshot(() => {
      const engine = engineRef.current;
      if (engine) setTick(engine.tick(Date.now()));
    });
    return () => {
      stopSignals();
      stopTicks();
    };
  }, [scanner]);

  useEffect(() => {
    if (scanning) return;
    engineRef.current?.reset();
    setTick(null);
  }, [scanning]);

  // --- simulator -----------------------------------------------------------

  const moveVirtualVisitor = useCallback(
    (x: number, y: number) => {
      if (!simulator || !plan) return;
      const onPlan = new Map(plan.beacons.map((beacon) => [beacon.identifier, beacon]));
      for (const beacon of registry) {
        const placed = onPlan.get(beacon.identifier);
        if (placed && placed.mapX !== null && placed.mapY !== null) {
          simulator.setEnabled(beacon.identifier, true);
          simulator.setRssi(
            beacon.identifier,
            simulatedRssi({ x, y }, { x: placed.mapX, y: placed.mapY }),
          );
        } else {
          // Beacons in other rooms, or not placed on this plan yet, go quiet.
          simulator.setEnabled(beacon.identifier, false);
        }
      }
      setVirtualVisitor({ x, y });
    },
    [simulator, plan, registry],
  );

  const value = useMemo<PositioningContextValue>(
    () => ({
      floorPlans,
      plan,
      radioMap,
      fingerprints: plan ? (fingerprints[plan.id] ?? []) : [],
      device,
      tick,
      loading,
      error,
      reload,
      selectPlan: setSelectedPlanId,
      moveVirtualVisitor: simulator ? moveVirtualVisitor : null,
      virtualVisitor,
    }),
    [
      floorPlans,
      plan,
      radioMap,
      fingerprints,
      device,
      tick,
      loading,
      error,
      reload,
      simulator,
      moveVirtualVisitor,
      virtualVisitor,
    ],
  );

  return <PositioningContext.Provider value={value}>{children}</PositioningContext.Provider>;
}
