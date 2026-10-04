import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../api';

// Mock getAuthToken to simulate an existing authenticated session
vi.spyOn(api, 'getAuthToken').mockReturnValue('mock-jwt-token');

// Mock fetch to simulate API responses
global.fetch = vi.fn(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ id: 1, name: 'Test User', email: 'test@user.com', role: 'REQUESTER', mustChangePassword: false }) };
    }
    if (urlStr.includes('/api/categories')) {
        return { json: async () => [{ id: 1, name: 'Hardware' }] };
    }
    if (urlStr.includes('/api/related-systems')) {
        return { json: async () => [{ id: 1, name: 'Laptop' }] };
    }
    if (urlStr.includes('/api/tickets')) {
        return { ok: true, json: async () => ({ data: [], meta: { totalItems: 0, totalPages: 1 } }) };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-01: CreateTicket UI', () => {
    it('should show validation message when submitting without a summary', async () => {
        render(<App />);

        // Wait for authenticated app to load (Create Ticket tab)
        await screen.findByText(/Create New Support Ticket/i);

        // Submit without filling in required fields
        const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
        fireEvent.click(submitBtn);

        // Expect validation messages
        await waitFor(() => {
            expect(screen.getByText(/Summary is required/i)).toBeInTheDocument();
            expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
        });
    });
});
