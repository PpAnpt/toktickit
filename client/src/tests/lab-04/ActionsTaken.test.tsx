import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ActionsTaken } from '../../components/ActionsTaken';
import * as api from '../../api';

const staffMembers: api.StaffMember[] = [
  { id: 1, name: 'Sarah Connor', email: 's@example.com', role: 'IT_STAFF' },
  { id: 2, name: 'James Gordon', email: 'j@example.com', role: 'IT_STAFF' },
  { id: 3, name: 'Admin System', email: 'a@example.com', role: 'ADMINISTRATOR' },
];

const person = (id: number, name: string, role = 'IT_STAFF') => ({ id, name, role });

function makeAction(overrides: Partial<api.ActionTakenItem> = {}): api.ActionTakenItem {
  return {
    id: 1,
    ticketId: 10,
    actionAt: '2026-10-29T03:15:00.000Z',
    description: 'Replaced the faulty network cable at desk 14B.',
    result: 'Link restored; ping stable.',
    performedBy: person(1, 'Sarah Connor'),
    assignee: person(2, 'James Gordon'),
    status: 'Completed',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: '2026-10-29T03:20:00.000Z',
    updatedAt: '2026-10-29T03:20:00.000Z',
    updatedBy: null,
    ...overrides,
  };
}

const page = (actions: api.ActionTakenItem[], total = actions.length): api.ActionsPage => ({ actions, total, page: 1, limit: 20 });

function renderStaff(props: Partial<React.ComponentProps<typeof ActionsTaken>> = {}) {
  return render(<ActionsTaken ticketId={10} ticketStatus="Open" canEdit staffMembers={staffMembers} {...props} />);
}

describe('Lab 4: ActionsTaken component (Issue #31)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('UI-01: renders every field, newest first as returned by the server', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([
      makeAction({ id: 2, description: 'Newest action', followUpRequired: true, followUpNote: 'Check on Friday', attachmentNotes: 'Photo in Tickets/10', updatedBy: { id: 2, name: 'James Gordon' } }),
      makeAction({ id: 1, description: 'Older action' }),
    ]));
    render(<ActionsTaken ticketId={10} ticketStatus="Open" canEdit={false} />);

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Newest action')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Older action')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Performed by Sarah Connor/)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Assigned to James Gordon/)).toBeInTheDocument();
    expect(within(cards[0]).getByText('Completed')).toBeInTheDocument();       // status shown as text, not colour only
    expect(within(cards[0]).getByText('Follow-up')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Check on Friday')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Look for:/)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Edited by James Gordon/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Actions Taken (2)' })).toBeInTheDocument();
  });

  it('UI-02: shows the empty message, with the resolve hint for staff only', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    const staff = renderStaff();
    expect(await screen.findByText(/No actions have been recorded yet\./)).toBeInTheDocument();
    expect(screen.getByText(/Complete at least one action before resolving this Ticket/)).toBeInTheDocument();
    staff.unmount();

    render(<ActionsTaken ticketId={10} ticketStatus="Open" canEdit={false} />);
    expect(await screen.findByText(/No actions have been recorded yet\./)).toBeInTheDocument();
    expect(screen.queryByText(/before resolving this Ticket/)).not.toBeInTheDocument();
  });

  it('UI-03: staff see Add and Edit; a Requester sees neither and no history', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
    const staff = renderStaff();
    expect(await screen.findByRole('button', { name: '+ Add Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    staff.unmount();

    render(<ActionsTaken ticketId={10} ticketStatus="Open" canEdit={false} />);
    await screen.findByRole('article');
    expect(screen.queryByRole('button', { name: '+ Add Action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
  });

  it('UI-04: validation messages appear under their fields, the summary gets focus, and nothing is sent', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    const create = vi.spyOn(api, 'createActionTaken');
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));

    const description = screen.getByLabelText('Action description');
    expect(await screen.findByText('Describe what was done.')).toBeInTheDocument();
    expect(description).toHaveAttribute('aria-invalid', 'true');
    expect(description.getAttribute('aria-describedby')).toBe(screen.getByText('Describe what was done.').id);
    expect(screen.getByText('Enter the result of this action.')).toBeInTheDocument(); // default status is Completed
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(create).not.toHaveBeenCalled();
  });

  it('UI-05: the follow-up note appears only when follow-up is checked and is then required', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    const create = vi.spyOn(api, 'createActionTaken');
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    expect(screen.queryByLabelText(/Follow-up note/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Follow-up required?'));
    expect(screen.getByLabelText(/Follow-up note/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Fixed it' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Works' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
    expect(await screen.findByText('Follow-up note is required when follow-up is needed.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Follow-up required?'));
    expect(screen.queryByLabelText(/Follow-up note/)).not.toBeInTheDocument();
  });

  it('UI-06: a double click sends one request with one clientRequestId and disables Save while busy', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    let finish!: (value: { action: api.ActionTakenItem; replayed: boolean }) => void;
    const create = vi.spyOn(api, 'createActionTaken').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Fixed it' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Works' } });

    const save = screen.getByRole('button', { name: 'Save action' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1].clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();

    finish({ action: makeAction(), replayed: false });
    expect(await screen.findByText('Action saved.')).toBeInTheDocument();
  });

  it('UI-06: the default action time is left to the server, but a time the user changed is sent', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    const create = vi.spyOn(api, 'createActionTaken').mockResolvedValue({ action: makeAction(), replayed: false });
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Fixed it' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Works' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][1]).not.toHaveProperty('actionAt');

    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Second' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Works' } });
    fireEvent.change(screen.getByLabelText('Action date and time'), { target: { value: '2026-10-29T08:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][1].actionAt).toBe(new Date('2026-10-29T08:30').toISOString());
  });

  it('UI-06: an edit that leaves the time alone does not resend it', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
    const update = vi.spyOn(api, 'updateActionTaken').mockResolvedValue(makeAction());
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Reworded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][2]).not.toHaveProperty('actionAt');
    expect(update.mock.calls[0][2]).toMatchObject({ description: 'Reworded', expectedUpdatedAt: '2026-10-29T03:20:00.000Z' });
  });

  it('UI-07: a stale update shows the banner with Reload, keeps the text, and retries with the latest token', async () => {
    const original = makeAction();
    const latest = makeAction({ updatedAt: '2026-10-29T04:00:00.000Z', description: 'Changed by James' });
    const list = vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([original]));
    const update = vi.spyOn(api, 'updateActionTaken')
      .mockRejectedValueOnce(new api.ActionApiError(409, 'This Action Taken was changed by someone else.', 'STALE_UPDATE', {}, latest.updatedAt))
      .mockResolvedValueOnce(latest);
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const description = screen.getByLabelText('Action description');
    fireEvent.change(description, { target: { value: 'My careful edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/changed by someone else while you were editing/i)).toBeInTheDocument();
    expect(update.mock.calls[0][2].expectedUpdatedAt).toBe(original.updatedAt);
    expect(screen.getByLabelText('Action description')).toHaveValue('My careful edit');

    list.mockResolvedValue(page([latest]));
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    expect(await screen.findByText(/Latest version loaded/)).toBeInTheDocument();
    expect(screen.getByLabelText('Action description')).toHaveValue('My careful edit');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][2].expectedUpdatedAt).toBe(latest.updatedAt);
  });

  it('UI-08: a server or network failure on create shows an alert and keeps the entered text', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    vi.spyOn(api, 'createActionTaken').mockRejectedValue(new api.ActionApiError(500, 'Something went wrong on the server. Please try again.'));
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Fixed it' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Works' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on the server');
    expect(screen.getByLabelText('Action description')).toHaveValue('Fixed it');
    expect(screen.getByLabelText(/^Result/)).toHaveValue('Works');
    expect(screen.getByRole('button', { name: 'Save action' })).toBeEnabled();
  });

  it('UI-09: on a Closed or Cancelled Ticket Add and Edit are hidden with an explanation', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
    for (const status of ['Closed', 'Cancelled']) {
      const view = renderStaff({ ticketStatus: status });
      await screen.findByRole('article');
      expect(screen.queryByRole('button', { name: '+ Add Action' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.getByText(new RegExp(`This Ticket is ${status.toLowerCase()}`))).toBeInTheDocument();
      view.unmount();
    }
  });

  it('UI-26: the assignee list holds active staff only; an inactive current assignee is labelled and not selectable; server rejection shows under the field', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([
      makeAction({ id: 5, assignee: person(9, 'Marcus Wright'), status: 'Planned', result: null }),
    ]));
    const update = vi.spyOn(api, 'updateActionTaken')
      .mockRejectedValue(new api.ActionApiError(400, 'Validation failed', undefined, { assigneeId: 'Choose an active IT Staff or Administrator.' }));
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Reassign' }));

    const select = screen.getByLabelText('Assignee') as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options.map(o => o.textContent)).toEqual(['Sarah Connor', 'James Gordon', 'Admin System', 'Marcus Wright (inactive)']);
    expect(options.find(o => o.textContent === 'Marcus Wright (inactive)')!.disabled).toBe(true);

    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));
    expect(await screen.findByText('Choose an active IT Staff or Administrator.')).toBeInTheDocument();
    expect(update.mock.calls[0][2]).toMatchObject({ assigneeId: 1, expectedUpdatedAt: '2026-10-29T03:20:00.000Z' });
  });

  it('UI-27: lifecycle buttons match the status; Complete and Cancel need a Result; terminal actions show none', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([
      makeAction({ id: 3, status: 'Planned', description: 'Planned one', result: null }),
      makeAction({ id: 2, status: 'In Progress', description: 'Running one', result: null }),
      makeAction({ id: 1, status: 'Completed', description: 'Done one' }),
    ]));
    const update = vi.spyOn(api, 'updateActionTaken').mockResolvedValue(makeAction());
    renderStaff();
    const [planned, running, done] = await screen.findAllByRole('article');

    expect(within(planned).getAllByRole('button').map(b => b.textContent)).toEqual(expect.arrayContaining(['Edit', 'Start', 'Complete', 'Cancel', 'Reassign']));
    const runningButtons = within(running).getAllByRole('button').map(b => b.textContent);
    expect(runningButtons).toEqual(expect.arrayContaining(['Complete', 'Cancel']));
    expect(runningButtons).not.toContain('Start');
    const doneButtons = within(done).queryAllByRole('button').map(b => b.textContent);
    expect(doneButtons).not.toContain('Start');
    expect(doneButtons).not.toContain('Complete');
    expect(doneButtons).not.toContain('Cancel');

    fireEvent.click(within(running).getByRole('button', { name: 'Complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as completed' }));
    expect(await screen.findByText('Enter the result of this action.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Switch replaced' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as completed' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][2]).toMatchObject({ status: 'Completed', result: 'Switch replaced' });
  });

  it('UI-27: cancelling needs a reason', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction({ id: 7, status: 'Planned', result: null })]));
    const update = vi.spyOn(api, 'updateActionTaken');
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel action' }));
    expect(await screen.findByText('Enter the reason for cancelling.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('UI-28: staff can open a read-only per-action history with Before and After text', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
    vi.spyOn(api, 'fetchActionRevisions').mockResolvedValue({
      total: 2, page: 1, limit: 10,
      revisions: [
        { revisionNo: 1, type: 'CREATED', actor: { id: 1, name: 'Sarah Connor' }, createdAt: '2026-10-29T03:20:00.000Z', changedFields: [], before: null, after: { result: 'Link restored.' } },
        { revisionNo: 2, type: 'EDITED', actor: { id: 2, name: 'James Gordon' }, createdAt: '2026-10-29T05:00:00.000Z', changedFields: ['result'], before: { result: 'Link restored.' }, after: { result: 'Link restored; ping stable.' } },
      ],
    });
    const { container } = renderStaff();
    await screen.findByRole('article');
    const details = container.querySelector('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));

    expect(await screen.findByText(/edited/i)).toBeInTheDocument();
    expect(screen.getByText('Before: Link restored.')).toBeInTheDocument();
    expect(screen.getByText('After: Link restored; ping stable.')).toBeInTheDocument();
    // History is read-only: no edit or delete controls inside it
    expect(within(details).queryAllByRole('button')).toHaveLength(0);
  });

  it('UI-29: the actions list paginates with Previous/Next and "Showing x-y of N"', async () => {
    const list = vi.spyOn(api, 'fetchActionsTaken').mockImplementation(async (_id, p = 1) => ({
      actions: [makeAction({ id: p, description: `Action on page ${p}` })], total: 45, page: p, limit: 20,
    }));
    renderStaff();
    expect(await screen.findByText('Action on page 1')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-20 of 45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Action on page 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 21-40 of 45')).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(10, 2, 20);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Showing 41-45 of 45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('UI-29: the history list paginates too', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
    const history = vi.spyOn(api, 'fetchActionRevisions').mockImplementation(async (_t, _a, p = 1) => ({
      total: 25, page: p, limit: 10,
      revisions: [{ revisionNo: p, type: 'EDITED', actor: { id: 1, name: 'Sarah Connor' }, createdAt: '2026-10-29T03:20:00.000Z', changedFields: [], before: {}, after: {} }],
    }));
    const { container } = renderStaff();
    await screen.findByRole('article');
    const details = container.querySelector('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));

    expect(await screen.findByText('History 1-10 of 25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next history' }));
    expect(await screen.findByText('History 11-20 of 25')).toBeInTheDocument();
    expect(history).toHaveBeenLastCalledWith(10, 1, 2, 10);
  });

  it('UI-31: on a Resolved Ticket only Completed is offered; a 409 TICKET_RESOLVED shows an alert and keeps the text', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
    vi.spyOn(api, 'createActionTaken').mockRejectedValue(
      new api.ActionApiError(409, 'Reopen the Ticket before planning new work', 'TICKET_RESOLVED'));
    renderStaff({ ticketStatus: 'Resolved' });
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));

    const status = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(Array.from(status.options).map(o => o.textContent)).toEqual(['Completed']);
    expect(screen.getByText('Reopen the Ticket to plan new work.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Late record' } });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Done' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reopen the Ticket before planning new work');
    expect(screen.getByLabelText('Action description')).toHaveValue('Late record');
  });

  describe('unsaved edits and paging (UI-33..35)', () => {
    const openEdit = async (name = 'Edit') => fireEvent.click((await screen.findAllByRole('button', { name }))[0]);

    it('UI-33: Close and switching editor ask before dropping typed text; cancelling keeps it, confirming closes', async () => {
      vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction({ id: 2, description: 'Second' }), makeAction({ id: 1, description: 'First' })]));
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'My unsaved edit' } });

      // Close, declined: the text stays
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Action description')).toHaveValue('My unsaved edit');

      // Editing the other action, declined: still the same editor and text
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(screen.getAllByRole('form')).toHaveLength(1);
      expect(screen.getByLabelText('Action description')).toHaveValue('My unsaved edit');

      // Switching, confirmed: the other action opens with its own saved text
      confirm.mockReturnValue(true);
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByLabelText('Action description')).toHaveValue('First');

      // Close, confirmed: closes
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Changed again' } });
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });

    it('UI-33: no prompt when nothing was typed, and Add Action is guarded too', async () => {
      vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderStaff();
      await openEdit();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(confirm).not.toHaveBeenCalled();
      expect(screen.queryByRole('form')).not.toBeInTheDocument();

      await openEdit();
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Edited' } });
      fireEvent.click(screen.getByRole('button', { name: '+ Add Action' }));
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Action description')).toHaveValue('Edited');
    });

    // 21 actions: ids 21..2 on page 1 and id 1 on page 2, until action 21 moves to page 2
    const pagedServer = (state: { moved: boolean; latest: api.ActionTakenItem }) => vi.spyOn(api, 'fetchActionsTaken').mockImplementation(async (_t, p) => {
      const original = makeAction({ id: 21, description: 'Action 21' });
      const rows = Array.from({ length: 20 }, (_, i) => makeAction({ id: 20 - i, description: 'Action ' + (20 - i) }));
      const all = state.moved ? [...rows, state.latest] : [original, ...rows];
      const slice = all.slice((p - 1) * 20, p * 20);
      return { actions: slice, total: 21, page: p, limit: 20 };
    });

    it('UI-34: the editor and text survive Reload latest when the action moved to another page', async () => {
      const latest = makeAction({ id: 21, description: 'Action 21', updatedAt: '2026-10-29T05:00:00.000Z' });
      const state = { moved: false, latest };
      pagedServer(state);
      const update = vi.spyOn(api, 'updateActionTaken')
        .mockRejectedValueOnce(new api.ActionApiError(409, 'changed', 'STALE_UPDATE', {}, latest.updatedAt))
        .mockResolvedValueOnce(latest);
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Keep this text' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText(/changed by someone else while you were editing/i)).toBeInTheDocument();

      state.moved = true;
      fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
      expect(await screen.findByText(/Latest version loaded/)).toBeInTheDocument();
      expect(screen.getByText(/is not on this page of the list/)).toBeInTheDocument();
      expect(screen.getByLabelText('Action description')).toHaveValue('Keep this text');

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
      expect(update.mock.calls[1][2].expectedUpdatedAt).toBe(latest.updatedAt);
      expect(update.mock.calls[1][2].description).toBe('Keep this text');
    });

    it('UI-34: a failed reload keeps the editor, the text and the Reload latest button', async () => {
      const latest = makeAction({ id: 21, updatedAt: '2026-10-29T05:00:00.000Z' });
      const state = { moved: false, latest };
      const list = pagedServer(state);
      vi.spyOn(api, 'updateActionTaken').mockRejectedValue(new api.ActionApiError(409, 'changed', 'STALE_UPDATE', {}, latest.updatedAt));
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Still here' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await screen.findByRole('button', { name: 'Reload latest' });

      list.mockRejectedValue(new Error('network down'));
      fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
      expect(await screen.findByText(/latest version could not be loaded/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Action description')).toHaveValue('Still here');
      expect(screen.getByRole('button', { name: 'Reload latest' })).toBeInTheDocument();
    });

    it('UI-35: changing page keeps an open editor and its text', async () => {
      pagedServer({ moved: false, latest: makeAction({ id: 21 }) });
      const confirm = vi.spyOn(window, 'confirm');
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Typed on page 1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText('Action 1');
      expect(screen.getByLabelText('Action description')).toHaveValue('Typed on page 1');
      expect(screen.getByText(/is not on this page of the list/)).toBeInTheDocument();
      expect(confirm).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      await screen.findByText('Action 20');
      expect(screen.getByLabelText('Action description')).toHaveValue('Typed on page 1');
      expect(screen.queryByText(/is not on this page of the list/)).not.toBeInTheDocument();
    });

    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };

    it("UI-36: the conflict banner and Reload latest survive the editor moving to the detached block while another page is still loading", async () => {
      const latest = makeAction({ id: 21, description: "Action 21", updatedAt: "2026-10-29T05:00:00.000Z" });
      const rows = Array.from({ length: 20 }, (_, i) => makeAction({ id: 20 - i, description: "Action " + (20 - i) }));
      let moved = false;
      const secondPage = deferred<api.ActionsPage>();
      vi.spyOn(api, "fetchActionsTaken").mockImplementation(async (_t, p) => {
        if (!moved) return { actions: p === 1 ? [makeAction({ id: 21, description: "Action 21" }), ...rows] : [makeAction({ id: 0 })], total: 21, page: p, limit: 20 };
        return p === 1 ? { actions: rows, total: 21, page: 1, limit: 20 } : secondPage.promise;
      });
      vi.spyOn(api, "updateActionTaken").mockRejectedValue(new api.ActionApiError(409, "changed", "STALE_UPDATE", {}, latest.updatedAt));
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Keep this text" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByRole("button", { name: "Reload latest" });

      moved = true;
      fireEvent.click(screen.getByRole("button", { name: "Reload latest" }));
      // page 1 answered without the action, so the editor is now in the detached block; page 2 is still pending
      expect(await screen.findByText(/is not on this page of the list/)).toBeInTheDocument();
      secondPage.reject(new Error("network down"));

      expect(await screen.findByText(/latest version could not be loaded/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reload latest" })).toBeInTheDocument();
      expect(screen.getByLabelText("Action description")).toHaveValue("Keep this text");
    });

    it("UI-37: a save in flight stays locked when the editor moves to the detached block, and finishes normally", async () => {
      pagedServer({ moved: false, latest: makeAction({ id: 21 }) });
      const saving = deferred<api.ActionTakenItem>();
      const update = vi.spyOn(api, "updateActionTaken").mockReturnValue(saving.promise);
      renderStaff();
      await openEdit();
      fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Saving this" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByText(/is not on this page of the list/);
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
      fireEvent.submit(screen.getByRole("form"));
      expect(update).toHaveBeenCalledTimes(1);

      saving.resolve(makeAction({ id: 21, description: "Saving this", updatedAt: "2026-10-29T06:00:00.000Z" }));
      expect(await screen.findByText("Action saved.")).toBeInTheDocument();
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
      expect(update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ticket status changes while an editor is open (UI-38, UI-39)', () => {
    const rendered = (status: string) => (
      <ActionsTaken ticketId={10} ticketStatus={status} canEdit staffMembers={staffMembers} />
    );

    it('UI-38: when the Ticket becomes Closed or Cancelled under an unsaved draft, the draft stays visible but cannot be saved, and Close asks first', async () => {
      vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
      const update = vi.spyOn(api, 'updateActionTaken');
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const view = render(rendered('Open'));
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Draft kept' } });

      view.rerender(rendered('Cancelled'));
      expect(screen.getByLabelText('Action description')).toHaveValue('Draft kept');
      expect(screen.getByText(/can no longer be saved/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
      fireEvent.submit(screen.getByRole('form'));
      expect(update).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: '+ Add Action' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Action description')).toHaveValue('Draft kept');
      confirm.mockReturnValue(true);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });

    it('UI-38: with nothing typed the editor simply goes away when the Ticket becomes terminal', async () => {
      vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([makeAction()]));
      const view = render(rendered('Open'));
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      view.rerender(rendered('Closed'));
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });

    it('UI-39: a new-action draft planned as Planned becomes Completed when the Ticket turns Resolved, and keeps its text', async () => {
      vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([]));
      const create = vi.spyOn(api, 'createActionTaken').mockResolvedValue({ action: makeAction(), replayed: false });
      const view = render(rendered('Open'));
      fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Planned' } });
      fireEvent.change(screen.getByLabelText('Action description'), { target: { value: 'Plan the swap' } });

      view.rerender(rendered('Resolved'));
      expect(screen.getByLabelText('Status')).toHaveValue('Completed');
      expect(screen.getByLabelText('Action description')).toHaveValue('Plan the swap');
      fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: 'Swapped' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(create.mock.calls[0][1].status).toBe('Completed');
    });
  });
});
