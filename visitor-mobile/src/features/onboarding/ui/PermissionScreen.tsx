import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { useGuide } from '../../tour/model/GuideContext';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, MuseumMark, Screen, Title } from '../../../shared/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Permission'>;

export function PermissionScreen({ navigation }: Props) {
  const { language, startScanning, bleError } = useGuide();
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    setBusy(true);
    await startScanning();
    setBusy(false);
    navigation.replace('Main', { screen: 'Explore' });
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.signalArtwork}>
        <View style={styles.signalRingLarge} />
        <View style={styles.signalRingSmall} />
        <MuseumMark compact />
      </View>

      <Eyebrow>Automatic guide</Eyebrow>
      <Title>{t(language, 'permissionTitle')}</Title>
      <Body>{t(language, 'permissionBody')}</Body>

      <View style={styles.details}>
        <Detail number="01" text={t(language, 'currentZone')} />
        <Detail number="02" text={t(language, 'currentExhibit')} />
        <Detail number="03" text={t(language, 'listen')} />
      </View>

      <View style={styles.privacy}>
        <Text style={styles.privacyLabel}>PRIVACY</Text>
        <Text style={styles.privacyText}>
          {Platform.OS === 'android'
            ? 'Nearby-device access finds museum beacons. Signal readings stay on this phone.'
            : 'Bluetooth access finds museum beacons. Signal readings stay on this phone.'}
        </Text>
      </View>

      {bleError ? <Text style={styles.errorText}>{bleError}</Text> : null}

      <View style={styles.actions}>
        <Button label={t(language, 'enableBluetooth')} onPress={handleContinue} loading={busy} />
        <Button
          label={t(language, 'useQrInstead')}
          variant="ghost"
          onPress={() => navigation.replace('Main', { screen: 'Qr' })}
        />
      </View>
    </Screen>
  );
}

function Detail({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailNumber}>{number}</Text>
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing(2) },
  signalArtwork: {
    height: 156,
    marginBottom: theme.spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalRingLarge: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  signalRingSmall: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 1,
    borderColor: theme.colors.brass,
  },
  details: {
    marginTop: theme.spacing(3),
    borderTopWidth: 1,
    borderColor: theme.colors.line,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: theme.spacing(1.5),
  },
  detailNumber: {
    width: 44,
    color: theme.colors.accent,
    fontFamily: theme.type.display,
    fontSize: 15,
  },
  detailText: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 15 },
  privacy: {
    marginTop: theme.spacing(2.5),
    borderLeftWidth: 2,
    borderColor: theme.colors.brass,
    paddingLeft: theme.spacing(1.5),
  },
  privacyLabel: {
    color: theme.colors.brass,
    fontFamily: theme.type.body,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  privacyText: {
    color: theme.colors.muted,
    fontFamily: theme.type.body,
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.type.body,
    fontSize: 13,
    marginTop: 12,
  },
  actions: { marginTop: 'auto', paddingTop: theme.spacing(3) },
});
