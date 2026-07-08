import { useState } from 'react';
import { login, register, saveToken, clearToken } from '../api/auth';
import './AuthForm.css';

type AuthFormProps = {
  onAuthenticated: () => void;
};

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      onAuthenticated();
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={loading}>
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
