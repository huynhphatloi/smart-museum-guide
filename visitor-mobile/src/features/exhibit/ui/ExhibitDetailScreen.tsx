import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../../application/navigation/types';
import { languageLabel, t } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, MuseumMark, Screen, Subtitle, Title } from '../../../shared/ui';
import { LanguagePicker } from '../../preferences/ui/LanguagePicker';
import { useGuide } from '../../tour/model/GuideContext';
import { AudioNarration } from './AudioNarration';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitDetail'>;

export function ExhibitDetailScreen({ route }: Props) {
  const autoPlay = route.params?.autoPlay ?? false;
  const {
    language,
    supportedLanguages,
    setLanguage,
    exhibit,
    exhibitLoading,
    exhibitError,
    reloadExhibit,
  } = useGuide();

  if (exhibitLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accentDark} />
        </View>
      </Screen>
    );
  }

  if (exhibitError || !exhibit) {
    return (
      <Screen>
        <View style={styles.message}>
          <MuseumMark />
          <Body>
            {exhibitError?.code === 'NO_ACTIVE_EXHIBIT'
              ? t(language, 'noExhibit')
              : t(language, 'networkError')}
          </Body>
          <Button
            label={t(language, 'retry')}
            variant="ghost"
            onPress={() => void reloadExhibit()}
          />
        </View>
      </Screen>
    );
  }

  const { exhibit: content, zone } = exhibit;
  const images = content.media.filter((item) => item.type === 'IMAGE');
  const hero = images[0];
  const paragraphs = (content.description ?? '')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  return (
    <Screen style={styles.screen}>
      {hero ? (
        <Image source={{ uri: hero.url }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={styles.heroFallback}>
          <MuseumMark />
        </View>
      )}

      <View style={styles.heading}>
        <Eyebrow>
          {zone.code} · {zone.name}
        </Eyebrow>
        <Title>{content.title}</Title>
        {content.shortDescription ? <Body>{content.shortDescription}</Body> : null}
      </View>

      {content.translationFallback ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {t(language, 'fallbackNotice', { language: languageLabel(content.language) })}
          </Text>
        </View>
      ) : null}

      <AudioNarration
        url={content.audioUrl}
        playLabel={t(language, 'listen')}
        emptyLabel={t(language, 'noAudio')}
        autoPlay={autoPlay}
      />

      <View style={styles.story}>
        <Eyebrow>{t(language, 'aboutThisWork')}</Eyebrow>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>

      {images.length > 1 ? (
        <View style={styles.gallery}>
          {images.slice(1).map((item, index) => (
            <Image
              key={item.id}
              source={{ uri: item.url }}
              style={[styles.galleryImage, index % 2 === 1 && styles.galleryImageOffset]}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}

      <View style={styles.languageSection}>
        <Subtitle>{t(language, 'language')}</Subtitle>
        <LanguagePicker
          languages={
            supportedLanguages.length > 0 ? supportedLanguages : content.availableLanguages
          }
          value={language}
          onChange={setLanguage}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing(0.5) },
  loading: { minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  message: { gap: theme.spacing(2), paddingVertical: theme.spacing(5) },
  hero: {
    width: '100%',
    height: 330,
    borderTopLeftRadius: theme.radius.arch,
    borderTopRightRadius: theme.radius.arch,
    marginBottom: theme.spacing(3),
  },
  heroFallback: {
    height: 300,
    borderTopLeftRadius: theme.radius.arch,
    borderTopRightRadius: theme.radius.arch,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  heading: { paddingBottom: theme.spacing(2.5) },
  fallback: {
    borderLeftWidth: 2,
    borderColor: theme.colors.warning,
    paddingLeft: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  fallbackText: {
    color: theme.colors.warning,
    fontFamily: theme.type.body,
    fontSize: 13,
    lineHeight: 19,
  },
  story: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(4),
    paddingTop: theme.spacing(2.5),
  },
  paragraph: {
    color: theme.colors.ink,
    fontFamily: theme.type.display,
    fontSize: 18,
    lineHeight: 29,
    marginBottom: theme.spacing(2),
  },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: theme.spacing(1) },
  galleryImage: { width: '48%', aspectRatio: 0.82, borderRadius: theme.radius.sm },
  galleryImageOffset: { marginTop: theme.spacing(3) },
  languageSection: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(4),
    paddingTop: theme.spacing(2.5),
  },
});
