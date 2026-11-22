import { StyleSheet, Text, View } from 'react-native';

import { moodColors, MoodId, radius, spacing, typography } from '@/theme';

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
  return (
    <View style={[styles.tag, { backgroundColor: moodColors[mood] }]}>
      <Text style={styles.label}>{moodLabels[mood]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: '#101A35',
  },
});
