import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from '../../../shared/api/client';
import { env } from '../../../shared/config/env';
import { ActiveExhibitResponse } from '../../../shared/api/types';
import { AccessSource, AccessTracker } from './access-tracker';

const tracker = new AccessTracker(AsyncStorage, (event) => api.recordVisit(event));

export function trackExhibitVisit(data: ActiveExhibitResponse, source: AccessSource): void {
  if (env.bleSimulation || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  void tracker.track({
    exhibitId: data.exhibit.id,
    zoneCode: data.zone.code,
    source,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    ...(source === 'BLE' && data.beacon ? { beaconIdentifier: data.beacon.identifier } : {}),
  });
}
