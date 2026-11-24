import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import { registerDeviceToken } from '@/features/devices/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Best-effort push registration, run once per signed-in session. Silently
 * does nothing on a simulator/emulator, in Expo Go on Android (remote push
 * isn't supported there from SDK 53 — needs a development build), or before
 * this project has an EAS project id configured — none of those are errors
 * worth surfacing to the user, this is purely additive.
 */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;
    let cancelled = false;

    const register = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled) {
          await registerDeviceToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        }
      } catch {
        // Best-effort only — see doc comment above.
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
