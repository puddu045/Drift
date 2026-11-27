import { useCallback, useState } from 'react';
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

export type BackgroundVariant = 'day' | 'sunset' | 'none';

// Actual pixel size of each background image below — needed to scale them
// manually (see render below) rather than relying on resizeMode="cover"
// alone. All current variants happen to share the same size; a future
// variant with a different source size just needs its own entry here.
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1536;

const SOURCES: Partial<Record<BackgroundVariant, ImageSourcePropType>> = {
  day: require('../../assets/drift-sky-day.webp'),
  sunset: require('../../assets/drift-sunset.webp'),
  // 'none' has no source — see render below.
  //
  // TODO(theme migration): DestinyScreen should use a dedicated night-sky
  // variant once that asset exists; it currently falls back to 'day' like
  // every other not-yet-specified screen.
};

/**
 * A dreamy sky image (AI-generated per the user's own prompt), covering the
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

  const source = SOURCES[variant];
  const scale = Math.max(size.width / IMAGE_WIDTH, size.height / IMAGE_HEIGHT);
  const renderedWidth = IMAGE_WIDTH * scale;
  const renderedHeight = IMAGE_HEIGHT * scale;

  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && source && (
        <Image
          source={source}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            bottom: 0,
            left: (size.width - renderedWidth) / 2,
            width: renderedWidth,
            height: renderedHeight,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
});
