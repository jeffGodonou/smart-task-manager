import React from 'react';
import './ProfileMenu.css';

type ProfileMenuProps = {
  username?: string | null;
  onUpdateProfile: (username: string) => void;
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
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setDraftUsername(username ?? '');
  }, [username]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setEditing(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
              setDraftUsername(username ?? '');
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
              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setEditing(true);
                  setDraftUsername(username ?? '');
                }}
              >
                Edit profile
              </button>

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
            </>
          ) : (
            <form
              className="profile-menu__editor"
              onSubmit={(event) => {
                event.preventDefault();
                const nextUsername = draftUsername.trim();
                if (!nextUsername) {
                  return;
                }
                onUpdateProfile(nextUsername);
                setEditing(false);
                setOpen(false);
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
              <p className="profile-menu__hint">Updates the name shown in this session.</p>
              <div className="profile-menu__editor-actions">
                <button
                  type="button"
                  className="profile-menu__secondary"
                  onClick={() => {
                    setEditing(false);
                    setDraftUsername(username ?? '');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-menu__primary"
                  disabled={!draftUsername.trim()}
                >
                  Save
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