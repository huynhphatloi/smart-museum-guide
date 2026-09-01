import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LanguagePicker } from '../components/LanguagePicker';
import { Body, Button, Card, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { language, supportedLanguages, setLanguage, ready, registryError, isSimulation } =
    useGuide();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Title>{t(language, 'appName')}</Title>
        <Body>{t(language, 'welcomeBody')}</Body>
      </View>

      <Card>
        <Subtitle>{t(language, 'chooseLanguage')}</Subtitle>
        <View style={{ height: 12 }} />
        <LanguagePicker languages={supportedLanguages} value={language} onChange={setLanguage} />
      </Card>

      {registryError ? (
        <Card style={styles.warning}>
          <Text style={styles.warningText}>{registryError}</Text>
        </Card>
      ) : null}

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
        <ActivityIndicator style={{ marginTop: 24 }} />
      )}

      <Text style={styles.footer}>
        {isSimulation ? t(language, 'simulationBadge') : t(language, 'realBleBadge')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: theme.spacing(6), paddingBottom: theme.spacing(3) },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  warning: { backgroundColor: '#F7ECD5', borderColor: '#E4CFA4' },
  warningText: { color: theme.colors.warning, fontSize: 14 },
  footer: {
    marginTop: 'auto',
    paddingTop: theme.spacing(3),
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.muted,
  },
});
