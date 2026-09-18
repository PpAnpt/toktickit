import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StaffTicketQueue } from '../../components/StaffTicketQueue';
import * as api from '../../api';

describe('UI-03 (AC-08, AC-14): Staff Ticket Queue Component Tests', () => {
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

  const mockTickets: api.StaffTicket[] = [
    {
      id: 1,
      ticketNumber: 'TKT-2026-000001',
      summary: 'Laptop display flickering issue',
      status: 'In Progress',
      requestedPriority: 'HIGH',
      itPriority: 'URGENT',
      requester: { id: 1, name: 'David Lee', email: 'david.lee@example.com' },
      owner: { id: 5, name: 'Sarah Connor', email: 'sarah.connor@example.com' },
      category: { id: 1, name: 'Hardware' },
      createdAt: '2026-09-12T10:30:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
    },
    {
      id: 2,
      ticketNumber: 'TKT-2026-000002',
      summary: 'Cannot connect to Campus Wi-Fi',
      status: 'New',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      requester: { id: 2, name: 'Jennifer Anderson', email: 'jennifer@example.com' },
      owner: null,
      category: { id: 2, name: 'Network' },
      createdAt: '2026-09-13T09:15:00.000Z',
      updatedAt: '2026-09-13T09:15:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'fetchStaffMembers').mockResolvedValue(mockStaffMembers);
    vi.spyOn(api, 'fetchStaffTickets').mockResolvedValue({
      tickets: mockTickets,
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });

  it('should render the queue title, stats bar, and ticket list with badges', async () => {
    render(<StaffTicketQueue currentUser={mockCurrentUser} />);

    expect(screen.getByText(/IT Staff Ticket Queue/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(screen.getByText('Laptop display flickering issue')).toBeInTheDocument();
      expect(screen.getByText('David Lee')).toBeInTheDocument();
      expect(screen.getAllByText('URGENT').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Sarah Connor/i).length).toBeGreaterThan(0);

      expect(screen.getByText('TKT-2026-000002')).toBeInTheDocument();
      expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    });
  });

  it('should filter tickets when search keyword is typed', async () => {
    render(<StaffTicketQueue currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search ticket #, summary, requester/i);
    fireEvent.change(searchInput, { target: { value: 'Wi-Fi' } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Wi-Fi',
        })
      );
    });
  });

  it('should filter tickets when status or priority dropdown changes', async () => {
    render(<StaffTicketQueue currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Status/i);
    fireEvent.change(statusSelect, { target: { value: 'New' } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'New',
        })
      );
    });

    const prioritySelect = screen.getByLabelText(/Priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'URGENT' } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'URGENT',
        })
      );
    });
  });

  it('should display empty state when no tickets are returned', async () => {
    vi.spyOn(api, 'fetchStaffTickets').mockResolvedValueOnce({
      tickets: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });

    render(<StaffTicketQueue currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
    });
  });

  it('should call onSelectTicket when clicking View button or row', async () => {
    const mockSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockCurrentUser} onSelectTicket={mockSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    expect(mockSelectTicket).toHaveBeenCalledWith(1);
  });
});
