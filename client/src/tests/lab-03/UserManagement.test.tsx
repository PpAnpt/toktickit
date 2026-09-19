import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from '../../components/UserManagement';
import * as api from '../../api';

describe('UI-05 (AC-17, AC-18, AC-19, AC-20, AC-22): User Management Component Tests', () => {
  const mockAdminUser: api.UserProfile = {
    id: 10,
    name: 'Admin System',
    email: 'admin@example.com',
    role: 'ADMINISTRATOR',
    mustChangePassword: false,
  };

  const mockUsers: api.AdminUser[] = [
    {
      id: 1,
      name: 'David Lee',
      email: 'david.lee@example.com',
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 5,
      name: 'Sarah Connor',
      email: 'sarah.connor@example.com',
      role: 'IT_STAFF',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 10,
      name: 'Admin System',
      email: 'admin@example.com',
      role: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'fetchAdminUsers').mockResolvedValue(mockUsers);
    vi.spyOn(api, 'createAdminUser').mockResolvedValue({
      id: 11,
      name: 'New Employee',
      email: 'new.emp@example.com',
      role: 'IT_STAFF',
      isActive: true,
      mustChangePassword: true,
      createdAt: '2026-09-19T00:00:00.000Z',
      updatedAt: '2026-09-19T00:00:00.000Z',
    });
    vi.spyOn(api, 'updateAdminUser').mockResolvedValue({
      ...mockUsers[0],
      name: 'David Lee Updated',
    });
    vi.spyOn(api, 'resetAdminUserPassword').mockResolvedValue({
      message: 'Initial password set. User must change password at next login.',
    });
  });

  it('renders user management table with user records, role badges, and status badges', async () => {
    render(<UserManagement currentUser={mockAdminUser} />);

    expect(screen.getByText('User Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('David Lee')).toBeInTheDocument();
      expect(screen.getByText('david.lee@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('sarah.connor@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    });
  });

  it('filters users by search query and role filter dropdown', async () => {
    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText('David Lee')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search user by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Sarah' })
      );
    });

    const roleSelect = screen.getByLabelText(/Filter Role/i);
    fireEvent.change(roleSelect, { target: { value: 'IT_STAFF' } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'IT_STAFF' })
      );
    });
  });

  it('opens Create User modal, fills form, and creates new account', async () => {
    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText('+ Create New User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Create New User'));

    expect(screen.getByRole('heading', { name: /Create New User/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e.g., Alex Mercer/i), {
      target: { value: 'New Employee' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g., alex.mercer@example.com/i), {
      target: { value: 'new.emp@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 6 characters/i), {
      target: { value: 'TempPass123!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: 'New Employee',
        email: 'new.emp@example.com',
        role: 'REQUESTER',
        initialPassword: 'TempPass123!',
      });
    });
  });

  it('disables active status switch when editing self to enforce BR-19', async () => {
    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    // Find the row with admin@example.com
    const adminRow = screen.getByText('admin@example.com').closest('tr');
    expect(adminRow).toBeInTheDocument();

    const editBtn = adminRow!.querySelector('button')!;
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit User Account/i })).toBeInTheDocument();
    });

    // The switch input should be disabled because editingUser.id === currentUser.id
    const activeSwitch = screen.getByLabelText(/Active Account/i);
    expect(activeSwitch).toBeDisabled();
    expect(screen.getByText(/Administrators cannot deactivate their own account/i)).toBeInTheDocument();
  });

  it('opens Reset Password modal and submits temporary password (AC-22, BR-21)', async () => {
    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText('david.lee@example.com')).toBeInTheDocument();
    });

    const davidRow = screen.getByText('david.lee@example.com').closest('tr');
    const resetButtons = davidRow!.querySelectorAll('button');
    // The second button is Reset Pass
    fireEvent.click(resetButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Reset User Password/i })).toBeInTheDocument();
    });

    const passInput = screen.getByPlaceholderText(/At least 6 characters/i);
    fireEvent.change(passInput, { target: { value: 'NewTempPassword123!' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Reset Password/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(1, 'NewTempPassword123!');
    });
  });
});
