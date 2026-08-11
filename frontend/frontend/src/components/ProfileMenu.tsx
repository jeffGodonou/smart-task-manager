import React from 'react';
import './ProfileMenu.css';

type ProfileMenuProps = {
  username?: string | null;
  onUpdateProfile: (payload: {
    username: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  theme: 'light' | 'dark' | 'blue' | 'forest' | 'gray';
  onThemeChange: (theme: 'light' | 'dark' | 'blue' | 'forest' | 'gray') => void;
  onLogout: () => void;
};

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'blue', label: 'Blue' },
  { value: 'forest', label: 'Forest' },
  { value: 'gray', label: 'Gray' },
] as const;

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12.2c2.9 0 5.2-2.3 5.2-5.2S14.9 1.8 12 1.8 6.8 4.1 6.8 7s2.3 5.2 5.2 5.2Zm0 2.4c-4.4 0-8 2.6-8 5.9 0 .9.7 1.6 1.6 1.6h12.8c.9 0 1.6-.7 1.6-1.6 0-3.3-3.6-5.9-8-5.9Z" />
    </svg>
  );
}

export default function ProfileMenu({ username, onUpdateProfile, theme, onThemeChange, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draftUsername, setDraftUsername] = React.useState(username ?? '');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const resetEditorState = React.useCallback(() => {
    setDraftUsername(username ?? '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaving(false);
    setError(null);
  }, [username]);

  React.useEffect(() => {
    resetEditorState();
  }, [resetEditorState]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
        resetEditorState();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setEditing(false);
        resetEditorState();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetEditorState]);

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => {
          setOpen((current) => {
            const nextOpen = !current;
            if (!nextOpen) {
              setEditing(false);
              resetEditorState();
            }
            return nextOpen;
          });
        }}
      >
        <ProfileIcon />
      </button>

      {open && (
        <div className="profile-menu__dropdown" role="menu" aria-label="Profile actions">
          {!editing ? (
            <>
              <div className="profile-menu__section">
                <span className="profile-menu__section-title">Theme</span>
                <div className="profile-menu__theme-list" role="group" aria-label="Theme options">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`profile-menu__theme-option ${theme === option.value ? 'profile-menu__theme-option--active' : ''}`}
                      onClick={() => onThemeChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setEditing(true);
                  resetEditorState();
                }}
              >
                Edit profile
              </button>  
            </>
          ) : (
            <form
              className="profile-menu__editor"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);

                const nextUsername = draftUsername.trim();
                if (!nextUsername) {
                  setError('Username is required.');
                  return;
                }

                const hasPasswordIntent = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
                if (hasPasswordIntent) {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    setError('Fill current password, new password, and confirmation to change password.');
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setError('New password and confirmation do not match.');
                    return;
                  }

                  if (newPassword.length < 6) {
                    setError('New password must be at least 6 characters.');
                    return;
                  }
                }

                try {
                  setSaving(true);
                  await onUpdateProfile({
                    username: nextUsername,
                    currentPassword: hasPasswordIntent ? currentPassword : undefined,
                    newPassword: hasPasswordIntent ? newPassword : undefined,
                  });
                  setEditing(false);
                  setOpen(false);
                  resetEditorState();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to update profile.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="profile-menu__label" htmlFor="profile-username">
                Username
              </label>
              <input
                id="profile-username"
                className="profile-menu__input"
                type="text"
                value={draftUsername}
                onChange={(event) => setDraftUsername(event.target.value)}
                autoFocus
              />

              <label className="profile-menu__label" htmlFor="profile-current-password">
                Current password
              </label>
              <input
                id="profile-current-password"
                className="profile-menu__input"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Required to change password"
              />

              <label className="profile-menu__label" htmlFor="profile-new-password">
                New password
              </label>
              <input
                id="profile-new-password"
                className="profile-menu__input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
              />

              <label className="profile-menu__label" htmlFor="profile-confirm-password">
                Confirm new password
              </label>
              <input
                id="profile-confirm-password"
                className="profile-menu__input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />

              {error && <p className="profile-menu__error">{error}</p>}

              <p className="profile-menu__hint">Update your username and optionally your password.</p>
              <div className="profile-menu__editor-actions">
                <button
                  type="button"
                  className="profile-menu__secondary"
                  onClick={() => {
                    setEditing(false);
                    resetEditorState();
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-menu__primary"
                  disabled={saving || !draftUsername.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
          <button
            type="button"
            className="profile-menu__item profile-menu__item--destructive"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}