import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { languageLabel } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';

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
            style={({ pressed }) => [
              styles.option,
              active && styles.optionActive,
              pressed && styles.optionPressed,
            ]}
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
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: theme.spacing(1.25),
  },
  option: {
    borderBottomWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 3,
    paddingVertical: 8,
    marginRight: 10,
  },
  optionActive: { borderBottomWidth: 2, borderColor: theme.colors.accent },
  optionPressed: { opacity: 0.6 },
  label: { fontFamily: theme.type.body, fontSize: 14, color: theme.colors.muted },
  labelActive: { color: theme.colors.ink, fontWeight: '600' },
});
