import { Image, StyleSheet, Text, View } from 'react-native';

import { moodColors, moodIcons, MoodId, palette, radius, spacing, typography } from '@/theme';

const moodLabels: Record<MoodId, string> = {
  love: 'Love',
  deep: 'Deep',
  happy: 'Happy',
  reflective: 'Reflective',
  hopeful: 'Hopeful',
  random: 'Random',
  lonely: 'Lonely',
  curious: 'Curious',
};

export function MoodTag({ mood }: { mood: MoodId }) {
  const icon = moodIcons[mood];
  return (
    <View style={[styles.tag, { backgroundColor: moodColors[mood] }]}>
      {icon && <Image source={icon} style={styles.icon} resizeMode="contain" />}
      <Text style={styles.label}>{moodLabels[mood]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  icon: {
    width: 14,
    height: 14,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    // Mood badges are always a light pastel in every palette, so this stays
    // the palette's dark anchor tone regardless of the app's overall theme.
    color: palette.navy,
  },
});
