import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import {
  Body,
  Button,
  Eyebrow,
  MuseumMark,
  Row,
  Screen,
  Subtitle,
  Title,
} from '../../../shared/ui';
import { useGuide } from '../model/GuideContext';

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    language,
    scanning,
    startScanning,
    stopScanning,
    snapshot,
    exhibit,
    exhibitLoading,
    exhibitError,
    prompt,
    dismissPrompt,
    bleError,
    reloadExhibit,
  } = useGuide();

  const hero = exhibit?.exhibit.media.find((item) => item.type === 'IMAGE');
  const zoneName = exhibit?.zone.name ?? snapshot.confirmedZone;

  return (
    <Screen>
      <Row style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>{zoneName ? t(language, 'currentZone') : 'Museum collection'}</Eyebrow>
          <Title>{zoneName ?? t(language, 'explore')}</Title>
        </View>
        <MuseumMark compact />
      </Row>

      <View style={[styles.guideBar, scanning && styles.guideBarActive]}>
        <View style={[styles.statusDot, scanning && styles.statusDotActive]} />
        <View style={styles.guideCopy}>
          <Text style={styles.guideTitle}>
            {scanning ? t(language, 'scanning') : t(language, 'scanningStopped')}
          </Text>
          <Text style={styles.guideHint}>
            {scanning ? t(language, 'autoGuideHelp') : t(language, 'useQrInstead')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void (scanning ? stopScanning() : startScanning())}
          style={({ pressed }) => [styles.guideAction, pressed && styles.pressed]}
        >
          <Text style={styles.guideActionText}>
            {scanning ? t(language, 'stopScanning') : t(language, 'startScanning')}
          </Text>
        </Pressable>
      </View>

      {prompt ? (
        <View style={styles.prompt}>
          <Eyebrow>{t(language, 'youAreIn', { zone: prompt.zoneName })}</Eyebrow>
          <Subtitle>{t(language, 'listenPrompt')}</Subtitle>
          <Row style={styles.promptActions}>
            <View style={styles.flexButton}>
              <Button
                label={t(language, 'listen')}
                onPress={() => {
                  dismissPrompt();
                  navigation.navigate('ExhibitDetail', { autoPlay: true });
                }}
              />
            </View>
            <View style={styles.flexButton}>
              <Button
                label={t(language, 'viewDetails')}
                variant="secondary"
                onPress={() => {
                  dismissPrompt();
                  navigation.navigate('ExhibitDetail', { autoPlay: false });
                }}
              />
            </View>
          </Row>
          <Pressable onPress={dismissPrompt} style={styles.dismissButton}>
            <Text style={styles.dismissText}>{t(language, 'dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}

      {bleError ? <Text style={styles.errorText}>{bleError}</Text> : null}

      <View style={styles.content}>
        {exhibitLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentDark} />
          </View>
        ) : exhibitError ? (
          <View style={styles.message}>
            <MuseumMark compact />
            <Body>
              {exhibitError.code === 'NO_ACTIVE_EXHIBIT'
                ? t(language, 'noExhibit')
                : t(language, 'networkError')}
            </Body>
            <Button
              label={t(language, 'retry')}
              variant="ghost"
              onPress={() => void reloadExhibit()}
            />
          </View>
        ) : exhibit ? (
          <View style={styles.feature}>
            {hero ? (
              <Image source={{ uri: hero.url }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imageFallback}>
                <MuseumMark />
              </View>
            )}
            <View style={styles.featureCopy}>
              <Eyebrow>
                {exhibit.zone.code} · {exhibit.zone.name}
              </Eyebrow>
              <Text style={styles.exhibitTitle}>{exhibit.exhibit.title}</Text>
              {exhibit.exhibit.shortDescription ? (
                <Body>{exhibit.exhibit.shortDescription}</Body>
              ) : null}
              <Button
                label={t(language, 'viewDetails')}
                onPress={() => navigation.navigate('ExhibitDetail', { autoPlay: false })}
              />
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.orbitOuter}>
              <View style={styles.orbitInner} />
            </View>
            <Subtitle>
              {scanning ? t(language, 'scanning') : t(language, 'scanningStopped')}
            </Subtitle>
            <Body>{t(language, 'welcomeBody')}</Body>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  headerCopy: { flex: 1, paddingRight: theme.spacing(2) },
  guideBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: theme.spacing(1.25),
    marginBottom: theme.spacing(2.5),
  },
  guideBarActive: { borderColor: theme.colors.brass },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.faint },
  statusDotActive: { backgroundColor: theme.colors.success },
  guideCopy: { flex: 1, paddingHorizontal: theme.spacing(1.25) },
  guideTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 13,
    fontWeight: '600',
  },
  guideHint: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 11, marginTop: 2 },
  guideAction: { paddingVertical: 8, paddingLeft: 12 },
  guideActionText: {
    color: theme.colors.accent,
    fontFamily: theme.type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: { opacity: 0.65 },
  prompt: {
    backgroundColor: theme.colors.brassSoft,
    borderLeftWidth: 3,
    borderColor: theme.colors.brass,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2.5),
  },
  promptActions: { flexWrap: 'wrap', marginTop: 6 },
  flexButton: { flexGrow: 1, flexBasis: 130 },
  dismissButton: { alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12 },
  dismissText: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 12 },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.type.body,
    fontSize: 13,
    marginBottom: theme.spacing(2),
  },
  content: { flex: 1 },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  message: { gap: theme.spacing(1.5), paddingVertical: theme.spacing(4) },
  feature: { backgroundColor: theme.colors.paper, borderBottomRightRadius: theme.radius.lg },
  image: {
    width: '100%',
    height: 252,
    borderTopLeftRadius: theme.radius.arch,
    borderTopRightRadius: theme.radius.arch,
  },
  imageFallback: {
    height: 252,
    borderTopLeftRadius: theme.radius.arch,
    borderTopRightRadius: theme.radius.arch,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: { padding: theme.spacing(2.25), paddingBottom: theme.spacing(2.75) },
  exhibitTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.display,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.7,
    lineHeight: 35,
    marginBottom: theme.spacing(1),
  },
  empty: {
    alignItems: 'flex-start',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(5),
  },
  orbitOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  orbitInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.brass,
  },
});
