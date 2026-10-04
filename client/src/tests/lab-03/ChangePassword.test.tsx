import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePassword from '../../components/ChangePassword';
import * as api from '../../api';

describe('UI-02: ChangePassword Component Tests', () => {
  const mockOnPasswordChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all password update fields', () => {
    render(<ChangePassword onPasswordChanged={mockOnPasswordChanged} userEmail="emily.watson@example.com" />);

    expect(screen.getByLabelText(/Current Initial Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save New Password/i })).toBeInTheDocument();
  });

  it('should show error if passwords do not match', async () => {
    render(<ChangePassword onPasswordChanged={mockOnPasswordChanged} />);

    fireEvent.change(screen.getByLabelText(/Current Initial Password/i), {
      target: { value: 'Initial123!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'MismatchPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/New password and confirmation do not match/i);
    });
    expect(mockOnPasswordChanged).not.toHaveBeenCalled();
  });

  it('should show error if new password is shorter than 8 characters', async () => {
    render(<ChangePassword onPasswordChanged={mockOnPasswordChanged} />);

    fireEvent.change(screen.getByLabelText(/Current Initial Password/i), {
      target: { value: 'Initial123!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    });
    expect(mockOnPasswordChanged).not.toHaveBeenCalled();
  });

  it('should invoke onPasswordChanged when new password is valid', async () => {
    vi.spyOn(api, 'changePassword').mockResolvedValueOnce({
      message: 'Password changed successfully',
      mustChangePassword: false,
    });

    render(<ChangePassword onPasswordChanged={mockOnPasswordChanged} />);

    fireEvent.change(screen.getByLabelText(/Current Initial Password/i), {
      target: { value: 'Initial123!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'BrandNewPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(mockOnPasswordChanged).toHaveBeenCalled();
    });
  });
});
