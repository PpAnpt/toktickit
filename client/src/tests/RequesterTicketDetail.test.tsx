import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch สำหรับ Ticket Detail
global.fetch = vi.fn(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/requesters')) {
        return { json: async () => [{ id: 1, name: 'David Lee', email: 'david.lee@example.com' }] };
    }
    if (urlStr.includes('/api/categories')) {
        return { json: async () => [{ id: 1, name: 'Hardware' }] };
    }
    if (urlStr.includes('/api/related-systems')) {
        return { json: async () => [{ id: 1, name: 'Laptop' }] };
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

        // 1. เข้าสู่ระบบ
        const select = await screen.findByLabelText(/Simulate Login As/i);
        fireEvent.change(select, { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));

        // 2. ไปที่แท็บ My Tickets
        const myTicketsTab = await screen.findByRole('button', { name: /My Tickets/i });
        fireEvent.click(myTicketsTab);

        // 3. คลิกเปิดการ์ดตั๋ว
        const ticketCard = await screen.findByText(/Screen display flickering issue/i);
        fireEvent.click(ticketCard);

        // 4. ตรวจสอบว่าหน้า Detail แสดงข้อมูลถูกต้อง
        await waitFor(() => {
            expect(screen.getByText('TKT-2026-000010')).toBeInTheDocument();
            expect(screen.getByText('Ticket Details')).toBeInTheDocument();
            expect(screen.getByText(/External monitor flickers every 10 minutes/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Back to My Tickets/i })).toBeInTheDocument();
        });
    });
});
