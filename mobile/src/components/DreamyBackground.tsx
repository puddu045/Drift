import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

export type BackgroundVariant = 'evening' | 'haze' | 'overlook' | 'twilight' | 'day' | 'sunset' | 'pastel' | 'night' | 'none';

type VariantConfig = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  /** Semi-transparent wash over the image, for a source that reads too
   * saturated/"punchy" next to the rest of the app's soft pastel palette. */
  overlayColor?: string;
};

const VARIANTS: Partial<Record<BackgroundVariant, VariantConfig>> = {
  evening: { source: require('../../assets/unwritten-twilight.jpg'), width: 941, height: 1672, overlayColor: 'rgba(255,247,244,0.67)' },
  haze: { source: require('../../assets/unwritten-meadow.jpg'), width: 1774, height: 887, overlayColor: 'rgba(255,250,247,0.86)' },
  overlook: { source: require('../../assets/unwritten-overlook.jpg'), width: 941, height: 1672, overlayColor: 'rgba(24,28,62,0.16)' },
  twilight: { source: require('../../assets/unwritten-twilight.jpg'), width: 941, height: 1672, overlayColor: 'rgba(18,22,51,0.17)' },
  day: { source: require('../../assets/drift-sky-day.webp'), width: 969, height: 1624 },
  sunset: {
    source: require('../../assets/drift-sunset.webp'),
    width: 1024,
    height: 1536,
    overlayColor: 'rgba(255, 251, 247, 0.06)',
  },
  pastel: { source: require('../../assets/drift-sky-pastel.webp'), width: 971, height: 1620 },
  night: { source: require('../../assets/drift-night.webp'), width: 1024, height: 1536 },
  // 'none' has no entry — see render below.
};

/**
 * A dreamy sky image (AI-generated per the user's own prompts), covering the
 * screen behind its content. `variant` picks which one; 'none' renders no
 * image at all (just the plain background color), for screens that are
 * meant to stay plain until they get their own dedicated artwork.
 *
 * resizeMode="cover" centers its crop, which on a short/wide screen can crop
 * away the bottom of the image. This instead scales the image to always
 * fully cover the screen (same math as object-fit: cover) but anchors it to
 * the bottom, so only the top ever gets cropped and the bottom stays
 * visible on every screen shape.
 */
export function DreamyBackground({ variant = 'day' }: { variant?: BackgroundVariant }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const config = VARIANTS[variant];
  const scale = config ? Math.max(size.width / config.width, size.height / config.height) : 0;
  const renderedWidth = config ? config.width * scale : 0;
  const renderedHeight = config ? config.height * scale : 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && config && (
        <>
          <Image
            source={config.source}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              bottom: 0,
              left: (size.width - renderedWidth) / 2,
              width: renderedWidth,
              height: renderedHeight,
            }}
          />
          {variant === 'sunset' && (
            <LinearGradient colors={['transparent', 'rgba(255,241,229,0.95)']} style={styles.sunsetFade} />
          )}
          {config.overlayColor && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: config.overlayColor }]} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sunsetFade: { position: 'absolute', bottom: 0, width: '100%', height: '22%' },
  base: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
});
