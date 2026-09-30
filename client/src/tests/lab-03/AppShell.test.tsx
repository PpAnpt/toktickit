import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../App';
import * as api from '../../api';

type Role = api.UserProfile['role'];

function mockSession(role: Role, mustChangePassword = false) {
  vi.spyOn(api, 'getAuthToken').mockReturnValue('mock-jwt-token');
  global.fetch = vi.fn(async (url: string) => {
    const u = url.toString();
    if (u.includes('/api/auth/me')) {
      return { ok: true, status: 200, json: async () => ({ id: 1, name: 'Test User', email: 'test@example.com', role, mustChangePassword }) };
    }
    if (u.includes('/api/staff/members')) return { ok: true, status: 200, json: async () => [] };
    if (u.includes('/api/staff/tickets')) {
      return { ok: true, status: 200, json: async () => ({ tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }) };
    }
    if (u.includes('/api/admin/users')) return { ok: true, status: 200, json: async () => [] };
    if (u.includes('/api/tickets')) {
      return { ok: true, status: 200, json: async () => ({ data: [], meta: { totalItems: 0, totalPages: 1 } }) };
    }
    return { ok: true, status: 200, json: async () => [] };
  }) as any;
}

describe('UI-06: Application shell, role navigation, and session handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Requester sees only Create Ticket and My Tickets, with name and role badge', async () => {
    mockSession('REQUESTER');
    render(<App />);

    expect(await screen.findByRole('button', { name: /Create Ticket/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Tickets/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ticket Queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /User Management/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('role-badge')).toHaveTextContent('Requester');
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
  });

  it('IT Staff sees only the Ticket Queue', async () => {
    mockSession('IT_STAFF');
    render(<App />);

    expect(await screen.findByRole('button', { name: /Ticket Queue/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /My Tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /User Management/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('role-badge')).toHaveTextContent('IT Staff');
  });

  it('Administrator sees User Management and Ticket Queue', async () => {
    mockSession('ADMINISTRATOR');
    render(<App />);

    expect(await screen.findByRole('button', { name: /User Management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ticket Queue/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Ticket/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('role-badge')).toHaveTextContent('Administrator');
  });

  it('a user who must change the initial password sees no application screens', async () => {
    mockSession('IT_STAFF', true);
    render(<App />);

    expect(await screen.findByRole('dialog', { name: /Change Your Password/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ticket Queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    // No application data is requested before the password is changed
    const urls = (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(urls.some((u: string) => u.includes('/api/staff/tickets'))).toBe(false);
  });

  it('voluntary Change Password can be opened and cancelled', async () => {
    mockSession('REQUESTER');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Change Password/i }));
    expect(screen.getByRole('dialog', { name: /Change Your Password/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('returns to the login screen with a notice when the session is rejected', async () => {
    mockSession('REQUESTER');
    render(<App />);
    await screen.findByRole('button', { name: /My Tickets/i });

    window.dispatchEvent(new Event(api.SESSION_EXPIRED_EVENT));

    expect(await screen.findByText(/Your session has ended/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /My Tickets/i })).not.toBeInTheDocument();
  });
});
