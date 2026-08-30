const tokenStorageKey = 'smart-task-manager-token';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = typeof atob === 'function' ? atob(padded) : '';

    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token || token.split('.').length !== 3) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

export type AuthResponse = {
  token: string;
};

export type UpdateProfileRequest = {
  username?: string;
  currentPassword?: string;
  newPassword?: string;
  githubLogin?: string;
};

export type UpdateProfileResponse = {
  username: string;
  token: string;
  githubLogin?: string | null;
};

export function saveToken(token: string) {
  if (!isTokenValid(token)) {
    clearToken();
    return;
  }

  localStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  localStorage.removeItem(tokenStorageKey);
}

export function getStoredToken() {
  const token = localStorage.getItem(tokenStorageKey);
  if (!isTokenValid(token)) {
    if (token) {
      clearToken();
    }
    return null;
  }
  return token;
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

export async function resetPassword(username: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, newPassword }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Password reset failed');
  }

  return response.json();
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('You must be logged in to update your profile.');
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Profile update failed');
  }

  return response.json();
}

export function startGithubConnectFlow() {
  const width = 520;
  const height = 720;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;

  const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize?client_id=github-client-id&scope=read:user';
  const popup = window.open(
    githubAuthorizeUrl,
    'github-connect',
    `width=${width},height=${height},left=${left},top=${top}`,
  );

  if (!popup) {
    throw new Error('GitHub sign-in was blocked by the browser. Please allow popups and try again.');
  }

  return popup;
}
