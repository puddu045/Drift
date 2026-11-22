// Final typeface choice is pending review against real screens (see DESIGN_SYSTEM.md).
// System font is used for now so text renders correctly on both platforms without
// bundling a font family before that decision is made.

import { Platform } from 'react-native';

const systemFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export const typography = {
  fontFamily: systemFont,
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
