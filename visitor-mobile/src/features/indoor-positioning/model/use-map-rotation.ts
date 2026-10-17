import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { mapRotation, MapRotation } from './map-view';

/** One view preference per room/device, shared by map and calibration screens. */
export function useMapRotation(planId: string) {
  const [view, setView] = useState({ planId, angle: 0 as MapRotation });
  const revision = useRef(0);
  const writes = useRef(Promise.resolve());
  const key = `museum.map.rotation:${planId}`;
  useFocusEffect(
    useCallback(() => {
      const current = ++revision.current;
      let active = true;
      void writes.current
        .then(() => AsyncStorage.getItem(key))
        .then((saved) => {
          if (active && revision.current === current)
            setView({ planId, angle: mapRotation(Number(saved)) });
        })
        .catch(() => {
          /* Rotation works without persistence. */
        });
      return () => {
        active = false;
      };
    }, [key, planId]),
  );
  const rotation = view.planId === planId ? view.angle : 0;
  const rotate = (angle: number) => {
    ++revision.current;
    const next = mapRotation((angle + 360) % 360);
    setView({ planId, angle: next });
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(key, String(next)))
      .catch(() => {});
  };
  return { rotation, rotate };
}
