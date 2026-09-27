import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { BrandMark } from '../../../shared/ui/BrandMark';
import {
  Body,
  Button,
  Eyebrow,
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
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!scanning) { pulse.setValue(1); return; }
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
      ]));
      animation.start();
    });
    return () => { active = false; animation?.stop(); pulse.setValue(1); };
  }, [pulse, scanning]);

  return (
    <Screen>
      <Row style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>{zoneName ? t(language, 'currentZone') : t(language, 'museumCollection')}</Eyebrow>
          <Title>{zoneName ?? t(language, 'explore')}</Title>
        </View>
        <BrandMark size={40} />
      </Row>

      <View style={[styles.guideBar, scanning && styles.guideBarActive]}>
        <Animated.View style={[styles.statusDot, scanning && styles.statusDotActive, { opacity: pulse }]} />
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
            <BrandMark size={48} />
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
              <View style={styles.imageWrap}><Image source={{ uri: hero.url }} style={styles.image} resizeMode="cover" /><View style={styles.imageOverlay} pointerEvents="none" /><Text style={styles.imageLabel}>{exhibit.zone.code}</Text></View>
            ) : (
              <View style={styles.imageFallback}>
                <BrandMark size={64} />
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
            <View style={styles.emptyImageWrap}><Image source={require('../../../../assets/images/isana-my-son.jpg')} style={styles.emptyImage} resizeMode="cover" accessibilityLabel="Isana statue from My Son" /><View style={styles.emptyImageShade} pointerEvents="none" /><Text style={styles.emptyImageText}>{language === 'vi' ? 'Nhìn gần hơn.\nHiểu sâu hơn.' : 'Look closer.\nDiscover more.'}</Text></View>
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
  guideAction: { minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingLeft: 12 },
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
  dismissButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 4 },
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
  feature: { backgroundColor: theme.colors.paper, borderRadius: 12, overflow: 'hidden' },
  imageWrap: { position: 'relative', height: 300, backgroundColor: theme.colors.line },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29, 22, 17, 0.12)' },
  imageLabel: { position: 'absolute', top: 15, left: 15, overflow: 'hidden', backgroundColor: theme.colors.paper, color: theme.colors.accentDark, fontFamily: theme.type.body, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 8 },
  imageFallback: {
    height: 210,
    borderRadius: 2,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: { padding: theme.spacing(2.5), paddingBottom: theme.spacing(3) },
  exhibitTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.display,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -0.7,
    lineHeight: 39,
    marginBottom: theme.spacing(1),
  },
  empty: {
    alignItems: 'flex-start',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(5),
  },
  emptyImageWrap: { width: '100%', height: 280, marginBottom: theme.spacing(2.5), overflow: 'hidden', borderRadius: 12, backgroundColor: theme.colors.line },
  emptyImage: { width: '100%', height: '100%' },
  emptyImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 17, 14, 0.38)' },
  emptyImageText: { position: 'absolute', left: 20, right: 20, bottom: 19, color: theme.colors.white, fontFamily: theme.type.display, fontSize: 34, lineHeight: 38 },
});
