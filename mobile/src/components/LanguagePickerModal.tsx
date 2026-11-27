import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES } from '@/features/profile/languages';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  selected: string | null;
  onSelect: (code: string) => void;
  /** Settings-row use (changing an already-set language) can be dismissed
   * without picking one; the mandatory first-time prompt can't — omit
   * onCancel there so there's no way out except choosing. */
  onCancel?: () => void;
};

export function LanguagePickerModal({ selected, onSelect, onCancel }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {onCancel && (
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        )}
        <View style={styles.card}>
          <Text style={styles.label}>Default translation language</Text>
          <Text style={styles.hint}>
            Whenever you tap Translate on a post, reply or bio, it&rsquo;s translated into this language.
            Doesn&rsquo;t change what you post — only what Translate shows you.
          </Text>
          <ScrollView style={styles.list}>
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
