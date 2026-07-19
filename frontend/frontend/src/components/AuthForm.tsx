/**
 * AuthForm Component
 *
 * Small authentication form used for logging in or creating an account.
 * Handles submission, error state, and exposes `onAuthenticated` callback
 * when authentication completes.
 */
import { useState } from 'react';
import { login, register, saveToken, clearToken } from '../api/auth';
import './AuthForm.css';

type AuthFormProps = {
  onAuthenticated: (username?: string) => void;
};

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5c5.7 0 9.8 5.2 10 5.4a1 1 0 0 1 0 1.2C21.8 11.8 17.7 17 12 17S2.2 11.8 2 11.6a1 1 0 0 1 0-1.2C2.2 10.2 6.3 5 12 5Zm0 2c-3.9 0-7 3.2-8 4 .9.8 4.1 4 8 4s7-3.2 8-4c-.9-.8-4.1-4-8-4Zm0 1.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.7 2.3 2.3 3.7l3 3C3.5 8.1 2.2 9.8 2 10a1 1 0 0 0 0 1.2C2.2 11.4 6.3 16.6 12 16.6c2 0 3.8-.6 5.3-1.4l3 2.9 1.4-1.4L3.7 2.3Zm8.3 12.3c-3.9 0-7-3.2-8-4 .6-.5 2.1-1.8 4.1-2.8l1.6 1.6a3.5 3.5 0 0 0 4.8 4.8l1.4 1.4c-1.1.4-2.4.6-3.9.6Zm0-7.6a3.5 3.5 0 0 1 3.5 3.5c0 .4-.1.8-.2 1.2l-4.5-4.5c.4-.1.8-.2 1.2-.2Zm10 3c-.1-.2-3-4-7.3-5l1.7 1.7c2.2.8 3.8 2.2 4.6 2.9-.5.5-1.8 1.7-3.7 2.7l1.6 1.6c2.2-1.4 3.8-3.3 4-3.5a1 1 0 0 0 .1-1.4Z" />
    </svg>
  );
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = mode === 'login'
        ? await login(username, password)
        : await register(username, password);

      saveToken(response.token);
      onAuthenticated(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
      <p>Use any username and password to start managing tasks.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <div className="auth-password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon visible={showPassword} />
            <span className="auth-password-tooltip">
              {showPassword ? 'Hide password' : 'Show password'}
            </span>
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <div className="auth-toggle">
        {mode === 'login' ? (
          <span>
            No account yet? <button type="button" onClick={() => setMode('register')}>Create one</button>
          </span>
        ) : (
          <span>
            Already have an account? <button type="button" onClick={() => setMode('login')}>Log in</button>
          </span>
        )}
      </div>

      <div className="auth-toggle">
        <button type="button" onClick={() => {
          clearToken();
          onAuthenticated();
        }}>
          Continue without login
        </button>
      </div>
    </div>
  );
}
