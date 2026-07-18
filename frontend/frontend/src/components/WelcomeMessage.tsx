import React from 'react';
import './WelcomeMessage.css';

type WelcomeMessageProps = {
  username: string;
  onDismiss: () => void;
};

export default function WelcomeMessage({ username, onDismiss }: WelcomeMessageProps) {
  React.useEffect(() => {
    const timer = window.setTimeout(onDismiss, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onDismiss, username]);

  return (
    <div className="welcome-overlay" role="status" aria-live="polite">
      <div className="welcome-backdrop" aria-hidden="true" />
      <div className="welcome-chatbox" role="dialog" aria-label="Welcome message">
        <div className="welcome-chatbox__bubble">
          <span className="welcome-chatbox__label">Welcome</span>
          <p>Welcome {username}!! <br />
            The space is ready for you.</p>
        </div>
      </div>
    </div>
  );
}