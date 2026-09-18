const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  mustChangePassword: boolean;
  isActive?: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const TOKEN_KEY = 'toktickit_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Perform authenticated fetch request, injecting JWT Bearer token
 */
export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to authenticate');
  }

  setAuthToken(data.token);
  return data;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    clearAuthToken();
  }
}

/**
 * Fetch current authenticated user profile
 */
export async function getMe(): Promise<UserProfile> {
  const res = await authFetch('/api/auth/me');
  if (!res.ok) {
    clearAuthToken();
    throw new Error('Session expired or invalid');
  }
  return res.json();
}

/**
 * Change user password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string; mustChangePassword: boolean }> {
  const res = await authFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update password');
  }
  return data;
}
