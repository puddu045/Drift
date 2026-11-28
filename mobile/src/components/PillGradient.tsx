import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { radius } from '@/theme';

const fills = {
  brand: ['#21395F', '#405D89', '#655784'],
  accept: ['#ACD6BD', '#C7E5D2', '#ACD6BD'],
  destructive: ['#EBB9C1', '#F6D2D7', '#EBB9C1'],
  secondary: ['#F4F0F8', '#E6EBF5', '#DDE6F2'],
} as const;

export function PillGradient({ tone = 'brand' }: { tone?: keyof typeof fills }) {
  const horizontal = tone === 'accept' || tone === 'destructive';
  return (
    <LinearGradient pointerEvents="none" colors={fills[tone]}
      start={{ x: 0, y: horizontal ? 0.5 : 0 }} end={{ x: 1, y: horizontal ? 0.5 : 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
    />
  );
}
