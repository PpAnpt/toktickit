import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionsTaken } from '../../components/ActionsTaken';
import * as api from '../../api';

/**
 * STY-01..03 and A11Y-02 (AC-28): information never depends on colour alone, editable and read-only
 * fields differ, and the editor works from the keyboard (Escape closes it, focus returns to the opener).
 */
const person = (id: number, name: string, role = 'IT_STAFF') => ({ id, name, role });
const staffMembers: api.StaffMember[] = [{ id: 1, name: 'Sarah Connor', email: 's@example.com', role: 'IT_STAFF' }];

const action = (overrides: Partial<api.ActionTakenItem> = {}): api.ActionTakenItem => ({
  id: 1, ticketId: 10, actionAt: '2026-10-29T03:15:00.000Z', description: 'Replaced the faulty cable', result: 'Link restored',
  performedBy: person(1, 'Sarah Connor'), assignee: person(1, 'Sarah Connor'), status: 'Completed',
  followUpRequired: false, followUpNote: null, attachmentNotes: null,
  createdAt: '2026-10-29T03:20:00.000Z', updatedAt: '2026-10-29T03:20:00.000Z', updatedBy: null, ...overrides,
});
const page = (actions: api.ActionTakenItem[]): api.ActionsPage => ({ actions, total: actions.length, page: 1, limit: 20 });
const renderStaff = () => render(<ActionsTaken ticketId={10} ticketStatus="Open" canEdit staffMembers={staffMembers} />);

describe('Lab 4: Zen Green style and keyboard behaviour (Issue #34)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('STY-01: the follow-up badge says "Follow-up needed" in words, not only in colour', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([action({ followUpRequired: true, followUpNote: 'Check on Friday' })]));
    renderStaff();
    expect(await screen.findByText(/Follow-up needed/)).toBeInTheDocument();
    expect(screen.getByText('Check on Friday')).toBeInTheDocument();
  });

  it('STY-02: validation and conflict messages are alerts with words, and the status is text', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([action()]));
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/correct the highlighted fields/i);
    expect(screen.getByText('Describe what was done.')).toBeInTheDocument(); // the cue is in the message, not only a red border
    expect(screen.getByText('Completed', { selector: '.badge, .badge *' })).toBeInTheDocument();
  });

  it('STY-03: editable fields differ from read-only text, and Performed by is never a field', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([action()]));
    renderStaff();
    expect(await screen.findByText(/Performed by Sarah Connor/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Action description/)).not.toBeInTheDocument(); // read-only text until Edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const field = screen.getByLabelText('Action description');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).not.toHaveAttribute('readonly');
    expect(screen.queryByLabelText(/Performed by/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Performed by is set automatically|Performed by Sarah Connor/)).toBeInTheDocument();
  });

  it('A11Y-02: Escape closes the editor and focus returns to the button that opened it', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([action()]));
    renderStaff();
    const opener = await screen.findByRole('button', { name: '+ Add Action' });
    opener.focus();
    fireEvent.click(opener);
    const field = screen.getByLabelText('Action description');
    field.focus();
    fireEvent.keyDown(field, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('A11Y-02: Escape with unsaved text asks first and keeps the editor when declined', async () => {
    vi.spyOn(api, 'fetchActionsTaken').mockResolvedValue(page([action()]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Action' }));
    const field = screen.getByLabelText('Action description');
    fireEvent.change(field, { target: { value: 'half typed' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Action description')).toHaveValue('half typed');
  });
});
