import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { secureSessionStorage } from './secureSessionStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // The session blob (access + refresh token) is sensitive — AsyncStorage
    // alone is unencrypted on-device storage. secureSessionStorage keeps the
    // AES key in the Keychain/Keystore via expo-secure-store and only the
    // ciphertext in AsyncStorage (SecureStore's own per-value size limit is
    // too small for a full session blob). See secureSessionStorage.ts.
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// NOTE: switching the storage adapter means any session persisted by the
// previous, plaintext-AsyncStorage version of this file won't be found by
// the new encrypted adapter (different backing key/location) — existing
// signed-in users are signed out once and need to sign in again after this
// update. That's an acceptable one-time cost for moving a real auth token
// out of unencrypted storage; see SECURITY_AUDIT.md.

// React Native can't tell Supabase when the app is foregrounded/backgrounded on
// its own — this keeps token auto-refresh paused while the app isn't active.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
