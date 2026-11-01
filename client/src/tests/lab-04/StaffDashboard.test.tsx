import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StaffDashboard } from '../../components/StaffDashboard';
import * as api from '../../api';

const staffUser: api.UserProfile = { id: 3, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF', mustChangePassword: false };
const adminUser: api.UserProfile = { id: 1, name: 'Admin System', email: 'admin@example.com', role: 'ADMINISTRATOR', mustChangePassword: false };

const data = (overrides: Partial<api.StaffDashboardData> = {}): api.StaffDashboardData => ({
  generatedAt: '2026-10-29T04:00:00.000Z',
  windowStart: '2026-10-22T17:00:00.000Z',
  metrics: { unassigned: 4, myActive: 3, urgent: 2, reopened: 1, resolvedAwaitingClosure: 5 },
  byStatus: { New: 2, Open: 3, 'In Progress': 4, 'Waiting for Requester': 1, Resolved: 5, Closed: 6, Reopened: 1, Cancelled: 1 },
  byPriority: { LOW: 1, MEDIUM: 4, HIGH: 3, URGENT: 2 },
  recentTickets: [
    { id: 9, ticketNumber: 'TKT-0009', summary: 'Printer jam on floor 2', status: 'In Progress', itPriority: 'HIGH', owner: { id: 3, name: 'Sarah Connor' }, updatedAt: '2026-10-29T03:30:00.000Z' },
    { id: 10, ticketNumber: 'TKT-0010', summary: 'VPN access request', status: 'New', itPriority: 'LOW', owner: null, updatedAt: '2026-10-28T03:30:00.000Z' },
  ],
  myRecentActions: [
    { id: 12, ticketId: 7, ticketNumber: 'TKT-0007', actionAt: '2026-10-29T02:00:00.000Z', description: 'Replaced the faulty network cable', status: 'Completed', assignee: { id: 4, name: 'James Gordon' }, followUpRequired: true },
    { id: 13, ticketId: 9, ticketNumber: 'TKT-0009', actionAt: '2026-10-29T01:00:00.000Z', description: 'Order a replacement toner', status: 'Planned', assignee: { id: 3, name: 'Sarah Connor' }, followUpRequired: false },
  ],
  ...overrides,
});

const zero = data({
  metrics: { unassigned: 0, myActive: 0, urgent: 0, reopened: 0, resolvedAwaitingClosure: 0 },
  byStatus: { New: 0, Open: 0, 'In Progress': 0, 'Waiting for Requester': 0, Resolved: 0, Closed: 0, Reopened: 0, Cancelled: 0 },
  byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
  recentTickets: [],
  myRecentActions: [],
});

describe('Lab 4: IT Staff dashboard (Issue #33)', () => {
  const onNavigate = vi.fn();
  const onOpenTicket = vi.fn();
  const onGoHome = vi.fn();
  const setup = (user = staffUser) =>
    render(<StaffDashboard currentUser={user} onNavigate={onNavigate} onOpenTicket={onOpenTicket} onGoHome={onGoHome} />);

  beforeEach(() => { vi.restoreAllMocks(); onNavigate.mockReset(); onOpenTicket.mockReset(); onGoHome.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('UI-15: welcome line, five metric cards, recent Tickets and My Recent Actions render with their values', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data());
    setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sarah!' })).toBeInTheDocument();
    for (const name of [
      'Unassigned: 4. Open list.', 'My Active Tickets: 3. Open list.', 'Urgent: 2. Open list.',
      'Reopened: 1. Open list.', 'Resolved - Awaiting Closure: 5. Open list.',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }

    const recent = screen.getByRole('region', { name: 'Recent Tickets' });
    const rows = within(recent).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('TKT-0009');
    expect(rows[0]).toHaveTextContent('Printer jam on floor 2');
    expect(rows[0]).toHaveTextContent('In Progress');
    expect(rows[0]).toHaveTextContent('HIGH');
    expect(rows[0]).toHaveTextContent('Sarah Connor');
    expect(rows[1]).toHaveTextContent('Unassigned');

    const actions = screen.getByRole('region', { name: 'My Recent Actions' });
    const actionRows = within(actions).getAllByRole('listitem');
    expect(actionRows).toHaveLength(2);
    expect(actionRows[0]).toHaveTextContent('TKT-0007');
    expect(actionRows[0]).toHaveTextContent('Replaced the faulty network cable');
    expect(actionRows[0]).toHaveTextContent('Completed');
    expect(actionRows[0]).toHaveTextContent('James Gordon');
    expect(actionRows[0]).toHaveTextContent('Follow-up needed');
    expect(actionRows[1]).not.toHaveTextContent('Follow-up needed');
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('UI-15: Refresh loads the numbers again', async () => {
    const fetcher = vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data());
    setup();
    await screen.findByRole('link', { name: 'Unassigned: 4. Open list.' });
    fetcher.mockResolvedValue(data({ metrics: { unassigned: 9, myActive: 3, urgent: 2, reopened: 1, resolvedAwaitingClosure: 5 } }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('link', { name: 'Unassigned: 9. Open list.' })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('UI-16: each card, breakdown row, ticket row and the quick action goes to its queue filter or Ticket', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data());
    setup();
    await screen.findByRole('link', { name: 'Unassigned: 4. Open list.' });

    const go = (name: RegExp) => fireEvent.click(screen.getByRole('link', { name }));
    go(/^Unassigned: 4. Open list/); expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', owner: 'unassigned', status: 'Active' });
    go(/^My Active Tickets: 3. Open list/); expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', owner: 'me', status: 'Active' });
    go(/^Urgent: 2. Open list/); expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', priority: 'URGENT', status: 'Active' });
    go(/^Reopened: 1. Open list/); expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', status: 'Reopened' });
    go(/^Resolved - Awaiting Closure: 5. Open list/); expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', status: 'Resolved' });

    const byStatus = screen.getByRole('region', { name: 'By status' });
    expect(within(byStatus).getAllByRole('link')).toHaveLength(8);
    fireEvent.click(within(byStatus).getByRole('link', { name: 'In Progress: 4' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', status: 'In Progress' });
    fireEvent.click(within(byStatus).getByRole('link', { name: 'Cancelled: 1' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', status: 'Cancelled' });

    const byPriority = screen.getByRole('region', { name: 'By priority' });
    expect(within(byPriority).getAllByRole('link')).toHaveLength(4);
    fireEvent.click(within(byPriority).getByRole('link', { name: 'HIGH: 3' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue', priority: 'HIGH', status: 'Active' });

    // The bars are decorative: the numbers are real text
    expect(byStatus.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('link', { name: /TKT-0009 Printer jam/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(9);
    fireEvent.click(screen.getByRole('link', { name: /TKT-0007 Replaced/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(7);
    fireEvent.click(screen.getByRole('button', { name: 'Open Ticket Queue' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'queue' });
  });

  it('UI-17: while loading, skeletons are announced and no numbers are shown', async () => {
    let resolve!: (value: api.StaffDashboardData) => void;
    vi.spyOn(api, 'fetchStaffDashboard').mockReturnValue(new Promise(r => { resolve = r; }));
    setup();

    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
    expect(screen.getByTestId('metric-grid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();

    resolve(data());
    expect(await screen.findByRole('link', { name: /^Unassigned: 4/ })).toBeInTheDocument();
    expect(screen.getByTestId('metric-grid')).toHaveAttribute('aria-busy', 'false');
  });

  it('UI-17: Refresh hides the old numbers while the new ones load (no stale numbers)', async () => {
    const fetcher = vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data());
    setup();
    await screen.findByRole('link', { name: /^Unassigned: 4/ });
    let resolve!: (value: api.StaffDashboardData) => void;
    fetcher.mockReturnValue(new Promise(r => { resolve = r; }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByTestId('metric-grid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link', { name: /^Unassigned: 4/ })).not.toBeInTheDocument();
    resolve(data());
    expect(await screen.findByRole('link', { name: /^Unassigned: 4/ })).toBeInTheDocument();
  });

  it('UI-18: with all-zero data every card shows 0 and the lists explain they are empty', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(zero);
    setup();
    for (const label of ['Unassigned', 'My Active Tickets', 'Urgent', 'Reopened', 'Resolved - Awaiting Closure']) {
      expect(await screen.findByRole('link', { name: `${label}: 0. Open list.` })).toBeInTheDocument();
    }
    expect(screen.getByText('No Tickets have been updated yet.')).toBeInTheDocument();
    expect(screen.getByText('You have no recent actions.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('UI-19: 403 shows the forbidden message without numbers and a way back', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockRejectedValue(new api.ActionApiError(403, 'x'));
    setup();
    expect(await screen.findByText('You do not have access to this dashboard.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to my dashboard' }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('UI-19: 500 shows an error with Retry that loads again, without the raw server text', async () => {
    const fetcher = vi.spyOn(api, 'fetchStaffDashboard');
    fetcher.mockRejectedValueOnce(new api.ActionApiError(500, 'Something went wrong on the server. Please try again.'));
    fetcher.mockResolvedValue(data());
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('The dashboard could not be loaded.');
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open list/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /^Unassigned: 4/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('UI-19: a network failure also shows the error with Retry', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockRejectedValue(new TypeError('Failed to fetch'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('The dashboard could not be loaded.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('UI-20: the Accounts strip is shown to the Administrator and links to User Management', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data({ userCounts: { requesters: 4, itStaff: 3, administrators: 1, inactive: 2 } }));
    setup(adminUser);
    const accounts = await screen.findByRole('region', { name: 'Accounts' });
    for (const text of ['Requesters: 4', 'IT Staff: 3', 'Administrators: 1', 'Inactive: 2']) {
      expect(within(accounts).getByRole('link', { name: text })).toBeInTheDocument();
    }
    fireEvent.click(within(accounts).getByRole('link', { name: 'Inactive: 2' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: 'users' });
  });

  it('UI-20: IT Staff never see the Accounts strip, even if a response carried the counts', async () => {
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(data({ userCounts: { requesters: 1, itStaff: 1, administrators: 1, inactive: 1 } }));
    setup(staffUser);
    await screen.findByRole('link', { name: /^Unassigned/ });
    expect(screen.queryByRole('region', { name: 'Accounts' })).not.toBeInTheDocument();
  });
});
