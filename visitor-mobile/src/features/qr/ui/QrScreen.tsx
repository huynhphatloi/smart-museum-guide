import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Eyebrow, MuseumMark, Row, Screen, Subtitle, Title } from '../../../shared/ui';
import { useGuide } from '../../tour/model/GuideContext';
import { zoneCodeFromQr } from '../api/qr';

export function QrScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language, openZone } = useGuide();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCode(raw: string) {
    const zoneCode = zoneCodeFromQr(raw);
    if (!zoneCode) {
      setError('This code does not look like a museum zone code.');
      return;
    }
    setScannerActive(false);
    setError(null);
    await openZone(zoneCode);
    navigation.navigate('ExhibitDetail', { autoPlay: false });
  }

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setScannerActive(true);
  }

  return (
    <Screen>
      <Row style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>Gallery access</Eyebrow>
          <Title>{t(language, 'qrTitle')}</Title>
          <Body>{t(language, 'qrBody')}</Body>
        </View>
        <MuseumMark compact />
      </Row>

      {scannerActive && permission?.granted ? (
        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(result) => void handleCode(result.data)}
          />
          <View pointerEvents="none" style={styles.scanGuide}>
            <View style={styles.scanCornerTopLeft} />
            <View style={styles.scanCornerBottomRight} />
          </View>
          <Pressable style={styles.closeScanner} onPress={() => setScannerActive(false)}>
            <Text style={styles.closeScannerText}>Close</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(language, 'qrTitle')}
          onPress={() => void openScanner()}
          style={({ pressed }) => [styles.scanInvitation, pressed && styles.pressed]}
        >
          <View style={styles.qrGlyph}>
            <View style={styles.qrSquare} />
            <View style={[styles.qrSquare, styles.qrSquareRight]} />
            <View style={[styles.qrSquare, styles.qrSquareBottom]} />
          </View>
          <Subtitle>{t(language, 'qrTitle')}</Subtitle>
          {permission?.granted === false ? <Body>{t(language, 'qrPermission')}</Body> : null}
        </Pressable>
      )}

      <View style={styles.manualSection}>
        <Eyebrow>{t(language, 'qrManual')}</Eyebrow>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ZONE_A01"
            placeholderTextColor={theme.colors.faint}
            accessibilityLabel={t(language, 'qrManual')}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleCode(manualCode)}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
          >
            <Text style={styles.openButtonText}>{t(language, 'qrOpen')}</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
  },
  headerCopy: { flex: 1, paddingRight: theme.spacing(2) },
  cameraFrame: {
    height: 360,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    overflow: 'hidden',
    backgroundColor: theme.colors.ink,
  },
  camera: { flex: 1 },
  scanGuide: { position: 'absolute', top: 46, right: 46, bottom: 46, left: 46 },
  scanCornerTopLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 54,
    height: 54,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: theme.colors.white,
  },
  scanCornerBottomRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 54,
    height: 54,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.colors.white,
  },
  closeScanner: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: theme.colors.paper,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
  },
  closeScannerText: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 12,
    fontWeight: '600',
  },
  scanInvitation: {
    minHeight: 286,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing(4),
  },
  pressed: { opacity: 0.75 },
  qrGlyph: { width: 70, height: 70, marginBottom: theme.spacing(2.5) },
  qrSquare: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 5,
    borderColor: theme.colors.accentDark,
  },
  qrSquareRight: { right: 0 },
  qrSquareBottom: { bottom: 0 },
  manualSection: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(2),
  },
  inputRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 4 },
  input: {
    flex: 1,
    height: 50,
    borderBottomWidth: 1,
    borderColor: theme.colors.ink,
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 16,
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  openButton: {
    minWidth: 84,
    marginLeft: theme.spacing(1.5),
    backgroundColor: theme.colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  openButtonText: {
    color: theme.colors.white,
    fontFamily: theme.type.body,
    fontSize: 14,
    fontWeight: '600',
  },
  error: { color: theme.colors.danger, fontFamily: theme.type.body, marginTop: 12, fontSize: 13 },
});
