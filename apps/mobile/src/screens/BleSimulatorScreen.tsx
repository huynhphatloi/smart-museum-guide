import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Divider, Pill, Row, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { SimulatedBeaconState } from '../features/ble/sources/simulated-ble-source';
import { t } from '../i18n';
import { theme } from '../theme';

const MIN_RSSI = -100;
const MAX_RSSI = -35;
const STEP_DB = 3;

/**
 * Developer-only screen (simulation mode).
 *
 * Everything dialled in here is fed into the SAME pipeline the real scanner
 * uses - sliding window, outlier rejection, smoothing, candidate ranking,
 * dwell timing, hysteresis and cooldown. Nothing is faked downstream, which is
 * what makes it a usable demonstration of the algorithm.
 */
export function BleSimulatorScreen() {
  const { language, simulator, snapshot, registry, scanning, startScanning } = useGuide();
  const [beacons, setBeacons] = useState<SimulatedBeaconState[]>([]);

  useEffect(() => {
    if (simulator) setBeacons(simulator.list());
  }, [simulator]);

  function adjust(identifier: string, delta: number) {
    if (!simulator) return;
    const current = simulator.list().find((beacon) => beacon.identifier === identifier);
    const next = Math.min(MAX_RSSI, Math.max(MIN_RSSI, (current?.rssi ?? -80) + delta));
    simulator.setRssi(identifier, next);
    setBeacons(simulator.list());
  }

  function toggle(identifier: string) {
    if (!simulator) return;
    const current = simulator.list().find((beacon) => beacon.identifier === identifier);
    simulator.setEnabled(identifier, !(current?.enabled ?? true));
    setBeacons(simulator.list());
  }

  /** One tap reproduces "visitor walks from the first zone into the second". */
  function applyWalkScenario() {
    if (!simulator || registry.length < 2) return;
    simulator.setRssi(registry[0].identifier, -88);
    simulator.setRssi(registry[1].identifier, -55);
    registry.slice(2).forEach((beacon) => simulator.setRssi(beacon.identifier, -95));
    setBeacons(simulator.list());
  }

  function applyEnterFirstZone() {
    if (!simulator || registry.length === 0) return;
    simulator.setRssi(registry[0].identifier, -58);
    registry.slice(1).forEach((beacon) => simulator.setRssi(beacon.identifier, -90));
    setBeacons(simulator.list());
  }

  /** A single strong spike - the pipeline should absorb it without switching. */
  function applySpike() {
    if (!simulator || registry.length < 2) return;
    simulator.setRssi(registry[1].identifier, -32);
    setBeacons(simulator.list());
    setTimeout(() => {
      simulator.setRssi(registry[1].identifier, -90);
      setBeacons(simulator.list());
    }, 700);
  }

  if (!simulator) {
    return (
      <Screen>
        <Title>{t(language, 'simulator')}</Title>
        <Body>{t(language, 'simulatorBody')}</Body>
        <Card>
          <Body>Scanning has not started yet, so no simulated source exists.</Body>
          <Button label={t(language, 'startScanning')} onPress={() => void startScanning()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{t(language, 'simulator')}</Title>
      <Body>{t(language, 'simulatorBody')}</Body>

      <Card style={{ marginTop: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Detector</Subtitle>
          <Pill
            label={snapshot.state}
            tone={
              snapshot.state === 'CONTENT_ACTIVE'
                ? 'good'
                : snapshot.state === 'IDLE'
                  ? 'bad'
                  : 'warn'
            }
          />
        </Row>
        <Divider />
        <KeyValue label="Scanning" value={scanning ? 'yes' : 'no'} />
        <KeyValue label="Candidate beacon" value={snapshot.candidateBeacon ?? '—'} />
        <KeyValue label="Candidate zone" value={snapshot.candidateZone ?? '—'} />
        <KeyValue label="Confirmed beacon" value={snapshot.confirmedBeacon ?? '—'} />
        <KeyValue label="Confirmed zone" value={snapshot.confirmedZone ?? '—'} />
        <Text style={styles.progressLabel}>
          Dwell progress {Math.round(snapshot.dwellProgress * 100)}%
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${Math.round(snapshot.dwellProgress * 100)}%` }]}
          />
        </View>
      </Card>

      <Card>
        <Subtitle>Scenarios</Subtitle>
        <Button label="Stand in the first zone" variant="secondary" onPress={applyEnterFirstZone} />
        <Button label="Walk to the second zone" variant="secondary" onPress={applyWalkScenario} />
        <Button label="Inject a single RSSI spike" variant="ghost" onPress={applySpike} />
      </Card>

      <Card>
        <Subtitle>Simulated beacons</Subtitle>
        <Divider />
        {beacons.length === 0 ? <Body>No beacons loaded from the API.</Body> : null}
        {beacons.map((beacon) => {
          const stat = snapshot.stats.find((item) => item.identifier === beacon.identifier);
          const percentage = Math.round(((beacon.rssi - MIN_RSSI) / (MAX_RSSI - MIN_RSSI)) * 100);

          return (
            <View key={beacon.identifier} style={styles.beacon}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.beaconName}>{beacon.identifier}</Text>
                <Pressable onPress={() => toggle(beacon.identifier)}>
                  <Pill
                    label={beacon.enabled ? 'ON' : 'OFF'}
                    tone={beacon.enabled ? 'good' : 'bad'}
                  />
                </Pressable>
              </Row>
              <Text style={styles.beaconId} numberOfLines={1}>
                {beacon.protocol === 'eddystone_uid' ? 'Eddystone UID' : 'iBeacon'} ·{' '}
                {beacon.beaconId}
              </Text>

              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(2, percentage)}%` }]} />
              </View>

              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.rssi}>set {beacon.rssi.toFixed(0)} dBm</Text>
                <Text style={styles.rssi}>
                  {stat
                    ? `smoothed ${stat.smoothedRssi.toFixed(1)} · n=${stat.sampleCount} · outliers ${stat.outliersRemoved}`
                    : 'no samples yet'}
                </Text>
              </Row>

              <Row>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`− ${STEP_DB} dB`}
                    variant="ghost"
                    onPress={() => adjust(beacon.identifier, -STEP_DB)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`+ ${STEP_DB} dB`}
                    variant="ghost"
                    onPress={() => adjust(beacon.identifier, STEP_DB)}
                  />
                </View>
              </Row>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={styles.key}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  key: { fontSize: 14, color: theme.colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
  progressLabel: { marginTop: 10, marginBottom: 6, fontSize: 12, color: theme.colors.muted },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.line,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: theme.colors.accent },
  beacon: { marginBottom: 18 },
  beaconName: { fontSize: 15, fontWeight: '600', color: theme.colors.ink },
  beaconId: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.line,
    overflow: 'hidden',
    marginTop: 8,
  },
  barFill: { height: 10, backgroundColor: theme.colors.ink },
  rssi: { fontSize: 12, color: theme.colors.muted },
});
