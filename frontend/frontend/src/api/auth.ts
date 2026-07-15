const tokenStorageKey = 'smart-task-manager-token';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export type AuthResponse = {
  token: string;
};

export function saveToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  localStorage.removeItem(tokenStorageKey);
}

export function getStoredToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Login failed');
  }

  return response.json();
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Registration failed');
  }

  return response.json();
}
