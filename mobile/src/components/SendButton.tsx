import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from '@/i18n';
import { PillGradient } from './PillGradient';

export function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.send')}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}>
      <PillGradient />
      <Ionicons name="paper-plane" color="white" size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.55 },
});
