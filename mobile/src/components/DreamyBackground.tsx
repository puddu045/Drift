import { Image, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/**
 * A dreamy sky image (AI-generated per the user's own prompt — see
 * assets/dreamy-sky.webp), covering every screen behind its content.
 * Rendered by ScreenContainer so it's automatic everywhere, including the
 * sign-in screen.
 */
export function DreamyBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      <Image
        source={require('../../assets/dreamy-sky.webp')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background,
  },
});
