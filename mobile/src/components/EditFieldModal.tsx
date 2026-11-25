import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onCancel: () => void;
  onSave: (value: string) => void;
};

export function EditFieldModal({
  visible,
  label,
  value,
  hint,
  multiline,
  maxLength,
  autoCapitalize,
  onCancel,
  onSave,
}: Props) {
  // The caller remounts this (via a changing `key`) each time a different
  // field opens for editing, so a plain lazy initial state is enough to pick
  // up the current value — no effect needed to "reset" it.
  const [draft, setDraft] = useState(value);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.select({ ios: 'padding', default: 'height' })}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={styles.card}>
          <Text style={styles.label}>{label}</Text>
          <TextField
            label=""
            value={draft}
            onChangeText={setDraft}
            multiline={multiline}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize ?? 'sentences'}
            autoFocus
          />
          {hint && <Text style={styles.hint}>{hint}</Text>}
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.actionButton} />
            <Button label="Save" onPress={() => onSave(draft.trim())} style={styles.actionButton} />
          </View>
        </View>
      </KeyboardAvoidingView>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
