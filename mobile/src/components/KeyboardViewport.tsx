import { ComponentRef, PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';

// Android may already have resized the window. Reserve only the remaining
// overlap, measured in window coordinates, including in a native modal.
export function KeyboardViewport({ children }: PropsWithChildren) {
  const viewport = useRef<ComponentRef<typeof View>>(null);
  const keyboardTop = useRef<number | undefined>(undefined);
  const [overlap, setOverlap] = useState(0);
  const measure = useCallback(() => {
    if (keyboardTop.current === undefined) return;
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      const top = keyboardTop.current;
      setOverlap(top === undefined ? 0 : Math.max(0, Math.ceil(y + height - top)));
    });
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    keyboardTop.current = Keyboard.metrics()?.screenY;
    measure();
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = undefined;
      setOverlap(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [measure]);
  if (Platform.OS === 'ios') {
    return <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>{children}</KeyboardAvoidingView>;
  }
  return <View ref={viewport} collapsable={false} onLayout={measure} style={{ flex: 1, paddingBottom: overlap }}>{children}</View>;
}
