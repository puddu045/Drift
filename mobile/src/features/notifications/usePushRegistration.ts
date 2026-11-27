import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { registerDeviceToken } from '@/features/devices/api';

/**
 * Best-effort push registration, run once per signed-in session. Silently
 * does nothing on a simulator/emulator, in Expo Go on Android (remote push
 * isn't supported there from SDK 53 — needs a development build), before
 * this project has an EAS project id configured, or if expo-notifications
 * itself can't load (e.g. a native module it depends on isn't available in
 * the current Expo Go client) — none of those are errors worth surfacing to
 * the user, this is purely additive.
 *
 * expo-notifications is imported dynamically, inside the try/catch below,
 * rather than as a static top-level import. A static import is evaluated
 * before any of our own code runs, so if expo-notifications' own module
 * setup throws (it transitively imports expo-application, whose native
 * module isn't always present), it crashes the whole app at startup instead
 * of landing in this function's catch block.
 */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;
    let cancelled = false;

    const register = async () => {
      try {
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
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
