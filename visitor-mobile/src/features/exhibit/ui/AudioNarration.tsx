import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../../shared/theme';
import { NarrationSession, NarrationState } from '../model/narration-player';
import { narrationPlayer } from '../model/shared-narration-player';

interface Props {
  url: string | null;
  playLabel: string;
  emptyLabel: string;
  autoPlay?: boolean;
}

export function AudioNarration({ url, playLabel, emptyLabel, autoPlay = false }: Props) {
  const focused = useIsFocused();
  const sessionRef = useRef<NarrationSession | null>(null);
  const [state, setState] = useState<NarrationState>({
    playing: false,
    loading: false,
    error: false,
  });
  const { playing, loading, error } = state;

  useEffect(() => {
    if (!focused || !url) return;
    let active = true;
    const session = narrationPlayer.open(url, (next) => {
      if (active) setState(next);
    });
    sessionRef.current = session;
    return () => {
      active = false;
      sessionRef.current = null;
      void session.close();
    };
  }, [focused, url]);

  useEffect(() => {
    if (focused && autoPlay && url) void sessionRef.current?.play();
  }, [focused, autoPlay, url]);

  const toggle = useCallback(() => sessionRef.current?.toggle(), []);

  if (!url) return <Text style={styles.empty}>{emptyLabel}</Text>;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        accessibilityState={{ disabled: loading || !focused, busy: loading }}
        disabled={loading || !focused}
        onPress={() => void toggle()}
        style={({ pressed }) => [styles.player, pressed && styles.playerPressed]}
      >
        <View style={styles.control}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.accentDark} />
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
              {playing ? (
                <Path
                  d="M8 5v14M16 5v14"
                  stroke={theme.colors.accentDark}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ) : (
                <Path d="m8 5 11 7-11 7V5Z" fill={theme.colors.accentDark} />
              )}
            </Svg>
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
      {error ? <Text style={styles.empty}>{emptyLabel}</Text> : null}
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
