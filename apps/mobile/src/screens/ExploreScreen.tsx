import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Pill, Row, Screen, Subtitle, Title } from '../components/UI';
import { useGuide } from '../context/GuideContext';
import { t } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

/**
 * The main scanning screen. It shows what the detector currently believes and
 * offers - never forces - the narration for the confirmed zone.
 */
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
    isSimulation,
    reloadExhibit,
  } = useGuide();

  const hero = exhibit?.exhibit.media.find((item) => item.type === 'IMAGE');

  return (
    <Screen>
      <Row style={styles.header}>
        <Title>{t(language, 'explore')}</Title>
        <Pill
          label={isSimulation ? t(language, 'simulationBadge') : t(language, 'realBleBadge')}
          tone={isSimulation ? 'warn' : 'good'}
        />
      </Row>

      {prompt ? (
        <Card style={styles.prompt}>
          <Subtitle>{t(language, 'youAreIn', { zone: prompt.zoneName })}</Subtitle>
          <Body>{t(language, 'listenPrompt')}</Body>
          <Row style={{ marginTop: 12, flexWrap: 'wrap' }}>
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
          <Button label={t(language, 'dismiss')} variant="ghost" onPress={dismissPrompt} />
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>{t(language, 'bleStatus')}</Subtitle>
          <Pill
            label={snapshot.state}
            tone={
              snapshot.state === 'CONTENT_ACTIVE'
                ? 'good'
                : snapshot.state === 'IDLE'
                  ? 'bad'
                  : 'warn'
            }
          />
        </Row>
        <Text style={styles.status}>
          {scanning ? t(language, 'scanning') : t(language, 'scanningStopped')}
        </Text>

        <View style={styles.metrics}>
          <Metric label={t(language, 'currentZone')} value={snapshot.confirmedZone ?? '—'} />
          <Metric label={t(language, 'candidate')} value={snapshot.candidateZone ?? '—'} />
          <Metric
            label={t(language, 'dwell')}
            value={`${Math.round(snapshot.dwellProgress * 100)}%`}
          />
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${Math.round(snapshot.dwellProgress * 100)}%` }]}
          />
        </View>

        <Button
          label={scanning ? t(language, 'stopScanning') : t(language, 'startScanning')}
          variant={scanning ? 'ghost' : 'primary'}
          onPress={() => void (scanning ? stopScanning() : startScanning())}
        />
      </Card>

      {bleError ? (
        <Card style={styles.error}>
          <Text style={styles.errorText}>{bleError}</Text>
        </Card>
      ) : null}

      {exhibitLoading ? (
        <Card>
          <ActivityIndicator />
        </Card>
      ) : exhibitError ? (
        <Card style={styles.error}>
          <Text style={styles.errorText}>
            {exhibitError.code === 'NO_ACTIVE_EXHIBIT'
              ? t(language, 'noExhibit')
              : t(language, 'networkError')}
          </Text>
          <Button
            label={t(language, 'retry')}
            variant="ghost"
            onPress={() => void reloadExhibit()}
          />
        </Card>
      ) : exhibit ? (
        <Card>
          <Text style={styles.zoneLabel}>
            {exhibit.zone.code} · {exhibit.zone.name}
          </Text>
          {hero ? (
            <Image source={{ uri: hero.url }} style={styles.image} resizeMode="cover" />
          ) : null}
          <Subtitle>{exhibit.exhibit.title}</Subtitle>
          {exhibit.exhibit.shortDescription ? (
            <Body>{exhibit.exhibit.shortDescription}</Body>
          ) : null}
          <Button
            label={t(language, 'viewDetails')}
            onPress={() => navigation.navigate('ExhibitDetail', { autoPlay: false })}
          />
        </Card>
      ) : (
        <Card>
          <Body>{t(language, 'scanning')}</Body>
        </Card>
      )}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { justifyContent: 'space-between', paddingTop: theme.spacing(1) },
  prompt: { backgroundColor: theme.colors.accentSoft, borderColor: '#DFCDBA' },
  flexButton: { flexGrow: 1, flexBasis: 130 },
  status: { color: theme.colors.muted, marginTop: 4, marginBottom: 12, fontSize: 14 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metric: { flex: 1 },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: { fontSize: 15, fontWeight: '600', color: theme.colors.ink, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.line,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: theme.colors.accent },
  zoneLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 8,
  },
  image: { width: '100%', height: 170, borderRadius: theme.radius.sm, marginBottom: 12 },
  error: { backgroundColor: '#F6E0E0', borderColor: '#E4B7B7' },
  errorText: { color: theme.colors.danger, fontSize: 14 },
});
