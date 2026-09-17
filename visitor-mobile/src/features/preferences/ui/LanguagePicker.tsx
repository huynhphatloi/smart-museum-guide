import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageOption } from '../../../shared/api/types';
import { languageLabel } from '../../../shared/i18n';
import { theme } from '../../../shared/theme';
import { findLanguageOption } from '../model/language-options';

const ROW_HEIGHT = 58;

/**
 * A dropdown instead of inline buttons: the museum can offer thirty-odd
 * languages (whatever its AI service can translate and narrate), which no
 * longer fit on one screen as buttons.
 */
export function LanguagePicker({
  options,
  value,
  onChange,
  title,
  closeLabel,
}: {
  options: LanguageOption[];
  value: string;
  onChange: (language: string) => void;
  title: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = findLanguageOption(options, value);
  const currentLabel = current?.nativeName ?? languageLabel(value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option === current),
  );

  function choose(code: string) {
    setOpen(false);
    if (code.toLowerCase() !== value.toLowerCase()) onChange(code);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${currentLabel}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerLabel}>{currentLabel}</Text>
          {current && current.name !== current.nativeName && current.name !== current.code ? (
            <Text style={styles.secondary}>{current.name}</Text>
          ) : null}
        </View>
        <Text style={styles.chevron} accessibilityElementsHidden>
          ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={closeLabel}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing(1) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                hitSlop={12}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.close}>{closeLabel}</Text>
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(option) => option.code}
              initialScrollIndex={options.length > 8 ? selectedIndex : undefined}
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
              renderItem={({ item }) => {
                const selected = item === current;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => choose(item.code)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {item.nativeName}
                      </Text>
                      {item.name !== item.nativeName && item.name !== item.code ? (
                        <Text style={styles.secondary}>{item.name}</Text>
                      ) : null}
                    </View>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 3,
    marginTop: theme.spacing(1.25),
  },
  triggerCopy: { flex: 1 },
  triggerLabel: {
    fontFamily: theme.type.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  chevron: { fontSize: 16, color: theme.colors.accent, paddingLeft: theme.spacing(1) },
  secondary: {
    fontFamily: theme.type.body,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 1,
  },
  pressed: { opacity: 0.6 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(32, 29, 25, 0.35)',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: theme.colors.paper,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2.5),
    paddingTop: theme.spacing(2),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderColor: theme.colors.line,
  },
  sheetTitle: { fontFamily: theme.type.display, fontSize: 22, color: theme.colors.ink },
  close: { fontFamily: theme.type.body, fontSize: 14, color: theme.colors.accentDark },
  option: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.line,
  },
  optionSelected: {
    backgroundColor: theme.colors.brassSoft,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontFamily: theme.type.body, fontSize: 16, color: theme.colors.ink },
  optionLabelSelected: { fontWeight: '600' },
  check: { fontSize: 16, color: theme.colors.accent, paddingLeft: theme.spacing(1) },
});
