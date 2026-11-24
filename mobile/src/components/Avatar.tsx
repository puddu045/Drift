import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme';

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
};

export function Avatar({ name, photoUrl, size = 36 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimension]} />;
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.placeholder, dimension]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
});
