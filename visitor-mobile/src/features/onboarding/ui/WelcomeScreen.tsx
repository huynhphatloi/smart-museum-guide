import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { LanguagePicker } from '../../preferences/ui/LanguagePicker';
import { useGuide } from '../../tour/model/GuideContext';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { Body, Button, Screen, Subtitle } from '../../../shared/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { language, languageOptions, setLanguage, ready, registryError, bluetoothReady, startScanning } = useGuide();
  const [checkingBluetooth, setCheckingBluetooth] = useState(false);
  const starting = useRef(false);

  async function handleStartTour() {
    if (starting.current) return;
    starting.current = true;
    setCheckingBluetooth(true);
    try {
      const readyToScan = await bluetoothReady();
      if (!navigation.isFocused()) return;
      if (readyToScan) {
        await startScanning();
        if (navigation.isFocused()) navigation.navigate('Main', { screen: 'Explore' });
      } else {
        navigation.navigate('Permission');
      }
    } finally {
      starting.current = false;
      setCheckingBluetooth(false);
    }
  }

  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) {
        reveal.setValue(1);
        return;
      }
      Animated.timing(reveal, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    });
    return () => { active = false; reveal.stopAnimation(); };
  }, [reveal]);

  return (
    <Screen style={styles.screen}>
      <View style={styles.masthead}>
        <BrandMark size={39} />
        <Text style={styles.mastheadText}>{t(language, 'appName')}</Text>
      </View>

      <View style={styles.hero}>
        <Animated.Image
          source={require('../../../../assets/images/isana-my-son.jpg')}
          style={[styles.image, { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [1.11, 1] }) }] }]}
          resizeMode="cover"
          accessibilityLabel="Isana statue from My Son"
        />
        <View style={styles.heroShade} pointerEvents="none" />
        <View style={styles.heroTop}><Text style={styles.heroTopText}>{language === 'vi' ? 'KHÁM PHÁ BẢO TÀNG' : 'EXPLORE THE MUSEUM'}</Text></View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle}>{language === 'vi' ? 'Mỗi hiện vật,\nmột câu chuyện.' : 'Every object,\na story.'}</Text>
          <Text style={styles.heroCaption}>ISANA · MỸ SƠN</Text>
        </View>
      </View>

      <View style={styles.copy}>
        <Body>{t(language, 'welcomeBody')}</Body>
      </View>
      <View style={styles.languageSection}>
        <Subtitle>{t(language, 'chooseLanguage')}</Subtitle>
        <LanguagePicker options={languageOptions} value={language} onChange={setLanguage} title={t(language, 'chooseLanguage')} closeLabel={t(language, 'close')} />
      </View>
      {registryError ? <View style={styles.warning}><Text style={styles.warningText}>{registryError}</Text></View> : null}
      <View style={styles.actions}>
        {ready ? registryError ? (
          <Button label={t(language, 'useQrInstead')} onPress={() => navigation.navigate('Main', { screen: 'Qr' })} />
        ) : <><Button label={t(language, 'startTour')} onPress={handleStartTour} loading={checkingBluetooth} /><Button label={t(language, 'useQrInstead')} variant="ghost" onPress={() => navigation.navigate('Main', { screen: 'Qr' })} /></> : <ActivityIndicator color={theme.colors.accentDark} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing(0.5) },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing(2) },
  mastheadText: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 14, fontWeight: '600' },
  hero: { height: 328, overflow: 'hidden', backgroundColor: theme.colors.ink, borderRadius: 12 },
  image: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27, 19, 15, 0.37)' },
  heroTop: { position: 'absolute', top: 20, left: 20, right: 20 },
  heroTopText: { color: '#F4E8D6', fontFamily: theme.type.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 23 },
  heroTitle: { color: '#FFF9EF', fontFamily: theme.type.display, fontSize: 40, lineHeight: 43, letterSpacing: -1 },
  heroCaption: { marginTop: 14, color: '#F4E8D6', fontFamily: theme.type.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  copy: { paddingTop: theme.spacing(2), paddingBottom: theme.spacing(2.5) },
  languageSection: { borderTopWidth: 1, borderColor: theme.colors.line, paddingTop: theme.spacing(1.75) },
  warning: { marginTop: theme.spacing(2), borderLeftWidth: 2, borderColor: theme.colors.warning, paddingLeft: theme.spacing(1.5) },
  warningText: { color: theme.colors.warning, fontFamily: theme.type.body, fontSize: 13 },
  actions: { marginTop: theme.spacing(2), paddingBottom: theme.spacing(2) },
});
