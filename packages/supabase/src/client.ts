import type { SupabaseClientOptions } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/**
 * A typed Supabase client factory.
 *
 * Deliberately agnostic of Expo/env — this package has no `EXPO_PUBLIC_*`
 * dependency, so it stays usable from anything in the workspace (the mobile app
 * today, a future web client or script tomorrow). The caller supplies the
 * URL/key read from its own env, plus whatever platform-specific bits it needs
 * (a storage adapter for React Native, for instance) via `options`.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>,
) {
  return createClient<Database>(url, anonKey, options);
}
