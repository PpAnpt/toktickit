import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../api';

// Mock getAuthToken to simulate an existing authenticated session
vi.spyOn(api, 'getAuthToken').mockReturnValue('mock-jwt-token');
localStorage.setItem(api.TOKEN_KEY, 'mock-jwt-token');

// Mock fetch for Ticket Detail
global.fetch = vi.fn(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ id: 1, name: 'David Lee', email: 'david.lee@example.com', role: 'REQUESTER', mustChangePassword: false }) };
    }
    if (urlStr.includes('/api/categories')) {
        return { json: async () => [{ id: 1, name: 'Hardware' }] };
    }
    if (urlStr.includes('/api/related-systems')) {
        return { json: async () => [{ id: 1, name: 'Laptop' }] };
    }
    if (urlStr.match(/\/api\/tickets\/\d+\/comments/)) {
        return {
            ok: true,
            json: async () => ([{
                id: 1,
                ticketId: 10,
                content: 'Could you try another HDMI cable?',
                createdAt: new Date().toISOString(),
                author: { id: 5, name: 'Sarah Connor', role: 'IT_STAFF' }
            }])
        };
    }
    if (urlStr.match(/\/api\/tickets\/\d+/)) {
        return {
            ok: true,
            json: async () => ({
                id: 10,
                ticketNumber: 'TKT-2026-000010',
                summary: 'Screen display flickering issue',
                description: 'External monitor flickers every 10 minutes.',
                status: 'New',
                requestedPriority: 'HIGH',
                createdAt: new Date().toISOString(),
                category: { id: 1, name: 'Hardware' },
                relatedSystem: { id: 1, name: 'Laptop' },
                attachments: []
            })
        };
    }
    if (urlStr.includes('/api/tickets')) {
        return {
            ok: true,
            json: async () => ({
                data: [{
                    id: 10,
                    ticketNumber: 'TKT-2026-000010',
                    summary: 'Screen display flickering issue',
                    description: 'External monitor flickers every 10 minutes.',
                    status: 'New',
                    requestedPriority: 'HIGH',
                    createdAt: new Date().toISOString(),
                    category: { id: 1, name: 'Hardware' },
                    relatedSystem: { id: 1, name: 'Laptop' },
                    attachments: []
                }],
                meta: { totalItems: 1, totalPages: 1 }
            })
        };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-04: RequesterTicketDetail View', () => {
    it('should display ticket details, metadata, and back button when ticket is selected', async () => {
        render(<App />);

        // Wait for authenticated app to load
        await screen.findByText(/Create New Support Ticket/i);

        // Navigate to My Tickets tab
        const myTicketsTab = await screen.findByRole('button', { name: /My Tickets/i });
        fireEvent.click(myTicketsTab);

        // Click on a ticket card
        const ticketCard = await screen.findByText(/Screen display flickering issue/i);
        fireEvent.click(ticketCard);

        // Verify ticket detail is shown
        await waitFor(() => {
            expect(screen.getByText('TKT-2026-000010')).toBeInTheDocument();
            expect(screen.getByText('Ticket Details')).toBeInTheDocument();
            expect(screen.getByText(/External monitor flickers every 10 minutes/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Back to My Tickets/i })).toBeInTheDocument();
        });

        // Public Comments are shown to the Requester; Internal Notes never are
        expect(await screen.findByText(/Could you try another HDMI cable/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Add a comment/i)).toBeInTheDocument();
        expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();

        // Requester can indicate the problem appears resolved (not formally resolve it)
        expect(screen.getByRole('button', { name: /My Problem Appears Resolved/i })).toBeInTheDocument();

        // Requests use the bearer token, never the removed X-Requester-Id header
        const calls = (global.fetch as any).mock.calls as [string, RequestInit | undefined][];
        for (const [, init] of calls) {
            const headers = new Headers(init?.headers);
            expect(headers.has('X-Requester-Id')).toBe(false);
        }
        const ticketCall = calls.find(([u]) => /\/api\/tickets\/10$/.test(String(u)));
        expect(new Headers(ticketCall?.[1]?.headers).get('Authorization')).toBe('Bearer mock-jwt-token');
    });
});
