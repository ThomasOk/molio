import type { AuthError, Session } from '@supabase/supabase-js';
import { createMutation } from 'react-query-kit';
import { supabase } from '@/lib/supabase/client';

// `session` is present on sign-in, but `signUp` returns a null session when the
// Supabase project requires email confirmation — the caller decides what to do
// with that (show a "check your email" message vs. sign the user straight in).

type SignInVariables = { email: string; password: string };

export const useSignInWithPassword = createMutation<Session, SignInVariables, AuthError>({
  mutationFn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
      throw error;
    return data.session;
  },
});

// `name` rides along as user metadata so the `handle_new_user` DB trigger
// (`supabase/migrations/20260830203106_init_profiles_and_day_activity.sql`) can
// seed `profiles.name` with it — the client never inserts into `profiles` itself.
type SignUpVariables = { name: string; email: string; password: string };

export const useSignUpWithPassword = createMutation<Session | null, SignUpVariables, AuthError>({
  mutationFn: async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error)
      throw error;
    return data.session;
  },
});

export const useSignOut = createMutation<void, void, AuthError>({
  mutationFn: async () => {
    const { error } = await supabase.auth.signOut();
    if (error)
      throw error;
  },
});
