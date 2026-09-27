import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { LanguagePicker } from '../../preferences/ui/LanguagePicker';
import { useGuide } from '../../tour/model/GuideContext';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Button, Screen, Subtitle, Title } from '../../../shared/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { language, languageOptions, setLanguage, ready, registryError } = useGuide();
  return (
    <Screen style={styles.screen}>
      <View style={styles.masthead}><Text style={styles.wordmark}>M</Text><Text style={styles.mastheadText}>{t(language, 'appName')}</Text></View>
      <View style={styles.imageWrap}>
        <Image source={require('../../../../assets/images/isana-my-son.jpg')} style={styles.image} resizeMode="cover" accessibilityLabel="Isana statue from My Son" />
        <View style={styles.imageCaption}><Text style={styles.imageCaptionText}>01 / ISANA · MỸ SƠN</Text></View>
      </View>
      <View style={styles.copy}>
        <Title>{language === 'vi' ? 'Mỗi hiện vật, một câu chuyện.' : 'Every object has a story.'}</Title>
        <Body>{t(language, 'welcomeBody')}</Body>
      </View>
      <View style={styles.languageSection}>
        <Subtitle>{t(language, 'chooseLanguage')}</Subtitle>
        <LanguagePicker options={languageOptions} value={language} onChange={setLanguage} title={t(language, 'chooseLanguage')} closeLabel={t(language, 'close')} />
      </View>
      {registryError ? <View style={styles.warning}><Text style={styles.warningText}>{registryError}</Text></View> : null}
      <View style={styles.actions}>
        {ready ? <><Button label={t(language, 'startTour')} onPress={() => navigation.navigate('Permission')} /><Button label={t(language, 'useQrInstead')} variant="ghost" onPress={() => navigation.navigate('Main', { screen: 'Qr' })} /></> : <ActivityIndicator color={theme.colors.accentDark} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing(0.5) },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing(2) },
  wordmark: { width: 34, height: 34, borderWidth: 1, borderColor: theme.colors.ink, color: theme.colors.ink, textAlign: 'center', textAlignVertical: 'center', fontFamily: theme.type.display, fontSize: 25, lineHeight: 32 },
  mastheadText: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 13, fontWeight: '600' },
  imageWrap: { height: 245, overflow: 'hidden', backgroundColor: theme.colors.line, marginBottom: theme.spacing(2.5) },
  image: { height: '100%', width: '100%' },
  imageCaption: { position: 'absolute', bottom: 0, left: 0, backgroundColor: theme.colors.paper, paddingHorizontal: 10, paddingVertical: 6 },
  imageCaptionText: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  copy: { paddingBottom: theme.spacing(2.5) },
  languageSection: { borderTopWidth: 1, borderColor: theme.colors.line, paddingTop: theme.spacing(1.75) },
  warning: { marginTop: theme.spacing(2), borderLeftWidth: 2, borderColor: theme.colors.warning, paddingLeft: theme.spacing(1.5) },
  warningText: { color: theme.colors.warning, fontFamily: theme.type.body, fontSize: 13 },
  actions: { marginTop: theme.spacing(2), paddingBottom: theme.spacing(2) },
});
