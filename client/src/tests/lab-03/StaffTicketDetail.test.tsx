import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StaffTicketDetail } from '../../components/StaffTicketDetail';
import * as api from '../../api';

describe('UI-04 (AC-09, AC-10, AC-11, AC-12, AC-13, AC-14): Staff Ticket Detail Component Tests', () => {
  const mockCurrentUser: api.UserProfile = {
    id: 5,
    email: 'sarah.connor@example.com',
    name: 'Sarah Connor',
    role: 'IT_STAFF',
    mustChangePassword: false,
  };

  const mockStaffMembers: api.StaffMember[] = [
    { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
    { id: 6, name: 'James Gordon', email: 'james.gordon@example.com', role: 'IT_STAFF' },
  ];

  const mockTicket: api.StaffTicketDetail = {
    id: 1,
    ticketNumber: 'TKT-2026-000001',
    summary: 'Laptop display flickering issue',
    description: 'External monitor flickers every 10 minutes when plugged in via HDMI.',
    status: 'Open',
    requestedPriority: 'HIGH',
    itPriority: 'MEDIUM',
    indicatedResolvedAt: null,
    createdAt: '2026-09-12T10:30:00.000Z',
    updatedAt: '2026-09-13T08:00:00.000Z',
    requester: {
      id: 1,
      name: 'David Lee',
      email: 'david.lee@example.com',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      contactPhone: '081-234-5678',
    },
    owner: null,
    category: { id: 1, name: 'Hardware' },
    relatedSystem: { id: 1, name: 'Laptop' },
    attachments: [
      {
        id: 101,
        originalFileName: 'monitor-glitch.png',
        storedFileName: '101-monitor.png',
        size: 204800,
        mimeType: 'image/png',
        isRemoved: false,
        createdAt: '2026-09-12T10:35:00.000Z',
      },
    ],
    comments: [
      {
        id: 1,
        content: 'I have tested with a different cable but the issue persists.',
        isInternal: false,
        createdAt: '2026-09-12T11:00:00.000Z',
        author: { id: 1, name: 'David Lee', email: 'david.lee@example.com', role: 'REQUESTER' },
      },
    ],
    internalNotes: [
      {
        id: 2,
        content: 'Possible GPU driver bug reported in Dell latitude batches.',
        isInternal: true,
        createdAt: '2026-09-12T11:30:00.000Z',
        author: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'fetchStaffMembers').mockResolvedValue(mockStaffMembers);
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue(mockTicket);
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue(mockTicket.comments);
    vi.spyOn(api, 'fetchInternalNotes').mockResolvedValue(mockTicket.internalNotes);
    vi.spyOn(api, 'updateTicketOwner').mockResolvedValue({
      ...mockTicket,
      owner: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com' },
      status: 'Open',
    });
    vi.spyOn(api, 'updateTicketPriority').mockResolvedValue({
      ...mockTicket,
      itPriority: 'URGENT',
    });
    vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({
      ...mockTicket,
      status: 'In Progress',
    });
    vi.spyOn(api, 'postPublicComment').mockResolvedValue({
      id: 3,
      content: 'We will check the HDMI port tomorrow.',
      isInternal: false,
      createdAt: '2026-09-12T12:00:00.000Z',
      author: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
    });
    vi.spyOn(api, 'postInternalNote').mockResolvedValue({
      id: 4,
      content: 'Ordered spare cable.',
      isInternal: true,
      createdAt: '2026-09-12T12:10:00.000Z',
      author: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'IT_STAFF' },
    });
  });

  it('renders ticket details, metadata, attachments, and allowed transitions', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    expect(screen.getAllByText(/Loading ticket details/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(screen.getByText('Laptop display flickering issue')).toBeInTheDocument();
      expect(screen.getByText(/External monitor flickers every 10 minutes/i)).toBeInTheDocument();
      expect(screen.getAllByText('David Lee').length).toBeGreaterThan(0);
      expect(screen.getByText('monitor-glitch.png')).toBeInTheDocument();
    });

    // Allowed transitions from 'Open' are 'In Progress' and 'Waiting for Requester'
    expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move to Waiting for Requester/i })).toBeInTheDocument();
  });

  it('allows IT staff to claim ticket ownership', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Claim Ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Claim Ticket/i }));

    await waitFor(() => {
      expect(api.updateTicketOwner).toHaveBeenCalledWith(1, 5);
    });
  });

  it('allows IT staff to change IT priority', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Operational IT Priority/i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/Operational IT Priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'URGENT' } });

    const savePriorityBtn = screen.getByRole('button', { name: /Save IT Priority/i });
    fireEvent.click(savePriorityBtn);

    await waitFor(() => {
      expect(api.updateTicketPriority).toHaveBeenCalledWith(1, 'URGENT');
    });
  });

  it('allows IT staff to transition ticket status', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Move to In Progress/i }));

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(1, 'In Progress');
    });
  });

  it('displays public comments and allows submitting a new comment', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/I have tested with a different cable/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Write a public response to the requester/i);
    fireEvent.change(textarea, { target: { value: 'We will check the HDMI port tomorrow.' } });

    const postBtn = screen.getByRole('button', { name: /Post Comment/i });
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(api.postPublicComment).toHaveBeenCalledWith(1, 'We will check the HDMI port tomorrow.');
    });
  });

  it('switches to Internal Notes tab and allows adding a confidential note', async () => {
    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Internal Notes/i })).toBeInTheDocument();
    });

    const internalNotesTab = screen.getByRole('tab', { name: /Internal Notes/i });
    fireEvent.click(internalNotesTab);

    await waitFor(() => {
      expect(screen.getByText(/Possible GPU driver bug reported/i)).toBeInTheDocument();
    });

    const noteTextarea = screen.getByPlaceholderText(/Record internal troubleshooting steps/i);
    fireEvent.change(noteTextarea, { target: { value: 'Ordered spare cable.' } });

    const addNoteBtn = screen.getByRole('button', { name: /Add Internal Note/i });
    fireEvent.click(addNoteBtn);

    await waitFor(() => {
      expect(api.postInternalNote).toHaveBeenCalledWith(1, 'Ordered spare cable.');
    });
  });

  it('displays Indicated Resolved alert banner when indicatedResolvedAt is set', async () => {
    const resolvedTicket = {
      ...mockTicket,
      indicatedResolvedAt: '2026-09-13T09:00:00.000Z',
    };
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue(resolvedTicket);

    render(<StaffTicketDetail ticketId={1} currentUser={mockCurrentUser} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/The requester indicated that this problem appears resolved/i)).toBeInTheDocument();
    });
  });
});
