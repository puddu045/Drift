import { Alert } from 'react-native';

/** A native confirm dialog as a promise — resolves true only if the
 * destructive action's own button is tapped, false for Cancel or a
 * dismissal (tapping outside/back button on Android). */
export function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
