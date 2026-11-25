import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', style, disabled }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  labelPrimary: {
    color: colors.onAccent,
  },
  labelGhost: {
    color: colors.textPrimary,
  },
});
