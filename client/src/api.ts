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

export interface StaffTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  status: string;
  requestedPriority: string;
  itPriority: string;
  requester: {
    id: number;
    name: string;
    email: string;
  };
  owner: {
    id: number;
    name: string;
    email: string;
  } | null;
  category?: {
    id: number;
    name: string;
  };
  relatedSystem?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueResponse {
  tickets: StaffTicket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface StaffQueueParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  owner?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch staff ticket queue with search, filter, and pagination
 */
export async function fetchStaffTickets(params: StaffQueueParams = {}): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
  if (params.owner && params.owner !== 'All') query.append('owner', params.owner);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await authFetch(`/api/staff/tickets?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch staff tickets');
  }
  return res.json();
}

/**
 * Fetch active IT staff and administrators
 */
export async function fetchStaffMembers(): Promise<StaffMember[]> {
  const res = await authFetch('/api/staff/members');
  if (!res.ok) {
    throw new Error('Failed to fetch staff members');
  }
  return res.json();
}

