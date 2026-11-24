import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, palette } from '@/theme';

/**
 * A soft, mostly-neutral gradient plus a couple of large, low-opacity color
 * blobs — reads as a dreamy sky rather than a flat background, without
 * sacrificing text contrast (it stays close to colors.background overall).
 * Rendered behind every screen's content by ScreenContainer.
 */
export function DreamyBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.background, `${palette.blush}33`, `${palette.paleSky}2e`, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${palette.lilac}4d`, 'transparent']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobTopRight}
      />
      <LinearGradient
        colors={[`${palette.apricot}40`, 'transparent']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobBottomLeft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blobTopRight: {
    position: 'absolute',
    top: -130,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -110,
    left: -130,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
});
