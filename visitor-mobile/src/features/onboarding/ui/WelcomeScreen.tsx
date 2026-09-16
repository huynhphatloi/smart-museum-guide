import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { LanguagePicker } from '../../preferences/ui/LanguagePicker';
import { useGuide } from '../../tour/model/GuideContext';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, MuseumMark, Screen, Subtitle, Title } from '../../../shared/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { language, supportedLanguages, setLanguage, ready, registryError } = useGuide();

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.artwork}>
          <View style={styles.artworkHalo} />
          <MuseumMark />
          <Text style={styles.collectionNumber}>01</Text>
        </View>

        <Eyebrow>{t(language, 'companion')}</Eyebrow>
        <Title>{t(language, 'appName')}</Title>
        <Body>{t(language, 'welcomeBody')}</Body>
      </View>

      <View style={styles.languageSection}>
        <Subtitle>{t(language, 'chooseLanguage')}</Subtitle>
        <LanguagePicker languages={supportedLanguages} value={language} onChange={setLanguage} />
      </View>

      {registryError ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{registryError}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {ready ? (
          <>
            <Button
              label={t(language, 'startTour')}
              onPress={() => navigation.navigate('Permission')}
            />
            <Button
              label={t(language, 'useQrInstead')}
              variant="ghost"
              onPress={() => navigation.navigate('Main', { screen: 'Qr' })}
            />
          </>
        ) : (
          <ActivityIndicator color={theme.colors.accentDark} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing(2) },
  hero: { paddingBottom: theme.spacing(3) },
  artwork: {
    height: 190,
    marginBottom: theme.spacing(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkHalo: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  collectionNumber: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    color: theme.colors.brass,
    fontFamily: theme.type.display,
    fontSize: 54,
    lineHeight: 58,
  },
  languageSection: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    paddingTop: theme.spacing(2),
  },
  warning: {
    marginTop: theme.spacing(2),
    borderLeftWidth: 2,
    borderColor: theme.colors.warning,
    paddingLeft: theme.spacing(1.5),
  },
  warningText: { color: theme.colors.warning, fontFamily: theme.type.body, fontSize: 13 },
  actions: { marginTop: 'auto', paddingTop: theme.spacing(4) },
});
