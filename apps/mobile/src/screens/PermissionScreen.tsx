import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Screen, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Permission'>;

/**
 * Explains *why* Bluetooth is needed before the OS dialog appears. The actual
 * permission prompt is raised by react-native-ble-plx the first time a scan
 * starts (Android also needs the runtime location/scan permissions declared in
 * app.json).
 */
export function PermissionScreen({ navigation }: Props) {
  const { language, startScanning, bleError, isSimulation } = useGuide();
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    setBusy(true);
    await startScanning();
    setBusy(false);
    navigation.replace('Main', { screen: 'Explore' });
  }

  return (
    <Screen>
      <View style={styles.spacer} />
      <Title>{t(language, 'permissionTitle')}</Title>
      <Body>{t(language, 'permissionBody')}</Body>

      <Card style={styles.privacy}>
        <Text style={styles.privacyText}>
          {Platform.OS === 'android'
            ? 'Android requires the nearby-devices permission to discover BLE beacons.'
            : 'iOS asks for Bluetooth access the first time the app scans.'}
        </Text>
      </Card>

      {isSimulation ? (
        <Card style={styles.sim}>
          <Text style={styles.simText}>
            Simulation mode is enabled: no real Bluetooth hardware is used. Open the BLE simulator
            from Settings to drive the detection algorithm by hand.
          </Text>
        </Card>
      ) : null}

      {bleError ? (
        <Card style={styles.error}>
          <Text style={styles.errorText}>{bleError}</Text>
        </Card>
      ) : null}

      <Button label={t(language, 'enableBluetooth')} onPress={handleContinue} loading={busy} />
      <Button
        label={t(language, 'useQrInstead')}
        variant="ghost"
        onPress={() => navigation.replace('Main', { screen: 'Qr' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: { height: theme.spacing(5) },
  privacy: { marginTop: theme.spacing(3) },
  privacyText: { fontSize: 14, color: theme.colors.muted },
  sim: { backgroundColor: theme.colors.accentSoft, borderColor: '#DFCDBA' },
  simText: { fontSize: 14, color: theme.colors.accent },
  error: { backgroundColor: '#F6E0E0', borderColor: '#E4B7B7' },
  errorText: { fontSize: 14, color: theme.colors.danger },
});
