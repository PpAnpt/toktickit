import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../api';

// Mock getAuthToken to simulate an existing authenticated session
vi.spyOn(api, 'getAuthToken').mockReturnValue('mock-jwt-token');

global.fetch = vi.fn(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ id: 1, name: 'Test User', email: 'test@user.com', role: 'REQUESTER', mustChangePassword: false }) };
    }
    if (urlStr.includes('/api/tickets')) {
        // Simulate 0 tickets (empty state)
        return { ok: true, json: async () => ({ data: [], meta: { totalItems: 0, totalPages: 1 } }) };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-02: MyTickets Empty State', () => {
    it('should display empty state graphic and text when there are 0 tickets', async () => {
        render(<App />);

        // Wait for authenticated app to load
        await screen.findByText(/Create New Support Ticket/i);

        // Navigate to My Tickets tab
        const myTicketsTab = await screen.findByRole('button', { name: /My Tickets/i });
        fireEvent.click(myTicketsTab);

        // Verify empty state is shown
        await waitFor(() => {
            expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
            expect(screen.getByText(/You haven't submitted any support requests/i)).toBeInTheDocument();
        });
    });
});
