import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicComments } from '../../components/PublicComments';
import * as api from '../../api';

const comment = (id: number, content: string): api.CommentItem => ({
  id,
  ticketId: 10,
  content,
  createdAt: new Date().toISOString(),
  author: { id: 5, name: 'Sarah Connor', role: 'IT_STAFF' },
} as api.CommentItem);

describe('UI-07: Requester Public Comments', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders existing comments with author and role, and an empty state', async () => {
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValueOnce([comment(1, 'Please restart the router.')]);
    const { unmount } = render(<PublicComments ticketId={10} />);
    expect(await screen.findByText('Please restart the router.')).toBeInTheDocument();
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('IT Staff')).toBeInTheDocument();
    unmount();

    vi.spyOn(api, 'fetchPublicComments').mockResolvedValueOnce([]);
    render(<PublicComments ticketId={10} />);
    expect(await screen.findByText(/No comments yet/i)).toBeInTheDocument();
  });

  it('renders comment content as plain text, not HTML', async () => {
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValueOnce([comment(1, '<b>bold</b><img src=x onerror=alert(1)>')]);
    const { container } = render(<PublicComments ticketId={10} />);
    expect(await screen.findByText('<b>bold</b><img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('posts a new comment and appends it to the thread', async () => {
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValueOnce([]);
    const post = vi.spyOn(api, 'postPublicComment').mockResolvedValueOnce(comment(2, 'Still broken after restart.'));
    render(<PublicComments ticketId={10} />);
    await screen.findByText(/No comments yet/i);

    fireEvent.change(screen.getByLabelText(/Add a comment/i), { target: { value: 'Still broken after restart.' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Comment/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith(10, 'Still broken after restart.'));
    expect(await screen.findByText('Still broken after restart.')).toBeInTheDocument();
    expect(screen.getByText(/Comment posted/i)).toBeInTheDocument();
  });

  it('shows a safe error message when posting fails', async () => {
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValueOnce([]);
    vi.spyOn(api, 'postPublicComment').mockRejectedValueOnce(new Error('Comment cannot exceed 2000 characters'));
    render(<PublicComments ticketId={10} />);
    await screen.findByText(/No comments yet/i);

    fireEvent.change(screen.getByLabelText(/Add a comment/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Comment/i }));

    expect(await screen.findByText(/cannot exceed 2000 characters/i)).toBeInTheDocument();
  });

  it('disables posting for an empty comment and hides the form when posting is not allowed', async () => {
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([]);
    const { unmount } = render(<PublicComments ticketId={10} />);
    await screen.findByText(/No comments yet/i);
    fireEvent.change(screen.getByLabelText(/Add a comment/i), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Post Comment/i })).toBeDisabled();
    unmount();

    render(<PublicComments ticketId={10} canPost={false} />);
    await screen.findByText(/No comments yet/i);
    expect(screen.queryByLabelText(/Add a comment/i)).not.toBeInTheDocument();
  });
});
