import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { RequesterDashboard } from '../../components/RequesterDashboard';
import * as api from '../../api';

const requester: api.UserProfile = { id: 5, name: 'David Lee', email: 'david.lee@example.com', role: 'REQUESTER', mustChangePassword: false };

const data = (overrides: Partial<api.RequesterDashboardData> = {}): api.RequesterDashboardData => ({
  generatedAt: '2026-10-29T04:00:00.000Z',
  windowStart: '2026-10-22T17:00:00.000Z',
  metrics: { openTickets: 3, waitingForRequester: 1, recentlyUpdated: 4, recentlyResolved: 2 },
  attention: [{ id: 7, ticketNumber: 'TKT-0007', summary: 'VPN drops every ten minutes', status: 'Waiting for Requester', updatedAt: '2026-10-28T04:00:00.000Z' }],
  recentTickets: [
    { id: 9, ticketNumber: 'TKT-0009', summary: 'Printer jam', status: 'In Progress', updatedAt: '2026-10-29T03:00:00.000Z' },
    { id: 7, ticketNumber: 'TKT-0007', summary: 'VPN drops every ten minutes', status: 'Waiting for Requester', updatedAt: '2026-10-28T04:00:00.000Z' },
  ],
  ...overrides,
});

const zero = data({
  metrics: { openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 },
  attention: [],
  recentTickets: [],
});

describe('Lab 4: Requester dashboard (Issue #33)', () => {
  const onNavigate = vi.fn();
  const onOpenTicket = vi.fn();
  const onGoHome = vi.fn();
  const setup = () =>
    render(<RequesterDashboard currentUser={requester} onNavigate={onNavigate} onOpenTicket={onOpenTicket} onGoHome={onGoHome} />);

  beforeEach(() => { vi.restoreAllMocks(); onNavigate.mockReset(); onOpenTicket.mockReset(); onGoHome.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('UI-21: four labelled cards show their values and the Last 7 days sub-label on the two recent ones', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(data());
    setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, David!' })).toBeInTheDocument();
    for (const name of [
      'Open Tickets: 3. Open list.', 'Waiting for You: 1. Open list.', 'Recently Updated: 4. Open list.', 'Recently Resolved: 2. Open list.',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByText('Last 7 days')).toHaveLength(2);
    expect(within(screen.getByRole('link', { name: /^Recently Updated/ })).getByText('Last 7 days')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /^Recently Resolved/ })).getByText('Last 7 days')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /^Open Tickets/ })).queryByText('Last 7 days')).not.toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('UI-22: the attention and recent lists show number, summary and status, and each row opens its Ticket', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(data());
    setup();

    const attention = await screen.findByRole('region', { name: 'Needs your attention' });
    const attentionRows = within(attention).getAllByRole('listitem');
    expect(attentionRows).toHaveLength(1);
    expect(attentionRows[0]).toHaveTextContent('TKT-0007');
    expect(attentionRows[0]).toHaveTextContent('VPN drops every ten minutes');
    expect(attentionRows[0]).toHaveTextContent('Waiting for Requester');

    const recent = screen.getByRole('region', { name: 'Recent Tickets' });
    const recentRows = within(recent).getAllByRole('listitem');
    expect(recentRows).toHaveLength(2);
    expect(recentRows[0]).toHaveTextContent('TKT-0009');
    expect(recentRows[0]).toHaveTextContent('In Progress');
    expect(recentRows[0]).toHaveTextContent(/Updated/);

    fireEvent.click(within(recent).getByRole('link', { name: /TKT-0009 Printer jam/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(9);
    fireEvent.click(within(attention).getByRole('link', { name: /TKT-0007/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(7);
  });

  it('UI-22: with nothing to show, both lists explain why', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(zero);
    setup();
    expect(await screen.findByText('No Tickets are waiting for you.')).toBeInTheDocument();
    expect(screen.getByText('You have not created any Tickets yet.')).toBeInTheDocument();
    for (const label of ['Open Tickets', 'Waiting for You', 'Recently Updated', 'Recently Resolved']) {
      expect(screen.getByRole('link', { name: `${label}: 0. Open list.` })).toBeInTheDocument();
    }
  });

  it('UI-23: every card opens My Tickets with the filter from api-spec section 4.1; quick actions are present', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(data());
    setup();
    await screen.findByRole('link', { name: /^Open Tickets/ });

    fireEvent.click(screen.getByRole('link', { name: /^Open Tickets/ }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'my-tickets', status: 'Active' });
    fireEvent.click(screen.getByRole('link', { name: /^Waiting for You/ }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'my-tickets', status: 'Waiting for Requester' });
    fireEvent.click(screen.getByRole('link', { name: /^Recently Updated/ }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'my-tickets', recent: 'updated' });
    fireEvent.click(screen.getByRole('link', { name: /^Recently Resolved/ }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'my-tickets', recent: 'resolved' });

    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'create' });
    fireEvent.click(screen.getByRole('button', { name: 'View My Tickets' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'my-tickets' });
  });

  it('UI-24: loading, 403 and 500 give the same feedback as the staff dashboard', async () => {
    let resolve!: (value: api.RequesterDashboardData) => void;
    const fetcher = vi.spyOn(api, 'fetchRequesterDashboard').mockReturnValue(new Promise(r => { resolve = r; }));
    const first = setup();
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
    expect(screen.getByTestId('metric-grid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();
    resolve(data());
    await screen.findByRole('link', { name: /^Open Tickets/ });
    first.unmount();

    fetcher.mockRejectedValue(new api.ActionApiError(403, 'x'));
    const second = setup();
    expect(await screen.findByText('You do not have access to this dashboard.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to my dashboard' }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
    second.unmount();

    fetcher.mockReset();
    fetcher.mockRejectedValueOnce(new api.ActionApiError(500, 'boom'));
    fetcher.mockResolvedValue(data());
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('The dashboard could not be loaded.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /^Open Tickets: 3/ })).toBeInTheDocument();
  });
});
