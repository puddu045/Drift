import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES } from '@/features/profile/languages';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  selected: string | null;
  onCancel: () => void;
  onSelect: (code: string | null) => void;
};

export function LanguagePickerModal({ selected, onCancel, onSelect }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={styles.card}>
          <Text style={styles.label}>Translate thoughts into</Text>
          <Text style={styles.hint}>
            Thoughts, replies and bios posted in any language will be shown to you translated into this one.
            Doesn&rsquo;t change what you post — only what you see.
          </Text>
          <ScrollView style={styles.list}>
            <Option label="Off — show exactly as written" active={selected === null} onPress={() => onSelect(null)} />
            {LANGUAGES.map((language) => (
              <Option
                key={language.code}
                label={language.label}
                active={selected === language.code}
                onPress={() => onSelect(language.code)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
      {active && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 53, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  list: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  optionLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
  check: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.accent,
    fontWeight: typography.weight.bold,
  },
});
