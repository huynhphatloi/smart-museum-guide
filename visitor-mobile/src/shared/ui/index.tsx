import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const content = <View style={[styles.screenInner, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.ink} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'primary' ? styles.buttonLabelPrimary : styles.buttonLabelDark,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const color =
    tone === 'good'
      ? theme.colors.success
      : tone === 'warn'
        ? theme.colors.warning
        : tone === 'bad'
          ? theme.colors.danger
          : theme.colors.accent;

  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function MuseumMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.mark, compact && styles.markCompact]} accessibilityElementsHidden>
      <View style={styles.markInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.canvas },
  screenInner: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing(2.5),
    paddingTop: theme.spacing(1.5),
  },
  scrollContent: { flexGrow: 1, paddingBottom: theme.spacing(6) },
  eyebrow: {
    color: theme.colors.accent,
    fontFamily: theme.type.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    lineHeight: 16,
    textTransform: 'uppercase',
    marginBottom: theme.spacing(0.75),
  },
  title: {
    maxWidth: 560,
    color: theme.colors.ink,
    fontFamily: theme.type.display,
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -1.2,
    lineHeight: 43,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 23,
    marginBottom: theme.spacing(0.5),
  },
  body: {
    maxWidth: 540,
    color: theme.colors.muted,
    fontFamily: theme.type.body,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2.25),
    marginBottom: theme.spacing(1.5),
  },
  button: {
    minHeight: 50,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(2.5),
    marginTop: theme.spacing(1),
  },
  buttonPrimary: { backgroundColor: theme.colors.accentDark },
  buttonSecondary: { backgroundColor: theme.colors.brassSoft },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.line },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.92, transform: [{ translateY: 1 }] },
  buttonLabel: { fontFamily: theme.type.body, fontSize: 15, fontWeight: '600' },
  buttonLabelPrimary: { color: theme.colors.white },
  buttonLabelDark: { color: theme.colors.ink },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillLabel: {
    fontFamily: theme.type.body,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  divider: { height: 1, backgroundColor: theme.colors.line, marginVertical: theme.spacing(1.5) },
  mark: {
    width: 76,
    height: 92,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: theme.colors.accentDark,
    padding: 8,
    justifyContent: 'flex-end',
  },
  markCompact: {
    width: 42,
    height: 50,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    padding: 5,
  },
  markInner: {
    height: '72%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: theme.colors.brass,
  },
});
