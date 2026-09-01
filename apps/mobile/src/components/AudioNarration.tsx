import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './UI';

interface Props {
  url: string | null;
  playLabel: string;
  emptyLabel: string;
  /**
   * Playback never starts on its own unless the visitor has explicitly enabled
   * it - a museum gallery is a quiet place.
   */
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

  // A new URL means a new language or a new exhibit: drop the old track.
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

  if (!url) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  return (
    <View>
      <Button
        label={playing ? '❙❙  ' + playLabel : '▶  ' + playLabel}
        onPress={toggle}
        loading={loading}
      />
      {error ? <Text style={styles.empty}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.colors.muted, fontSize: 14, marginTop: 8 },
});
