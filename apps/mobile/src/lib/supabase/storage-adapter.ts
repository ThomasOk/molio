import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * Where the Supabase session (access + refresh token) actually lives.
 *
 * `src/lib/storage.tsx`'s plain MMKV instance — the one `use-day-history.ts` and
 * the old fake-token auth store both write to — has no `encryptionKey`, so
 * everything in it sits in clear text on disk. A real session is worth more than
 * that. MMKV's own `encryptionKey` is capped at 16 bytes, too short to hold a
 * session blob's own decryption key safely, so the split is: SecureStore (iOS
 * Keychain / Android Keystore) holds one small, once-generated 16-byte key; a
 * SEPARATE MMKV instance, encrypted with that key, holds the actual session
 * JSON. SecureStore alone can't take the session's place — the Keychain limits a
 * single item to ~2 KB, and a Supabase session (access token + refresh token +
 * user metadata) usually runs past that.
 */
const KEY_HOLDER_KEY = 'supabase.auth.mmkv-key';
const MMKV_INSTANCE_ID = 'supabase-auth';

let mmkvReady: ReturnType<typeof createSecureMMKV> | null = null;

async function createSecureMMKV() {
  let key = await SecureStore.getItemAsync(KEY_HOLDER_KEY);
  if (!key) {
    // 8 random bytes, hex-encoded to exactly 16 ASCII characters — MMKV's own cap.
    const bytes = await Crypto.getRandomBytesAsync(8);
    key = Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(KEY_HOLDER_KEY, key);
  }
  return createMMKV({ id: MMKV_INSTANCE_ID, encryptionKey: key });
}

function getSecureMMKV() {
  mmkvReady ??= createSecureMMKV();
  return mmkvReady;
}

/**
 * Supabase's `SupportedStorage` adapter for this app — passed to
 * `createSupabaseClient` so `supabase.auth` persists its session here instead of
 * in-memory (which would sign the user out on every app restart).
 */
export const supabaseAuthStorage = {
  async getItem(key: string) {
    const mmkv = await getSecureMMKV();
    return mmkv.getString(key) ?? null;
  },
  async setItem(key: string, value: string) {
    const mmkv = await getSecureMMKV();
    mmkv.set(key, value);
  },
  async removeItem(key: string) {
    const mmkv = await getSecureMMKV();
    mmkv.remove(key);
  },
};
