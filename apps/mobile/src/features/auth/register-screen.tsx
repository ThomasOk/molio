import type { RegisterFormProps } from './components/register-form';
import { useRouter } from 'expo-router';

import * as React from 'react';
import { showMessage } from 'react-native-flash-message';
import { FocusAwareStatusBar, showErrorMessage } from '@/components/ui';
import { useSignUpWithPassword } from './api';
import { RegisterForm } from './components/register-form';

export function RegisterScreen() {
  const router = useRouter();
  const { mutateAsync: signUp } = useSignUpWithPassword();

  const onSubmit: RegisterFormProps['onSubmit'] = async ({ name, email, password }) => {
    try {
      const session = await signUp({ name, email, password });
      if (session) {
        // Project has email confirmation off: signUp already opened a session.
        router.replace('/');
      }
      else {
        // Project requires email confirmation: no session yet, back to login.
        showMessage({
          message: 'Account created',
          description: 'Check your email to confirm your account, then sign in.',
          type: 'success',
        });
        router.replace('/login');
      }
    }
    catch (error) {
      showErrorMessage(error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <RegisterForm onSubmit={onSubmit} />
    </>
  );
}
