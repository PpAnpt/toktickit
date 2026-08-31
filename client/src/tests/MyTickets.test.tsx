import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch สำหรับแท็บ My Tickets
global.fetch = vi.fn(async (url) => {
    if (url.toString().includes('/api/requesters')) {
        return { json: async () => [{ id: 1, name: 'Test User', email: 'test@user.com' }] };
    }
    if (url.toString().includes('/api/tickets')) {
        // จำลองว่าเรียก API แล้วไม่พบตั๋วเลย (0 tickets)
        return { ok: true, json: async () => ({ data: [], meta: { totalItems: 0, totalPages: 1 } }) };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-02: MyTickets Empty State', () => {
    it('should display empty state graphic and text when there are 0 tickets', async () => {
        render(<App />);

        // 1. เข้าสู่ระบบ
        const select = await screen.findByLabelText(/Simulate Login As/i);
        fireEvent.change(select, { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));

        // 2. กดไปที่แท็บ My Tickets
        const myTicketsTab = await screen.findByRole('button', { name: /My Tickets/i });
        fireEvent.click(myTicketsTab);

        // 3. ตรวจสอบว่ามีข้อความ No tickets found โผล่ขึ้นมาแทนที่จะเป็นตารางเปล่าๆ
        await waitFor(() => {
            expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
            expect(screen.getByText(/You haven't submitted any support requests/i)).toBeInTheDocument();
        });
    });
});
