import { useCallback, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

// Actual pixel size of assets/dreamy-sky.webp — needed to scale it manually
// (see below) rather than relying on resizeMode="cover" alone.
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1536;

/**
 * A dreamy sky image (AI-generated per the user's own prompt — see
 * assets/dreamy-sky.webp), covering every screen behind its content.
 *
 * resizeMode="cover" centers its crop, which on a short/wide screen can crop
 * away the clouds at the very bottom of the image. This instead scales the
 * image to always fully cover the screen (same math as object-fit: cover)
 * but anchors it to the bottom, so only the top ever gets cropped and the
 * clouds stay visible on every screen shape.
 */
export function DreamyBackground() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const scale = Math.max(size.width / IMAGE_WIDTH, size.height / IMAGE_HEIGHT);
  const renderedWidth = IMAGE_WIDTH * scale;
  const renderedHeight = IMAGE_HEIGHT * scale;

  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && (
        <Image
          source={require('../../assets/dreamy-sky.webp')}
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
