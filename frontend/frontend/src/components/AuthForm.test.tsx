import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthForm from './AuthForm';
import * as authApi from '../api/auth';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe('AuthForm', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('logs in successfully and stores the token', async () => {
    const onAuthenticated = vi.fn();
    vi.mocked(authApi.login).mockResolvedValue({ token: 'user-token-123' });

    render(<AuthForm onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('alice', 'secret123');
      expect(authApi.saveToken).toHaveBeenCalledWith('user-token-123');
    });

    expect(onAuthenticated).toHaveBeenCalledWith('alice');
  });

  it('switches to forgot-password mode and resets the password', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({
      message: 'Password reset successfully.',
    });

    render(<AuthForm onAuthenticated={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'new-secret-456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith('alice', 'new-secret-456');
    });

    expect(screen.getByText('Password reset successfully.')).toBeTruthy();
  });

  it('shows the registration heading when switching to create-account mode', () => {
    render(<AuthForm onAuthenticated={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create one/i }));

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeTruthy();
  });
});
