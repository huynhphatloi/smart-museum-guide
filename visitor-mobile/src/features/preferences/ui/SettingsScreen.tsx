import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Eyebrow, MuseumMark, Row, Screen, Subtitle, Title } from '../../../shared/ui';
import { useGuide } from '../../tour/model/GuideContext';
import { LanguagePicker } from './LanguagePicker';

export function SettingsScreen() {
  const { language, supportedLanguages, setLanguage, autoGuide, setAutoGuide } = useGuide();

  return (
    <Screen>
      <Row style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>{t(language, 'visitorPreferences')}</Eyebrow>
          <Title>{t(language, 'settings')}</Title>
        </View>
        <MuseumMark compact />
      </Row>

      <View style={styles.section}>
        <Subtitle>{t(language, 'language')}</Subtitle>
        <Body>{t(language, 'chooseLanguage')}</Body>
        <LanguagePicker languages={supportedLanguages} value={language} onChange={setLanguage} />
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

      <View style={styles.about}>
        <Text style={styles.aboutNumber}>01</Text>
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
  preferenceRow: { alignItems: 'center', justifyContent: 'space-between' },
  preferenceCopy: { flex: 1, paddingRight: theme.spacing(2) },
  about: {
    flexDirection: 'row',
    backgroundColor: theme.colors.paper,
    padding: theme.spacing(2.25),
    marginTop: theme.spacing(1),
  },
  aboutNumber: {
    width: 50,
    color: theme.colors.brass,
    fontFamily: theme.type.display,
    fontSize: 32,
    lineHeight: 36,
  },
  aboutCopy: { flex: 1 },
});
