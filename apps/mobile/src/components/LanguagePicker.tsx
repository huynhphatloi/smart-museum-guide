import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { languageLabel } from '../i18n';
import { theme } from '../theme';

export function LanguagePicker({
  languages,
  value,
  onChange,
}: {
  languages: string[];
  value: string;
  onChange: (language: string) => void;
}) {
  return (
    <View style={styles.wrapper}>
      {languages.map((language) => {
        const active = language.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={language}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(language)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {languageLabel(language)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  label: { fontSize: 14, color: theme.colors.ink },
  labelActive: { color: '#FFFFFF', fontWeight: '600' },
});
