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
    department?: string;
    jobTitle?: string;
    contactPhone?: string;
  };
  owner: {
    id: number;
    name: string;
    email: string;
    role?: string;
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

export interface CommentItem {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
}

export interface NoteItem {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
}

export interface StaffTicketDetail extends StaffTicket {
  description: string;
  indicatedResolvedAt?: string | null;
  attachments?: Array<{
    id: number;
    originalFileName: string;
    storedFileName: string;
    size: number;
    mimeType: string;
    isRemoved: boolean;
    removalReason?: string;
    createdAt: string;
  }>;
  comments?: CommentItem[];
  internalNotes?: NoteItem[];
}

/**
 * Fetch full staff ticket detail
 */
export async function fetchStaffTicketDetail(id: number): Promise<StaffTicketDetail> {
  const res = await authFetch(`/api/staff/tickets/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch ticket detail');
  }
  return res.json();
}

/**
 * Claim or reassign ticket owner
 */
export async function updateTicketOwner(id: number, ownerId: number | null): Promise<StaffTicketDetail> {
  const res = await authFetch(`/api/staff/tickets/${id}/owner`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update owner');
  }
  return res.json();
}

/**
 * Update IT Priority
 */
export async function updateTicketPriority(id: number, itPriority: string): Promise<StaffTicketDetail> {
  const res = await authFetch(`/api/staff/tickets/${id}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update IT priority');
  }
  return res.json();
}

/**
 * Update Ticket Status following workflow transition
 */
export async function updateTicketStatus(id: number, status: string): Promise<StaffTicketDetail> {
  const res = await authFetch(`/api/staff/tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update status');
  }
  return res.json();
}

/**
 * Fetch Public Comments
 */
export async function fetchPublicComments(ticketId: number): Promise<CommentItem[]> {
  const res = await authFetch(`/api/tickets/${ticketId}/comments`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch comments');
  }
  return res.json();
}

/**
 * Post Public Comment
 */
export async function postPublicComment(ticketId: number, content: string): Promise<CommentItem> {
  const res = await authFetch(`/api/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to post comment');
  }
  return res.json();
}

/**
 * Fetch Internal Notes (Staff & Admin only)
 */
export async function fetchInternalNotes(ticketId: number): Promise<NoteItem[]> {
  const res = await authFetch(`/api/tickets/${ticketId}/internal-notes`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch internal notes');
  }
  return res.json();
}

/**
 * Post Internal Note (Staff & Admin only)
 */
export async function postInternalNote(ticketId: number, content: string): Promise<NoteItem> {
  const res = await authFetch(`/api/tickets/${ticketId}/internal-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to post internal note');
  }
  return res.json();
}

/**
 * Requester indicates problem resolved
 */
export async function indicateTicketResolved(ticketId: number): Promise<{ message: string; indicatedResolvedAt: string }> {
  const res = await authFetch(`/api/tickets/${ticketId}/indicate-resolved`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to indicate resolved');
  }
  return res.json();
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  initialPassword: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive?: boolean;
}

/**
 * Fetch all users with optional search and role filtering (Admin only)
 */
export async function fetchAdminUsers(params?: { search?: string; role?: string }): Promise<AdminUser[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role && params.role !== 'All') query.append('role', params.role);

  const res = await authFetch(`/api/admin/users?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch users');
  }
  return res.json();
}

/**
 * Create a new user account (Admin only)
 */
export async function createAdminUser(data: CreateUserData): Promise<AdminUser> {
  const res = await authFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create user');
  }
  return res.json();
}

/**
 * Update user details, role, or active status (Admin only)
 */
export async function updateAdminUser(id: number, data: UpdateUserData): Promise<AdminUser> {
  const res = await authFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update user');
  }
  return res.json();
}

/**
 * Reset initial password for user and require password change (Admin only)
 */
export async function resetAdminUserPassword(id: number, initialPassword: string): Promise<{ message: string }> {
  const res = await authFetch(`/api/admin/users/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialPassword }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reset user password');
  }
  return res.json();
}



