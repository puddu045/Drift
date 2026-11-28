import { KeyboardViewport } from './KeyboardViewport';
import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundVariant, DreamyBackground } from '@/components/DreamyBackground';
import { colors, floatingTabBarSpace } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
  /** Set on screens that sit under the floating (absolute) tab bar, so their
   * content doesn't render behind it — see floatingTabBarSpace's comment. */
  floatingTabBar?: boolean;
  /** Which DreamyBackground to show behind this screen. Defaults to 'day'. */
  background?: BackgroundVariant;
}>;

export function ScreenContainer({
  children,
  style,
  edges = ['top', 'bottom'],
  floatingTabBar,
  background = 'day',
}: Props) {
  return (
    <KeyboardViewport>
      <SafeAreaView style={styles.safeArea} edges={edges}>
        <DreamyBackground variant={background} />
        <View style={[styles.content, floatingTabBar && { paddingBottom: floatingTabBarSpace }, style]}>
          {children}
        </View>
      </SafeAreaView>
    </KeyboardViewport>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
