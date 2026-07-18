import React from 'react';
import './ProfileMenu.css';

type ProfileMenuProps = {
  onEditProfile: () => void;
  onLogout: () => void;
};

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12.2c2.9 0 5.2-2.3 5.2-5.2S14.9 1.8 12 1.8 6.8 4.1 6.8 7s2.3 5.2 5.2 5.2Zm0 2.4c-4.4 0-8 2.6-8 5.9 0 .9.7 1.6 1.6 1.6h12.8c.9 0 1.6-.7 1.6-1.6 0-3.3-3.6-5.9-8-5.9Z" />
    </svg>
  );
}

export default function ProfileMenu({ onEditProfile, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
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
        onClick={() => setOpen((current) => !current)}
      >
        <ProfileIcon />
      </button>

      {open && (
        <div className="profile-menu__dropdown" role="menu" aria-label="Profile actions">
          <button
            type="button"
            className="profile-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEditProfile();
            }}
          >
            Edit profile
          </button>
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