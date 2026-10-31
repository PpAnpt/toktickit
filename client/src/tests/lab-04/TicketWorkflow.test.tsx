import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { StaffTicketDetail } from '../../components/StaffTicketDetail';
import * as api from '../../api';

const currentUser: api.UserProfile = { id: 5, email: 'sarah.connor@example.com', name: 'Sarah Connor', role: 'IT_STAFF', mustChangePassword: false };
const members: api.StaffMember[] = [
  { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
  { id: 6, name: 'James Gordon', email: 'james.gordon@example.com', role: 'IT_STAFF' },
];

const TOKEN = '2026-10-30T08:00:00.000Z';

function makeTicket(overrides: Partial<api.StaffTicketDetail> = {}): api.StaffTicketDetail {
  return {
    id: 1,
    ticketNumber: 'TKT-2026-000001',
    summary: 'Laptop display flickering issue',
    description: 'External monitor flickers every 10 minutes.',
    status: 'Open',
    requestedPriority: 'HIGH',
    itPriority: 'MEDIUM',
    indicatedResolvedAt: null,
    createdAt: '2026-10-29T10:30:00.000Z',
    updatedAt: TOKEN,
    requester: { id: 1, name: 'David Lee', email: 'david.lee@example.com' },
    owner: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
    category: { id: 1, name: 'Hardware' },
    relatedSystem: { id: 1, name: 'Laptop' },
    attachments: [],
    comments: [],
    internalNotes: [],
    ...overrides,
  } as api.StaffTicketDetail;
}

function setup(ticket = makeTicket(), eventsPage: api.TicketEventsPage = { events: [], total: 0, page: 1, limit: 50 }) {
  vi.spyOn(api, 'fetchStaffMembers').mockResolvedValue(members);
  vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue({ actions: [], total: 0, page: 1, limit: 20 });
  vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([]);
  vi.spyOn(api, 'fetchInternalNotes').mockResolvedValue([]);
  const fetchEvents = vi.spyOn(api, 'fetchTicketEvents').mockResolvedValue(eventsPage);
  const fetchDetail = vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue(ticket);
  const view = render(<StaffTicketDetail ticketId={1} currentUser={currentUser} onBack={vi.fn()} />);
  return { fetchDetail, fetchEvents, ...view };
}

const moveButtons = () => screen.queryAllByRole('button', { name: /^→ Move to/ }).map(b => b.textContent?.replace('→ Move to ', '').trim());

describe('Lab 4: Ticket workflow controls (Issue #32)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('UI-10: shows only the permitted "Move to" buttons for each status, and none for terminal statuses', async () => {
    const expected: Record<string, string[]> = {
      'New': ['Open', 'Cancelled'],
      'Open': ['In Progress', 'Waiting for Requester', 'Resolved', 'Cancelled'],
      'In Progress': ['Waiting for Requester', 'Resolved', 'Cancelled'],
      'Waiting for Requester': ['In Progress', 'Resolved', 'Cancelled'],
      'Resolved': ['Closed', 'Reopened'],
      'Reopened': ['In Progress', 'Resolved', 'Cancelled'],
    };
    for (const [status, buttons] of Object.entries(expected)) {
      const { unmount } = setup(makeTicket({ status }));
      await screen.findByText('Status & Workflow Transitions');
      expect(moveButtons(), status).toEqual(buttons);
      unmount();
      vi.restoreAllMocks();
    }
    for (const status of ['Closed', 'Cancelled']) {
      const { unmount } = setup(makeTicket({ status }));
      await screen.findByText('Status & Workflow Transitions');
      expect(moveButtons(), status).toEqual([]);
      expect(screen.getByText(/No further status transitions are permitted/)).toBeInTheDocument();
      unmount();
      vi.restoreAllMocks();
    }
  });

  it('UI-10: Move to Resolved stays enabled and a hint explains the resolution rule', async () => {
    setup();
    const resolved = await screen.findByRole('button', { name: /Move to Resolved/ });
    expect(resolved).toBeEnabled();
    expect(screen.getByText('Resolving requires one completed action and no open actions.')).toBeInTheDocument();
  });

  it('UI-11: RESOLUTION_GATE_FAILED names the reasons with a link to Actions Taken and leaves the status alone', async () => {
    const update = vi.spyOn(api, 'updateTicketStatus').mockRejectedValue(
      new api.ActionApiError(400, 'Complete or cancel all open actions', 'RESOLUTION_GATE_FAILED', {}, undefined, { reasons: ['NO_COMPLETED_ACTION', 'OPEN_ACTIONS'], openActions: 2 }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /Move to Resolved/ }));

    const gate = await screen.findByTestId('resolution-gate-message');
    expect(gate).toHaveAttribute('role', 'alert');
    expect(within(gate).getByText(/No completed action/)).toBeInTheDocument();
    expect(within(gate).getByText(/2 actions are still planned or in progress/)).toBeInTheDocument();
    expect(within(gate).getByRole('link', { name: 'Go to Actions Taken' })).toHaveAttribute('href', '#actions-title-1');
    expect(update).toHaveBeenCalledWith(1, 'Resolved', TOKEN);
    expect(screen.queryByText(/Status changed to/)).not.toBeInTheDocument();
    expect(moveButtons()).toContain('Resolved'); // status unchanged, buttons unchanged
  });

  it('UI-12: a successful transition refreshes the summary status and announces it', async () => {
    const update = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue(
      makeTicket({ status: 'In Progress', updatedAt: '2026-10-30T08:05:00.000Z' }));
    setup();
    await screen.findByRole('button', { name: /Move to In Progress/ });
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }));

    expect(await screen.findByText('Status changed to In Progress.')).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(1, 'In Progress', TOKEN);
    expect(moveButtons()).toEqual(['Waiting for Requester', 'Resolved', 'Cancelled']);
    const header = screen.getByRole('heading', { name: 'TKT-2026-000001' }).parentElement!;
    expect(within(header).getByText('In Progress')).toBeInTheDocument();
    // the new token is used by the next change
    update.mockResolvedValueOnce(makeTicket({ status: 'Waiting for Requester', updatedAt: '2026-10-30T08:09:00.000Z' }));
    fireEvent.click(screen.getByRole('button', { name: /Move to Waiting for Requester/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1]).toEqual([1, 'Waiting for Requester', '2026-10-30T08:05:00.000Z']);
  });

  it('UI-12: the other sections of the Ticket survive a status change (the response carries no attachments)', async () => {
    vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({ ...makeTicket({ status: 'In Progress', updatedAt: '2026-10-30T08:05:00.000Z' }), attachments: undefined, category: undefined } as unknown as api.StaffTicketDetail);
    setup(makeTicket({ attachments: [{ id: 9, originalFileName: 'screenshot.png', storedFileName: 's', size: 2048, mimeType: 'image/png', isRemoved: false, createdAt: TOKEN }] }));
    fireEvent.click(await screen.findByRole('button', { name: /Move to In Progress/ }));
    await screen.findByText('Status changed to In Progress.');
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
  });

  it('UI-13: while a transition is in flight every status button is disabled and only one request is sent', async () => {
    let finish!: (ticket: api.StaffTicketDetail) => void;
    const update = vi.spyOn(api, 'updateTicketStatus').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    setup();
    const first = await screen.findByRole('button', { name: /Move to In Progress/ });
    fireEvent.click(first);
    fireEvent.click(first);
    fireEvent.click(screen.getByRole('button', { name: /Move to Waiting for Requester/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Move to In Progress/ })).toBeDisabled());
    for (const name of [/Move to In Progress/, /Move to Waiting for Requester/, /Move to Resolved/, /Move to Cancelled/]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(update).toHaveBeenCalledTimes(1);

    finish(makeTicket({ status: 'In Progress', updatedAt: '2026-10-30T08:05:00.000Z' }));
    expect(await screen.findByText('Status changed to In Progress.')).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('UI-14: a 409 conflict shows a message with Reload, shows no status change, and Reload loads the latest Ticket', async () => {
    vi.spyOn(api, 'updateTicketStatus').mockRejectedValue(
      new api.ActionApiError(409, 'This Ticket was changed by someone else. Reload and try again', 'STALE_UPDATE', {}, '2026-10-30T09:00:00.000Z'));
    const { fetchDetail } = setup();
    fireEvent.click(await screen.findByRole('button', { name: /Move to Resolved/ }));

    const conflict = await screen.findByTestId('conflict-message');
    expect(conflict).toHaveAttribute('role', 'alert');
    expect(conflict).toHaveTextContent('changed by someone else');
    expect(screen.queryByText(/Status changed to/)).not.toBeInTheDocument();
    expect(moveButtons()).toContain('Resolved');

    fetchDetail.mockResolvedValue(makeTicket({ status: 'Waiting for Requester', updatedAt: '2026-10-30T09:00:00.000Z' }));
    fireEvent.click(within(conflict).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(moveButtons()).toEqual(['In Progress', 'Resolved', 'Cancelled']));
    expect(screen.queryByTestId('conflict-message')).not.toBeInTheDocument();
    expect(fetchDetail).toHaveBeenCalledTimes(2);
  });

  it('UI-14: owner and priority changes send the token and report a conflict the same way', async () => {
    const owner = vi.spyOn(api, 'updateTicketOwner').mockRejectedValue(new api.ActionApiError(409, 'changed', 'STALE_UPDATE'));
    const priority = vi.spyOn(api, 'updateTicketPriority').mockResolvedValue(makeTicket({ itPriority: 'URGENT', updatedAt: '2026-10-30T08:10:00.000Z' }));
    setup();
    await screen.findByLabelText('Reassign Owner');
    fireEvent.change(screen.getByLabelText('Reassign Owner'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Owner Assignment' }));
    expect(await screen.findByTestId('conflict-message')).toBeInTheDocument();
    expect(owner).toHaveBeenCalledWith(1, 6, TOKEN);

    fireEvent.change(screen.getByLabelText('Operational IT Priority'), { target: { value: 'URGENT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save IT Priority' }));
    await waitFor(() => expect(priority).toHaveBeenCalledWith(1, 'URGENT', TOKEN));
  });

  it('UI-30: Move to Cancelled opens a confirm panel that warns about open actions; Keep leaves everything, Confirm cancels', async () => {
    const update = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue(makeTicket({ status: 'Cancelled', updatedAt: '2026-10-30T08:05:00.000Z' }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /Move to Cancelled/ }));

    const panel = screen.getByRole('alertdialog', { name: 'Cancel this Ticket?' });
    expect(within(panel).getByText(/open actions .* will be cancelled automatically/i)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(within(panel).getByRole('button', { name: 'Keep Ticket' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Move to Cancelled/ }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel Ticket' }));
    expect(await screen.findByText('Status changed to Cancelled.')).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(1, 'Cancelled', TOKEN);
    expect(moveButtons()).toEqual([]);
  });

  it('shows the Requester indication as an informational notice that does not change the controls', async () => {
    setup(makeTicket({ indicatedResolvedAt: '2026-10-30T07:00:00.000Z' }));
    expect(await screen.findByText(/Requester says the problem appears resolved\. Review the actions and update the Ticket\./)).toBeInTheDocument();
    expect(moveButtons()).toEqual(['In Progress', 'Waiting for Requester', 'Resolved', 'Cancelled']);
  });

  describe('Ticket history timeline (UI-32)', () => {
    const event = (id: number, type: api.TicketEventItem['type'], from: string | null, to: string | null, actor = 'Sarah Connor') =>
      ({ id, type, from, to, actor: { id: 5, name: actor }, createdAt: `2026-10-30T0${id}:00:00.000Z` });

    it('UI-32: lists status, owner and priority events oldest first, read-only', async () => {
      setup(makeTicket(), {
        events: [
          event(1, 'OWNER_CHANGED', null, 'Sarah Connor'),
          event(2, 'STATUS_CHANGED', 'New', 'Open'),
          event(3, 'PRIORITY_CHANGED', 'MEDIUM', 'URGENT', 'James Gordon'),
        ],
        total: 3, page: 1, limit: 50,
      });
      const section = await screen.findByRole('region', { name: 'Ticket history' });
      const items = await within(section).findAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('Owner: Unassigned → Sarah Connor');
      expect(items[1]).toHaveTextContent('Status: New → Open');
      expect(items[2]).toHaveTextContent('Priority: MEDIUM → URGENT');
      expect(items[2]).toHaveTextContent('James Gordon');
      expect(within(section).queryByRole('button', { name: /edit|delete|remove/i })).not.toBeInTheDocument();
    });

    it('UI-32: a Ticket without events says "No history recorded before Lab 4."', async () => {
      setup();
      const section = await screen.findByRole('region', { name: 'Ticket history' });
      expect(await within(section).findByText('No history recorded before Lab 4.')).toBeInTheDocument();
    });

    it('UI-32: a load failure is reported with Retry, and the rest of the screen keeps working', async () => {
      const { fetchEvents } = setup();
      const section = await screen.findByRole('region', { name: 'Ticket history' });
      expect(await within(section).findByText('No history recorded before Lab 4.')).toBeInTheDocument();
      // a status change refreshes the history; this refresh fails
      fetchEvents.mockRejectedValueOnce(new Error('History could not be loaded.'));
      vi.spyOn(api, 'updateTicketStatus').mockResolvedValue(makeTicket({ status: 'In Progress', updatedAt: '2026-10-30T08:05:00.000Z' }));
      fireEvent.click(await screen.findByRole('button', { name: /Move to In Progress/ }));
      expect(await within(section).findByRole('alert')).toHaveTextContent('History could not be loaded.');
      fetchEvents.mockResolvedValue({ events: [event(1, 'STATUS_CHANGED', 'Open', 'In Progress')], total: 1, page: 1, limit: 50 });
      fireEvent.click(within(section).getByRole('button', { name: 'Retry' }));
      expect(await within(section).findByRole('listitem')).toHaveTextContent('Status: Open → In Progress');
      expect(screen.getByRole('button', { name: /Move to Resolved/ })).toBeEnabled();
    });

    it('UI-32: paginates long histories', async () => {
      const { fetchEvents } = setup(makeTicket(), { events: [event(1, 'STATUS_CHANGED', 'New', 'Open')], total: 60, page: 1, limit: 50 });
      const section = await screen.findByRole('region', { name: 'Ticket history' });
      expect(await within(section).findByText('History 1-50 of 60')).toBeInTheDocument();
      fetchEvents.mockResolvedValue({ events: [event(2, 'STATUS_CHANGED', 'Open', 'Resolved')], total: 60, page: 2, limit: 50 });
      fireEvent.click(within(section).getByRole('button', { name: 'Next history' }));
      await waitFor(() => expect(within(section).getByRole('listitem')).toHaveTextContent('Status: Open → Resolved'));
      expect(fetchEvents).toHaveBeenLastCalledWith(1, 2, 50);
      expect(within(section).getByText('History 51-60 of 60')).toBeInTheDocument();
    });
  });
});
