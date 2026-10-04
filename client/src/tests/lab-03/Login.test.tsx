import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../components/Login';
import * as api from '../../api';

describe('UI-01: Login Component Tests', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all login form elements (email, password, sign-in button)', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('should show error when submitting empty fields', async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Please enter both email and password/i);
    });
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('should invoke onLoginSuccess when credentials are valid', async () => {
    const mockUser: api.UserProfile = {
      id: 1,
      email: 'david.lee@example.com',
      name: 'David Lee',
      role: 'REQUESTER',
      mustChangePassword: false,
    };

    vi.spyOn(api, 'login').mockResolvedValueOnce({
      token: 'mock-jwt-token',
      user: mockUser,
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'david.lee@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('should display error alert when authentication fails', async () => {
    vi.spyOn(api, 'login').mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email or password/i);
    });
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });
});
