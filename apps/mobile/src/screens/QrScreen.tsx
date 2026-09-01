import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { zoneCodeFromQr } from '../api/qr';
import { Body, Button, Card, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

/**
 * QR fallback inside the app. Uses the very same
 * `GET /public/zones/:code/active-exhibit` endpoint as the visitor web, so a
 * QR always resolves the exhibit that is scheduled right now.
 */
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

  return (
    <Screen>
      <Title>{t(language, 'qrTitle')}</Title>
      <Body>{t(language, 'qrBody')}</Body>

      <View style={{ height: 16 }} />

      {scannerActive && permission?.granted ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(result) => void handleCode(result.data)}
          />
        </View>
      ) : (
        <Card>
          {permission?.granted === false ? <Body>{t(language, 'qrPermission')}</Body> : null}
          <Button
            label={t(language, 'qrTitle')}
            onPress={async () => {
              if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) return;
              }
              setScannerActive(true);
            }}
          />
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <Subtitle>{t(language, 'qrManual')}</Subtitle>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ZONE_A01"
          placeholderTextColor={theme.colors.muted}
          accessibilityLabel={t(language, 'qrManual')}
        />
        <Button label={t(language, 'qrOpen')} onPress={() => void handleCode(manualCode)} />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrapper: {
    height: 320,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  camera: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 10,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
  },
  error: { color: theme.colors.danger, marginTop: 12, fontSize: 14 },
});
