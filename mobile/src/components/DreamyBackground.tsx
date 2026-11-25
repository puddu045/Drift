import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, palette } from '@/theme';

// Fixed (not random-per-render) so layout/animation stays a pure function —
// same reasoning as useBubbleLayout's seeded positions.
const SPARKLES = [
  { top: '8%', left: '20%', size: 3, opacity: 0.9 },
  { top: '14%', left: '72%', size: 4, opacity: 0.7 },
  { top: '22%', left: '45%', size: 2, opacity: 0.8 },
  { top: '33%', left: '85%', size: 3, opacity: 0.6 },
  { top: '41%', left: '10%', size: 2, opacity: 0.7 },
  { top: '52%', left: '62%', size: 3, opacity: 0.5 },
  { top: '61%', left: '30%', size: 2, opacity: 0.6 },
  { top: '70%', left: '88%', size: 4, opacity: 0.5 },
  { top: '78%', left: '15%', size: 2, opacity: 0.6 },
  { top: '87%', left: '55%', size: 3, opacity: 0.45 },
] as const;

/**
 * A dusk-sky gradient, a couple of large soft color blobs, a cluster of
 * cloud-like shapes low in the frame, and scattered sparkle dots — reads as
 * a dreamy sky rather than a flat background, while staying light enough
 * overall that navy text keeps its contrast. Rendered behind every screen's
 * content by ScreenContainer.
 */
export function DreamyBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[`${palette.apricot}59`, `${palette.blush}4d`, `${palette.lilac}4d`, `${palette.paleSky}66`]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${palette.lilac}66`, 'transparent']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobTopRight}
      />
      <LinearGradient
        colors={[`${palette.paleSky}59`, 'transparent']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobBottomLeft}
      />

      {SPARKLES.map((s, i) => (
        <View
          key={i}
          style={[
            styles.sparkle,
            { top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity },
          ]}
        />
      ))}

      <View style={styles.clouds}>
        <LinearGradient
          colors={[`${colors.background}f2`, 'transparent']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cloudPuff, { left: '-10%', bottom: -20, width: 260, height: 160 }]} />
        <View style={[styles.cloudPuff, { left: '35%', bottom: -40, width: 320, height: 200 }]} />
        <View style={[styles.cloudPuff, { left: '70%', bottom: -10, width: 240, height: 150 }]} />
      </View>
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
  sparkle: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  clouds: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
  },
  cloudPuff: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: `${colors.background}80`,
  },
});
