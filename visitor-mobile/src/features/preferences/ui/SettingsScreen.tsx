import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { env } from '../../../shared/config/env';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { Body, Eyebrow, Row, Screen, Subtitle, Title } from '../../../shared/ui';
import { pt } from '../../indoor-positioning/i18n';
import { useGuide } from '../../tour/model/GuideContext';
import { LanguagePicker } from './LanguagePicker';

export function SettingsScreen() {
  const { language, languageOptions, setLanguage, autoGuide, setAutoGuide } = useGuide();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <Row style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>{t(language, 'visitorPreferences')}</Eyebrow>
          <Title>{t(language, 'settings')}</Title>
        </View>
      </Row>

      <View style={styles.section}>
        <Subtitle>{t(language, 'language')}</Subtitle>
        <Body>{t(language, 'chooseLanguage')}</Body>
        <LanguagePicker
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          title={t(language, 'chooseLanguage')}
          closeLabel={t(language, 'close')}
        />
      </View>

      <View style={styles.section}>
        <Row style={styles.preferenceRow}>
          <View style={styles.preferenceCopy}>
            <Subtitle>{t(language, 'autoGuide')}</Subtitle>
            <Body>{t(language, 'autoGuideHelp')}</Body>
          </View>
          <Switch
            value={autoGuide}
            onValueChange={setAutoGuide}
            trackColor={{ false: theme.colors.line, true: theme.colors.accentSoft }}
            thumbColor={autoGuide ? theme.colors.accentDark : theme.colors.faint}
            ios_backgroundColor={theme.colors.line}
          />
        </Row>
      </View>

      {env.staffTools ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Calibration')}
          style={({ pressed }) => [styles.section, pressed && styles.pressed]}
        >
          <Subtitle>{pt(language, 'calibrationEntry')}</Subtitle>
          <Body>{pt(language, 'calibrationEntryHelp')}</Body>
        </Pressable>
      ) : null}

      <View style={styles.about}>
        <BrandMark size={42} />
        <View style={styles.aboutCopy}>
          <Eyebrow>{t(language, 'about')}</Eyebrow>
          <Body>{t(language, 'aboutBody')}</Body>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 4 },
  headerCopy: { flex: 1 },
  section: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2.5),
  },
  pressed: { opacity: 0.6 },
  preferenceRow: { alignItems: 'center', justifyContent: 'space-between' },
  preferenceCopy: { flex: 1, paddingRight: theme.spacing(2) },
  about: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.paper,
    borderRadius: 12,
    padding: theme.spacing(2.25),
    marginTop: theme.spacing(1),
  },
  aboutCopy: { flex: 1 },
});
