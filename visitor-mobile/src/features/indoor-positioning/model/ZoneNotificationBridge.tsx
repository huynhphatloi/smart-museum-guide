import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '../../../application/navigation/navigation-ref';
import { findZoneName } from '../../beacon-detection/model/beacon-registry';
import { useGuide } from '../../tour/model/GuideContext';
import { pt } from '../i18n';

const CHANNEL_ID = 'zone-arrivals';

// Show the banner even while the app is open - that is exactly when the
// visitor is walking around with the guide.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Turns a confirmed zone into a local notification: "You are near: ...".
 *
 * Local, not push: it is raised on the phone by the same zone detector that
 * drives the in-app prompt (dwell time, hysteresis and cooldown included), so
 * no server is involved and nothing about the visitor leaves the device.
 * Scanning only runs while the app is open, so this does too.
 */
export function ZoneNotificationBridge() {
  const { scanner, autoGuide, registry, language } = useGuide();
  const state = useRef({ autoGuide, registry, language });
  state.current = { autoGuide, registry, language };
  const asked = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: pt(language, 'notificationChannel'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }, [language]);

  useEffect(() => {
    if (!scanner) return undefined;

    if (!asked.current) {
      asked.current = true;
      void Notifications.getPermissionsAsync().then((current) =>
        current.granted ? current : Notifications.requestPermissionsAsync(),
      );
    }

    return scanner.onZoneConfirmed((event) => {
      const { autoGuide: enabled, registry: beacons, language: lang } = state.current;
      if (!event.shouldNotify || !enabled) return;

      const zone = findZoneName(beacons, event.zoneCode) ?? event.zoneCode;
      void Notifications.scheduleNotificationAsync({
        content: {
          title: pt(lang, 'notificationTitle', { zone }),
          body: pt(lang, 'notificationBody'),
          data: { kind: 'zone', zoneCode: event.zoneCode },
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    });
  }, [scanner]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { kind?: string } | undefined;
      if (data?.kind === 'zone' && navigationRef.isReady()) {
        // The guide already loaded this zone's exhibit when the zone confirmed.
        navigationRef.navigate('ExhibitDetail', { autoPlay: true });
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}
