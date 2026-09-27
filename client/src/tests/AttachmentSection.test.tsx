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

describe('UI-03: AttachmentSection UI', () => {
    it('should show file in attachment list when a valid file is selected', async () => {
        render(<App />);

        // Wait for authenticated app to load
        await screen.findByText(/Create New Support Ticket/i);

        // Simulate file attachment
        const fileInput = screen.getByLabelText(/Attachments/i);
        const file = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Verify file appears in list
        await waitFor(() => {
            expect(screen.getByText(/test-image.png/i)).toBeInTheDocument();
        });
    });
});
