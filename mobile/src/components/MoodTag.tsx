import { Image, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { moodColors, moodIcons, MoodId, palette, radius, spacing, typography } from '@/theme';

const moodKeys: Record<MoodId, 'mood.love' | 'mood.deep' | 'mood.happy' | 'mood.reflective' | 'mood.hopeful' | 'mood.random' | 'mood.lonely' | 'mood.curious'> = {
  love: 'mood.love',
  deep: 'mood.deep',
  happy: 'mood.happy',
  reflective: 'mood.reflective',
  hopeful: 'mood.hopeful',
  random: 'mood.random',
  lonely: 'mood.lonely',
  curious: 'mood.curious',
};

export function MoodTag({ mood }: { mood: MoodId }) {
  const { t } = useTranslation();
  const icon = moodIcons[mood];
  return (
    <View style={[styles.tag, { backgroundColor: moodColors[mood] }]}>
      {icon && <Image source={icon} style={styles.icon} resizeMode="contain" />}
      <Text style={styles.label}>{t(moodKeys[mood])}</Text>
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
