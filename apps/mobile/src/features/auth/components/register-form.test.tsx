import type { FormType } from './register-form';

import * as React from 'react';

import { cleanup, screen, setup, waitFor } from '@/lib/test-utils';
import { RegisterForm } from './register-form';

afterEach(cleanup);

const onSubmitMock: jest.Mock<void, [FormType]> = jest.fn();

describe('registerForm Form ', () => {
  it('renders correctly', async () => {
    setup(<RegisterForm />);
    expect(await screen.findByTestId('form-title')).toBeOnTheScreen();
  });

  it('should display required error when values are empty', async () => {
    const { user } = setup(<RegisterForm />);

    const button = screen.getByTestId('register-button');
    expect(screen.queryByText(/Name is required/i)).not.toBeOnTheScreen();
    await user.press(button);
    expect(await screen.findByText(/Name is required/i)).toBeOnTheScreen();
    expect(screen.getByText(/Email is required/i)).toBeOnTheScreen();
    expect(screen.getByText(/Password is required/i)).toBeOnTheScreen();
  });

  it('should display matching error when email is invalid', async () => {
    const { user } = setup(<RegisterForm />);

    const button = screen.getByTestId('register-button');
    const nameInput = screen.getByTestId('name-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');

    await user.type(nameInput, 'Youssef');
    await user.type(emailInput, 'yyyyy');
    emailInput.props.onBlur(); // Manually trigger blur to set touched state
    await user.type(passwordInput, 'test');
    await user.press(button);

    expect(await screen.findByText(/Invalid Email Format/i)).toBeOnTheScreen();
    expect(screen.queryByText(/Email is required/i)).not.toBeOnTheScreen();
  });

  it('should call RegisterForm with correct values when values are valid', async () => {
    const { user } = setup(<RegisterForm onSubmit={onSubmitMock} />);

    const button = screen.getByTestId('register-button');
    const nameInput = screen.getByTestId('name-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');

    await user.type(nameInput, 'Youssef');
    await user.type(emailInput, 'youssef@gmail.com');
    await user.type(passwordInput, 'password');
    await user.press(button);
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
    });
    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Youssef',
        email: 'youssef@gmail.com',
        password: 'password',
      }),
    );
  });
});
