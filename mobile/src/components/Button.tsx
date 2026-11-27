import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Rendered to the left of the label — for a one-off like a paper-plane
   * "send" icon. Most buttons don't need this. */
  icon?: ReactNode;
  /** Overrides the variant's default label color — for a one-off like dark
   * text that doesn't match either variant's usual color. */
  labelColor?: string;
};

export function Button({ label, onPress, variant = 'primary', style, disabled, icon, labelColor }: Props) {
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
      <View style={styles.row}>
        {icon}
        <Text
          style={[
            styles.label,
            isPrimary ? styles.labelPrimary : styles.labelGhost,
            labelColor && { color: labelColor },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </Text>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
