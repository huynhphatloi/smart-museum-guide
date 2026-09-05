import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../shared/theme';

interface Props {
  url: string | null;
  playLabel: string;
  emptyLabel: string;
  autoPlay?: boolean;
}

export function AudioNarration({ url, playLabel, emptyLabel, autoPlay = false }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unload = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    void unload();
    setError(null);
    return () => {
      void unload();
    };
  }, [url, unload]);

  const toggle = useCallback(async () => {
    if (!url) return;

    try {
      if (soundRef.current) {
        if (playing) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
        return;
      }

      setLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlaying(false);
      });
    } catch {
      setError(emptyLabel);
    } finally {
      setLoading(false);
    }
  }, [url, playing, emptyLabel]);

  useEffect(() => {
    if (autoPlay && url) void toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, url]);

  if (!url) return <Text style={styles.empty}>{emptyLabel}</Text>;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        onPress={() => void toggle()}
        style={({ pressed }) => [styles.player, pressed && styles.playerPressed]}
      >
        <View style={styles.control}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.accentDark} />
          ) : (
            <Text style={styles.controlGlyph}>{playing ? 'Ⅱ' : '▶'}</Text>
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>AUDIO GUIDE</Text>
          <Text style={styles.label}>{playLabel}</Text>
        </View>
        <View style={styles.waveform}>
          {[9, 18, 13, 24, 17, 10].map((height, index) => (
            <View key={index} style={[styles.wave, { height }]} />
          ))}
        </View>
      </Pressable>
      {error ? <Text style={styles.empty}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brassSoft,
    paddingHorizontal: theme.spacing(1.5),
  },
  playerPressed: { opacity: 0.78, transform: [{ translateY: 1 }] },
  control: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlGlyph: { color: theme.colors.accentDark, fontSize: 16, marginLeft: 2 },
  copy: { flex: 1, paddingHorizontal: theme.spacing(1.5) },
  kicker: {
    color: theme.colors.brass,
    fontFamily: theme.type.body,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  label: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 15, fontWeight: '600' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  wave: { width: 2, backgroundColor: theme.colors.accent, borderRadius: 1 },
  empty: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 13, marginTop: 8 },
});
