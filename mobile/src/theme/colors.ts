// "Soft Dawn" palette — see /DESIGN_SYSTEM.md for the approved tokens.

import { ImageSourcePropType } from 'react-native';

export const palette = {
  blush: '#F6D6E0',
  apricot: '#F8C9A7',
  lilac: '#D8C9F0',
  paleSky: '#BFE1F6',
  warmWhite: '#FFFBF7',
  navy: '#15213B',
} as const;

export const colors = {
  background: palette.warmWhite,
  surface: '#FBF2F6',
  surfaceGlass: 'rgba(216, 201, 240, 0.18)',
  border: 'rgba(21, 33, 59, 0.12)',
  textPrimary: palette.navy,
  textSecondary: 'rgba(21, 33, 59, 0.62)',
  accent: palette.apricot,
  onAccent: palette.navy,
  danger: '#D94F70',
} as const;

export type MoodId =
  | 'love'
  | 'deep'
  | 'happy'
  | 'reflective'
  | 'hopeful'
  | 'random'
  | 'lonely'
  | 'curious';

export const moodColors: Record<MoodId, string> = {
  love: palette.blush,
  deep: palette.lilac,
  happy: palette.apricot,
  reflective: palette.paleSky,
  hopeful: palette.apricot,
  random: palette.paleSky,
  lonely: palette.paleSky,
  curious: palette.lilac,
};

// Small flat pastel icons (AI-generated per the user's own prompt), one per
// mood — 'lonely' has none yet, so callers must handle it being undefined.
export const moodIcons: Partial<Record<MoodId, ImageSourcePropType>> = {
  love: require('../../assets/mood-love.png'),
  deep: require('../../assets/mood-deep.png'),
  happy: require('../../assets/mood-happy.png'),
  reflective: require('../../assets/mood-reflective.png'),
  hopeful: require('../../assets/mood-hopeful.png'),
  random: require('../../assets/mood-random.png'),
  curious: require('../../assets/mood-curious.png'),
};
