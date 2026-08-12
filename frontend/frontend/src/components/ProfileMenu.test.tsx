import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfileMenu from './ProfileMenu';

describe('ProfileMenu validation', () => {
  it('shows validation for missing current password and mismatched confirmation', async () => {
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);

    render(
      <ProfileMenu
        username="alice"
        onUpdateProfile={onUpdateProfile}
        theme="light"
        onThemeChange={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /edit profile/i }));

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'alice' } });

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByText('Fill current password, new password, and confirmation to change password.')
    ).toBeTruthy();
    expect(onUpdateProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('New password and confirmation do not match.')).toBeTruthy();
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });
});
