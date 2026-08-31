import type { LoginFormProps } from './components/login-form';
import { useRouter } from 'expo-router';

import * as React from 'react';
import { FocusAwareStatusBar, showErrorMessage } from '@/components/ui';
import { useSignInWithPassword } from './api';
import { LoginForm } from './components/login-form';

export function LoginScreen() {
  const router = useRouter();
  const { mutateAsync: signIn } = useSignInWithPassword();

  const onSubmit: LoginFormProps['onSubmit'] = async ({ email, password }) => {
    try {
      await signIn({ email, password });
      // No back-stack entry for `/login` once signed in — there's nothing to
      // go "back" to.
      router.replace('/');
    }
    catch (error) {
      showErrorMessage(error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSubmit={onSubmit} />
    </>
  );
}
