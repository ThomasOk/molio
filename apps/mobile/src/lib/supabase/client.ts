import { createSupabaseClient } from '@molio/supabase';
import Env from 'env';
import { AppState } from 'react-native';
import { supabaseAuthStorage } from './storage-adapter';

// Side-effect import: patches `URL`, which `@supabase/supabase-js` needs and RN
// doesn't fully implement. Import order among statements above doesn't matter —
// every import here resolves before any of this file's own code runs, including
// the `createSupabaseClient` call below.
import 'react-native-url-polyfill/auto';

/**
 * The app's one Supabase client — everything auth and data goes through this.
 *
 * `detectSessionInUrl: false` because there is no browser URL to read a session
 * out of on native; the OAuth redirect for Google/Apple is handled by their own
 * native SDKs instead (see the auth feature once those land), not by Supabase's
 * web-style implicit flow.
 */
export const supabase = createSupabaseClient(
  Env.EXPO_PUBLIC_SUPABASE_URL,
  Env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: supabaseAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Supabase's token auto-refresh runs on a JS timer, which React Native freezes
 * while backgrounded — so a session can expire silently and only surface as a
 * confusing 401 on the next request. This is Supabase's own documented fix for
 * React Native: nudge it on every foreground/background transition.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active')
    supabase.auth.startAutoRefresh();
  else
    supabase.auth.stopAutoRefresh();
});
