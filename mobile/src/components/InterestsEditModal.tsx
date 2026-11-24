import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Interest } from '@/features/profile/api';
import { colors, radius, spacing, typography } from '@/theme';

const MAX_INTERESTS = 20;

type Props = {
  allInterests: Interest[];
  selectedIds: string[];
  onCancel: () => void;
  onSave: (ids: string[]) => void;
};

export function InterestsEditModal({ allInterests, selectedIds, onCancel, onSave }: Props) {
  // Remounted by the caller each time it opens, so a lazy initial state is
  // enough to pick up the current selection — same pattern as EditFieldModal.
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_INTERESTS) next.add(id);
      return next;
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={styles.card}>
          <Text style={styles.label}>Interests</Text>
          <Text style={styles.hint}>Pick up to {MAX_INTERESTS}. Visible on your public profile.</Text>
          <ScrollView style={styles.chipScroll}>
            <View style={styles.chips}>
              {allInterests.map((interest) => {
                const selected = draft.has(interest.id);
                return (
                  <Pressable
                    key={interest.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggle(interest.id)}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{interest.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.actionButton} />
            <Button label="Save" onPress={() => onSave([...draft])} style={styles.actionButton} />
          </View>
        </View>
      </View>
    </Modal>
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
  chipScroll: {
    maxHeight: 280,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(169, 201, 245, 0.16)',
  },
  chipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
