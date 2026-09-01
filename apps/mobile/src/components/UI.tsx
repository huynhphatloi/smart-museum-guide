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
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
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
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.colors.ink} />
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
  const background =
    tone === 'good'
      ? '#E2F0E8'
      : tone === 'warn'
        ? '#F7ECD5'
        : tone === 'bad'
          ? '#F6E0E0'
          : theme.colors.accentSoft;
  const color =
    tone === 'good'
      ? theme.colors.success
      : tone === 'warn'
        ? theme.colors.warning
        : tone === 'bad'
          ? theme.colors.danger
          : theme.colors.accent;

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  screenInner: { flex: 1, paddingHorizontal: theme.spacing(2.5) },
  scrollContent: { flexGrow: 1, paddingBottom: theme.spacing(5) },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: theme.spacing(0.5),
  },
  body: { fontSize: 15, lineHeight: 23, color: theme.colors.muted },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
  },
  button: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(2.5),
    marginTop: theme.spacing(1),
  },
  buttonPrimary: { backgroundColor: theme.colors.ink },
  buttonSecondary: { backgroundColor: theme.colors.accentSoft },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.line },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  buttonLabelPrimary: { color: '#FFFFFF' },
  buttonLabelDark: { color: theme.colors.ink },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  divider: { height: 1, backgroundColor: theme.colors.line, marginVertical: theme.spacing(1.5) },
});
