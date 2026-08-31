import type { Session } from '@supabase/supabase-js';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { createSelectors } from '@/lib/utils';

type AuthState = {
  session: Session | null;
  status: 'idle' | 'signOut' | 'signIn';
  signOut: () => Promise<void>;
  hydrate: () => void;
};

const _useAuthStore = create<AuthState>(set => ({
  status: 'idle',
  session: null,
  signOut: async () => {
    // Store state updates from the `onAuthStateChange` listener below, not
    // from here — that's the single source of truth for both this call and
    // any refresh/expiry Supabase triggers on its own.
    const { error } = await supabase.auth.signOut();
    if (error)
      console.error(error);
  },
  hydrate: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, status: session ? 'signIn' : 'signOut' });
    });
  },
}));

// Fires once with the session Supabase already restored from
// `apps/mobile/src/lib/supabase/storage-adapter.ts` (before `hydrate`'s
// `getSession` call typically even resolves), then again on every sign-in,
// sign-out, and token refresh for the lifetime of the app.
supabase.auth.onAuthStateChange((_event, session) => {
  _useAuthStore.setState({ session, status: session ? 'signIn' : 'signOut' });
});

export const useAuthStore = createSelectors(_useAuthStore);

export const signOut = () => _useAuthStore.getState().signOut();
export const hydrateAuth = () => _useAuthStore.getState().hydrate();
