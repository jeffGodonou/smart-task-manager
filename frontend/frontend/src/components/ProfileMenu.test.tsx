import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfileMenu from './ProfileMenu';

describe('ProfileMenu validation', () => {
  it('shows validation for missing current password and mismatched confirmation', async () => {
    // Mock the profile update handler; it must never be called when validation fails.
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

    // Open the profile menu and navigate to the edit-profile form.
    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /edit profile/i }));

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'alice' } });

    // Scenario 1: new password fields are filled but the current password is missing.
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The form must reject the save and show the "all password fields required" error.
    expect(
      screen.getByText('Fill current password, new password, and confirmation to change password.')
    ).toBeTruthy();
    expect(onUpdateProfile).not.toHaveBeenCalled();

    // Scenario 2: all password fields are filled, but the confirmation does not match.
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

    // The form must reject the save and show the mismatch error.
    expect(screen.getByText('New password and confirmation do not match.')).toBeTruthy();
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });
});
