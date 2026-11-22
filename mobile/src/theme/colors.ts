// "Midnight Dreamscape" palette — see /DESIGN_SYSTEM.md for the approved tokens.

export const palette = {
  navy: '#101A35',
  deepBlue: '#24365E',
  pastelBlue: '#A9C9F5',
  lavender: '#C8B7F0',
  softPink: '#F2C7DA',
  peach: '#F4D1BD',
  offWhite: '#F8F9FD',
} as const;

export const colors = {
  background: palette.navy,
  surface: palette.deepBlue,
  surfaceGlass: 'rgba(169, 201, 245, 0.12)',
  border: 'rgba(248, 249, 253, 0.16)',
  textPrimary: palette.offWhite,
  textSecondary: 'rgba(248, 249, 253, 0.68)',
  accent: palette.pastelBlue,
  danger: '#E8879A',
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
  love: palette.softPink,
  deep: palette.lavender,
  happy: palette.peach,
  reflective: palette.deepBlue,
  hopeful: palette.peach,
  random: palette.pastelBlue,
  lonely: palette.deepBlue,
  curious: palette.lavender,
};
