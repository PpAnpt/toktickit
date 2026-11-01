import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import App from '../../App';
import * as api from '../../api';

type Role = api.UserProfile['role'];

const requesterData = {
  generatedAt: '2026-10-29T04:00:00.000Z',
  windowStart: '2026-10-22T17:00:00.000Z',
  metrics: { openTickets: 3, waitingForRequester: 1, recentlyUpdated: 4, recentlyResolved: 2 },
  attention: [],
  recentTickets: [{ id: 9, ticketNumber: 'TKT-0009', summary: 'Printer jam', status: 'In Progress', updatedAt: '2026-10-29T03:00:00.000Z' }],
};
const staffData = {
  generatedAt: '2026-10-29T04:00:00.000Z',
  windowStart: '2026-10-22T17:00:00.000Z',
  metrics: { unassigned: 4, myActive: 3, urgent: 2, reopened: 1, resolvedAwaitingClosure: 5 },
  byStatus: { New: 2, Open: 3, 'In Progress': 4, 'Waiting for Requester': 1, Resolved: 5, Closed: 6, Reopened: 1, Cancelled: 1 },
  byPriority: { LOW: 1, MEDIUM: 4, HIGH: 3, URGENT: 2 },
  recentTickets: [],
  myRecentActions: [],
};

let requests: string[] = [];

function mockSession(role: Role, options: { dashboardStatus?: number } = {}) {
  requests = [];
  vi.spyOn(api, 'getAuthToken').mockReturnValue('mock-jwt-token');
  global.fetch = vi.fn(async (url: string) => {
    const u = url.toString();
    requests.push(u);
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes('/api/auth/me')) return ok({ id: 1, name: 'Test User', email: 'test@example.com', role, mustChangePassword: false });
    if (u.includes('/api/dashboard/')) {
      if (options.dashboardStatus && options.dashboardStatus !== 200) return { ok: false, status: options.dashboardStatus, json: async () => ({ error: 'Forbidden' }) };
      return ok(u.includes('/requester') ? requesterData : staffData);
    }
    if (u.includes('/api/staff/members')) return ok([]);
    if (u.includes('/api/staff/tickets')) return ok({ tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } });
    if (u.includes('/api/admin/users')) return ok([]);
    if (u.includes('/api/tickets')) return ok({ data: [], meta: { totalItems: 0, totalPages: 1 } });
    return ok([]);
  }) as unknown as typeof fetch;
}

const navNames = () =>
  within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('button').map(b => (b.textContent ?? '').replace(/\s+\d+$/, '').trim());
const current = () => within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('button')
  .filter(b => b.getAttribute('aria-current') === 'page').map(b => (b.textContent ?? '').trim());

describe('UI-25: role navigation, landing page and dashboard drill-down (Issue #33)', () => {
  beforeEach(() => { vi.restoreAllMocks(); window.history.pushState(null, '', '/'); });
  afterEach(() => { vi.restoreAllMocks(); window.history.pushState(null, '', '/'); });

  it('a Requester lands on the Requester dashboard; the menu is Dashboard, Create Ticket, My Tickets with Dashboard marked', async () => {
    mockSession('REQUESTER');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Test!' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Open Tickets: 3. Open list.' })).toBeInTheDocument();
    expect(navNames()).toEqual(['Dashboard', 'Create Ticket', 'My Tickets']);
    expect(current()).toEqual(['Dashboard']);
    expect(requests.some(u => u.includes('/api/dashboard/requester'))).toBe(true);
    expect(requests.some(u => u.includes('/api/dashboard/staff'))).toBe(false);
  });

  it('IT Staff land on the staff dashboard: Dashboard, Ticket Queue', async () => {
    mockSession('IT_STAFF');
    render(<App />);
    expect(await screen.findByRole('link', { name: /^Unassigned: 4/ })).toBeInTheDocument();
    expect(navNames()).toEqual(['Dashboard', 'Ticket Queue']);
    expect(current()).toEqual(['Dashboard']);
    expect(screen.queryByRole('region', { name: 'Accounts' })).not.toBeInTheDocument();
  });

  it('the Administrator lands on the staff dashboard: Dashboard, Ticket Queue, User Management', async () => {
    mockSession('ADMINISTRATOR');
    render(<App />);
    expect(await screen.findByRole('link', { name: /^Unassigned: 4/ })).toBeInTheDocument();
    expect(navNames()).toEqual(['Dashboard', 'Ticket Queue', 'User Management']);
    expect(current()).toEqual(['Dashboard']);
  });

  it('the marked entry follows the page, uses aria-current, and the brand returns to the Dashboard', async () => {
    mockSession('REQUESTER');
    render(<App />);
    await screen.findByRole('link', { name: /^Open Tickets/ });

    fireEvent.click(screen.getByRole('button', { name: /^My Tickets/ }));
    await waitFor(() => expect(current()).toEqual(['My Tickets']));
    fireEvent.click(screen.getByRole('button', { name: /^Create Ticket/ }));
    await waitFor(() => expect(current()).toEqual(['Create Ticket']));

    fireEvent.click(screen.getByRole('link', { name: 'TokTickIT' }));
    expect(await screen.findByRole('link', { name: /^Open Tickets/ })).toBeInTheDocument();
    expect(current()).toEqual(['Dashboard']);
  });

  it('a Requester card opens My Tickets with its filter: Open Tickets sends status=Active and the list shows it', async () => {
    mockSession('REQUESTER');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Open Tickets/ }));

    await waitFor(() => expect(requests.some(u => u.includes('/api/tickets?') && u.includes('status=Active'))).toBe(true));
    expect(current()).toEqual(['My Tickets']);
    expect(screen.getByDisplayValue(/^Active/)).toBeInTheDocument();
    expect(await screen.findByTestId('my-tickets-total')).toHaveTextContent('0 Tickets');
  });

  it('Recently Updated and Recently Resolved send recent=...; the filter is explained and can be cleared', async () => {
    mockSession('REQUESTER');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Recently Updated/ }));
    await waitFor(() => expect(requests.some(u => u.includes('/api/tickets?') && u.includes('recent=updated'))).toBe(true));
    expect(await screen.findByText(/Showing Tickets updated in the last 7 days/)).toBeInTheDocument();

    requests.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    await waitFor(() => expect(requests.some(u => u.includes('/api/tickets?'))).toBe(true));
    expect(requests.filter(u => u.includes('/api/tickets?')).every(u => !u.includes('recent='))).toBe(true);
    expect(screen.queryByText(/Showing Tickets updated/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard/ }));
    fireEvent.click(await screen.findByRole('link', { name: /^Recently Resolved/ }));
    await waitFor(() => expect(requests.some(u => u.includes('recent=resolved'))).toBe(true));
    expect(await screen.findByText(/Showing Tickets resolved in the last 7 days/)).toBeInTheDocument();
  });

  it('opening My Tickets from the menu after a drill-down shows the full list again', async () => {
    mockSession('REQUESTER');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Recently Resolved/ }));
    await screen.findByText(/Showing Tickets resolved/);

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard/ }));
    await screen.findByRole('link', { name: /^Open Tickets/ });
    requests.length = 0;
    fireEvent.click(screen.getByRole('button', { name: /^My Tickets/ }));
    await waitFor(() => expect(requests.some(u => u.includes('/api/tickets?'))).toBe(true));
    expect(requests.filter(u => u.includes('/api/tickets?')).every(u => !u.includes('recent=') && !u.includes('status='))).toBe(true);
    expect(screen.queryByText(/Showing Tickets resolved/)).not.toBeInTheDocument();
  });

  it('a staff card opens the Ticket Queue with its filters applied to the controls and the request', async () => {
    mockSession('IT_STAFF');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Unassigned: 4/ }));

    await waitFor(() => expect(requests.some(u => u.includes('/api/staff/tickets?') && u.includes('owner=unassigned') && u.includes('status=Active'))).toBe(true));
    expect(current()).toEqual(['Ticket Queue']);
    expect(screen.getByLabelText('Owner')).toHaveValue('unassigned');
    expect(screen.getByLabelText('Status')).toHaveValue('Active');
    expect(screen.getByLabelText('Priority')).toHaveValue('All');
  });

  it('a breakdown row and the Urgent card open the queue with their priority and status', async () => {
    mockSession('IT_STAFF');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Urgent: 2/ }));
    await waitFor(() => expect(requests.some(u => u.includes('/api/staff/tickets?') && u.includes('priority=URGENT') && u.includes('status=Active'))).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard/ }));
    requests.length = 0;
    fireEvent.click(within(await screen.findByRole('region', { name: 'By status' })).getByRole('link', { name: 'In Progress: 4' }));
    await waitFor(() => expect(requests.some(u => u.includes('/api/staff/tickets?') && u.includes('status=In+Progress'))).toBe(true));
    expect(screen.getByLabelText('Status')).toHaveValue('In Progress');
    expect(screen.getByLabelText('Priority')).toHaveValue('All');
  });

  it('opening the queue from the menu clears the filters of an earlier drill-down', async () => {
    mockSession('IT_STAFF');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Reopened: 1. Open list/ }));
    await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue('Reopened'));

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard/ }));
    await screen.findByRole('link', { name: /^Reopened: 1. Open list/ });
    fireEvent.click(screen.getByRole('button', { name: /^Ticket Queue/ }));
    await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue('All'));
  });

  it('a Requester who opens the other role\'s dashboard URL sees the forbidden message and no numbers, with a way back', async () => {
    window.history.pushState(null, '', '/dashboard/staff');
    mockSession('REQUESTER', { dashboardStatus: 403 });
    // the staff dashboard URL is refused; the Requester's own one answers normally afterwards
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const refuse = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.toString().includes('/api/dashboard/requester')) {
        return { ok: true, status: 200, json: async () => requesterData };
      }
      return refuse(url);
    });

    render(<App />);
    expect(await screen.findByText('You do not have access to this dashboard.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();
    expect(requests.some(u => u.includes('/api/dashboard/staff'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Go to my dashboard' }));
    expect(await screen.findByRole('link', { name: /^Open Tickets: 3/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('opening a Ticket from the dashboard shows Back to Dashboard and returns there', async () => {
    mockSession('REQUESTER');
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => {
      if (/\/api\/tickets\/9(\?|$)/.test(url.toString())) {
        return {
          ok: true, status: 200, json: async () => ({
            id: 9, ticketNumber: 'TKT-0009', summary: 'Printer jam', description: 'It jams', status: 'In Progress', requestedPriority: 'LOW',
            createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-29T03:00:00.000Z', category: { id: 1, name: 'Hardware' },
            relatedSystem: { id: 1, name: 'Printer' }, attachments: [],
          }),
        };
      }
      return base(url);
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /TKT-0009 Printer jam/ }));
    const back = await screen.findByRole('button', { name: /Back to Dashboard/ });
    expect(current()).toEqual(['Dashboard']);
    fireEvent.click(back);
    expect(await screen.findByRole('link', { name: /^Open Tickets: 3/ })).toBeInTheDocument();
  });
});
