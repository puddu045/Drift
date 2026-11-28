import { useFonts } from 'expo-font';
import { Text } from 'react-native';

import { colors } from '@/theme';

const wordmarkFont = { DancingScript: require('../../assets/fonts/DancingScript_500Medium.ttf') };

export function UnwrittenWordmark({ size, color = colors.textPrimary }: { size: number; color?: string }) {
  const [loaded] = useFonts(wordmarkFont);
  return (
    <Text style={{ fontFamily: loaded ? 'DancingScript' : undefined, fontSize: size, color }}>
      Unwritten
    </Text>
  );
}
