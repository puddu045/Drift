import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamyBackground } from '@/components/DreamyBackground';
import { colors, floatingTabBarSpace } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
  /** Set on screens that sit under the floating (absolute) tab bar, so their
   * content doesn't render behind it — see floatingTabBarSpace's comment. */
  floatingTabBar?: boolean;
}>;

export function ScreenContainer({ children, style, edges = ['top', 'bottom'], floatingTabBar }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <DreamyBackground />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', default: undefined })}
      >
        <View style={[styles.content, floatingTabBar && { paddingBottom: floatingTabBarSpace }, style]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
