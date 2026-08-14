import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';

describe('App Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the TokTickIT heading', () => {
    render(<App />);
    expect(screen.getByText('TokTickIT IT Service Desk')).toBeInTheDocument();
  });

  it('shows online status when API is reachable', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
    });

    render(<App />);
    
    // Click button
    const checkBtn = screen.getByRole('button', { name: /\[ Check System \]/i });
    fireEvent.click(checkBtn);

    // Should show loading initially
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // Wait for resolution
    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });
  });

  it('shows useful error message when API fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<App />);
    
    // Click button
    const checkBtn = screen.getByRole('button', { name: /\[ Check System \]/i });
    fireEvent.click(checkBtn);

    // Wait for error resolution
    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});
