import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

global.fetch = vi.fn(async (url) => {
    if (url.toString().includes('/api/requesters')) {
        return { json: async () => [{ id: 1, name: 'Test User', email: 'test@user.com' }] };
    }
    if (url.toString().includes('/api/categories')) {
        return { json: async () => [{ id: 1, name: 'Hardware' }] };
    }
    if (url.toString().includes('/api/related-systems')) {
        return { json: async () => [{ id: 1, name: 'Laptop' }] };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-03: AttachmentSection UI', () => {
    it('should show file in attachment list when a valid file is selected', async () => {
        render(<App />);

        // 1. เข้าสู่ระบบ
        const select = await screen.findByLabelText(/Simulate Login As/i);
        fireEvent.change(select, { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));

        // 2. รอให้อยู่หน้า Create Ticket
        await screen.findByText(/Create New Support Ticket/i);

        // 3. จำลองการแนบไฟล์
        const fileInput = screen.getByLabelText(/Attachments/i);
        const file = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        // 4. ตรวจสอบว่าชื่อไฟล์ไปปรากฏใน List ด้านล่าง
        await waitFor(() => {
            expect(screen.getByText(/test-image.png/i)).toBeInTheDocument();
        });
    });
});
