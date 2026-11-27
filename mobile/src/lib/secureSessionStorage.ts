import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Supabase's auth session (access + refresh token, user metadata) is
// sensitive and, as a full JSON blob, is almost always well over
// expo-secure-store's practical per-value size limit on iOS (SecureStore is
// backed by the Keychain, which can reject values over roughly 2KB on some
// iOS versions). So the session itself is encrypted with a per-entry AES-GCM
// key (via expo-crypto, no third-party crypto dependency needed), the key —
// tiny, well under that limit — lives in SecureStore (Keychain/Keystore),
// and only the ciphertext (opaque without the key) sits in AsyncStorage,
// which has no size limit but no encryption of its own.
const KEY_PREFIX = 'drift-session-key-';

function secureStoreKeyFor(key: string): string {
  // SecureStore keys are restricted to word characters, '.', '-' and '_' —
  // Supabase's own storage keys (e.g. "sb-<ref>-auth-token") already satisfy
  // that, but keep this independent of what Supabase happens to pass in.
  return (KEY_PREFIX + key).replace(/[^\w.-]/g, '_');
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const keyHex = await SecureStore.getItemAsync(secureStoreKeyFor(key));
    const combined = await AsyncStorage.getItem(key);
    if (!keyHex || combined == null) return null;

    try {
      const encryptionKey = await AESEncryptionKey.import(keyHex, 'hex');
      const sealedData = AESSealedData.fromCombined(combined);
      const plaintextBytes = (await aesDecryptAsync(sealedData, encryptionKey)) as Uint8Array;
      return new TextDecoder().decode(plaintextBytes);
    } catch {
      // Corrupt/undecryptable entry (e.g. tampered or from an incompatible
      // version) — treat as "no session" rather than throwing, same as a
      // missing key would behave.
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await AESEncryptionKey.generate();
    const plaintextBytes = new TextEncoder().encode(value);
    const sealedData = await aesEncryptAsync(plaintextBytes, encryptionKey);
    const combinedBase64 = (await sealedData.combined('base64')) as string;
    const keyHex = await encryptionKey.encoded('hex');

    await SecureStore.setItemAsync(secureStoreKeyFor(key), keyHex);
    await AsyncStorage.setItem(key, combinedBase64);
  },

  async removeItem(key: string): Promise<void> {
    await Promise.all([SecureStore.deleteItemAsync(secureStoreKeyFor(key)), AsyncStorage.removeItem(key)]);
  },
};
