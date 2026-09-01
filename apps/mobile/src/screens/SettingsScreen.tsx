import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { LanguagePicker } from '../components/LanguagePicker';
import { Body, Button, Card, Divider, Row, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { regionMonitor } from '../features/ble/ios-region-monitor';
import { env } from '../config/env';
import { t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    language,
    supportedLanguages,
    setLanguage,
    autoGuide,
    setAutoGuide,
    scanning,
    snapshot,
    isSimulation,
    registry,
    calibration,
    updateCalibration,
  } = useGuide();

  return (
    <Screen>
      <Title>{t(language, 'settings')}</Title>

      <Card>
        <Subtitle>{t(language, 'language')}</Subtitle>
        <View style={{ height: 10 }} />
        <LanguagePicker languages={supportedLanguages} value={language} onChange={setLanguage} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Subtitle>{t(language, 'autoGuide')}</Subtitle>
            <Body>{t(language, 'autoGuideHelp')}</Body>
          </View>
          <Switch value={autoGuide} onValueChange={setAutoGuide} />
        </Row>
      </Card>

      <Card>
        <Subtitle>{t(language, 'bleStatus')}</Subtitle>
        <Divider />
        <KeyValue label="Mode" value={isSimulation ? 'Simulation' : 'Real BLE'} />
        <KeyValue label="Scanning" value={scanning ? 'on' : 'off'} />
        <KeyValue label="State" value={snapshot.state} />
        <KeyValue label="Confirmed zone" value={snapshot.confirmedZone ?? '—'} />
        <KeyValue label="Known beacons" value={String(registry.length)} />
        <KeyValue label="Identity" value={registry[0]?.namespaceId ? 'Eddystone UID' : 'iBeacon'} />
        <KeyValue label="API" value={env.apiUrl} />
        <Divider />
        <Subtitle>Background detection</Subtitle>
        <Body>{regionMonitor.reason}</Body>
        <Divider />
        <Subtitle>Calibration</Subtitle>
        <Body>These are building specific values, not universal constants.</Body>
        <KeyValue label="Scan window" value={`${calibration.scanWindowMs} ms`} />
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={styles.key}>Dwell time</Text>
          <Row>
            <Button
              label="−"
              variant="ghost"
              onPress={() =>
                updateCalibration({ dwellTimeMs: Math.max(500, calibration.dwellTimeMs - 500) })
              }
            />
            <Text style={styles.value}>{calibration.dwellTimeMs} ms</Text>
            <Button
              label="+"
              variant="ghost"
              onPress={() =>
                updateCalibration({ dwellTimeMs: Math.min(15000, calibration.dwellTimeMs + 500) })
              }
            />
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.key}>Hysteresis</Text>
          <Row>
            <Button
              label="−"
              variant="ghost"
              onPress={() =>
                updateCalibration({ hysteresisDb: Math.max(0, calibration.hysteresisDb - 1) })
              }
            />
            <Text style={styles.value}>{calibration.hysteresisDb} dB</Text>
            <Button
              label="+"
              variant="ghost"
              onPress={() =>
                updateCalibration({ hysteresisDb: Math.min(20, calibration.hysteresisDb + 1) })
              }
            />
          </Row>
        </Row>
      </Card>

      {isSimulation ? (
        <Button label={t(language, 'simulator')} onPress={() => navigation.navigate('Simulator')} />
      ) : null}

      <Card>
        <Subtitle>{t(language, 'about')}</Subtitle>
        <Body>{t(language, 'aboutBody')}</Body>
      </Card>
    </Screen>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={styles.key}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  key: { fontSize: 14, color: theme.colors.muted },
  value: { fontSize: 14, color: theme.colors.ink, fontWeight: '600', maxWidth: '60%' },
});
