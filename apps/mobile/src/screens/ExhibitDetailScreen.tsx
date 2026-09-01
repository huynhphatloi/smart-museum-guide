import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AudioNarration } from '../components/AudioNarration';
import { LanguagePicker } from '../components/LanguagePicker';
import { Body, Button, Card, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { languageLabel, t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

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
        <ActivityIndicator style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (exhibitError || !exhibit) {
    return (
      <Screen>
        <Card style={styles.error}>
          <Text style={styles.errorText}>
            {exhibitError?.code === 'NO_ACTIVE_EXHIBIT'
              ? t(language, 'noExhibit')
              : t(language, 'networkError')}
          </Text>
          <Button
            label={t(language, 'retry')}
            variant="ghost"
            onPress={() => void reloadExhibit()}
          />
        </Card>
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
    <Screen>
      {hero ? <Image source={{ uri: hero.url }} style={styles.hero} resizeMode="cover" /> : null}

      <Text style={styles.zone}>
        {zone.code} · {zone.name}
      </Text>
      <Title>{content.title}</Title>
      {content.shortDescription ? <Body>{content.shortDescription}</Body> : null}

      {content.translationFallback ? (
        <Card style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {t(language, 'fallbackNotice', { language: languageLabel(content.language) })}
          </Text>
        </Card>
      ) : null}

      <View style={{ height: 16 }} />
      <AudioNarration
        url={content.audioUrl}
        playLabel={t(language, 'listen')}
        emptyLabel={t(language, 'noAudio')}
        autoPlay={autoPlay}
      />

      <View style={{ height: 20 }} />
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}

      {images.length > 1 ? (
        <View style={styles.gallery}>
          {images.slice(1).map((item) => (
            <Image
              key={item.id}
              source={{ uri: item.url }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}

      <Card style={{ marginTop: 20 }}>
        <Subtitle>{t(language, 'language')}</Subtitle>
        <View style={{ height: 10 }} />
        <LanguagePicker
          languages={
            supportedLanguages.length > 0 ? supportedLanguages : content.availableLanguages
          }
          value={language}
          onChange={setLanguage}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    marginTop: 8,
  },
  zone: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 6,
  },
  paragraph: { fontSize: 16, lineHeight: 26, color: theme.colors.ink, marginBottom: 14 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  galleryImage: { width: '48%', aspectRatio: 1, borderRadius: theme.radius.sm },
  fallback: { backgroundColor: '#F7ECD5', borderColor: '#E4CFA4', marginTop: 12 },
  fallbackText: { color: theme.colors.warning, fontSize: 14 },
  error: { backgroundColor: '#F6E0E0', borderColor: '#E4B7B7', marginTop: 20 },
  errorText: { color: theme.colors.danger, fontSize: 14 },
});
