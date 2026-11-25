export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

// Height (64) + top/bottom margin (spacing.md each) of the floating tab bar
// in (tabs)/_layout.tsx — since it's position:'absolute', screen content
// doesn't get that space reserved automatically and must pad for it itself
// (see ScreenContainer's `floatingTabBar` prop).
export const floatingTabBarSpace = 64 + spacing.md * 2;
