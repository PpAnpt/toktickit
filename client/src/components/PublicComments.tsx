import React, { useCallback, useEffect, useState } from 'react';
import { fetchPublicComments, postPublicComment, type CommentItem } from '../api';
import { RoleBadge } from './RoleBadge';

const MAX_LENGTH = 2000;


interface PublicCommentsProps {
  ticketId: number;
  canPost?: boolean;
}

/**
 * Append-only Public Comments thread for a ticket. Content is rendered as plain text
 * (React escapes it), so comments cannot inject markup.
 */
export const PublicComments: React.FC<PublicCommentsProps> = ({ ticketId, canPost = true }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setComments(await fetchPublicComments(ticketId));
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load comments.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    setPostSuccess(false);
    if (!text.trim()) {
      setPostError('Comment cannot be empty.');
      return;
    }
    setIsPosting(true);
    try {
      const created = await postPublicComment(ticketId, text);
      setComments(prev => [...prev, created]);
      setText('');
      setPostSuccess(true);
    } catch (err: any) {
      setPostError(err.message || 'Failed to post comment.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section className="border-top pt-4 mt-4" aria-labelledby={`comments-heading-${ticketId}`}>
      <h6 id={`comments-heading-${ticketId}`} className="fw-bold mb-2" style={{ color: '#006B3C' }}>
        💬 Public Comments ({comments.length})
      </h6>
      <p className="small text-muted mb-3">Visible to you and the IT support team.</p>

      {isLoading ? (
        <div className="text-center py-3" role="status">
          <div className="spinner-border spinner-border-sm text-success"></div>
          <span className="ms-2 small text-muted">Loading comments...</span>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger py-2 small" role="alert">
          {loadError}{' '}
          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={load}>Retry</button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center text-muted small py-3">No comments yet.</div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className="card border bg-light">
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-1">
                  <span className="fw-semibold text-dark">
                    {c.author.name}
                    <RoleBadge role={c.author.role} className="ms-2" />
                  </span>
                  <span className="text-muted small">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-dark" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canPost && (
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor={`comment-input-${ticketId}`} className="form-label fw-semibold small">Add a comment</label>
          <textarea
            id={`comment-input-${ticketId}`}
            className={`form-control ${postError ? 'is-invalid' : ''}`}
            rows={3}
            maxLength={MAX_LENGTH}
            placeholder="Reply to the IT support team..."
            value={text}
            onChange={e => {
              setText(e.target.value);
              setPostSuccess(false);
            }}
            aria-describedby={`comment-help-${ticketId}`}
          />
          {postError && <div className="invalid-feedback d-block">{postError}</div>}
          <div className="d-flex justify-content-between align-items-center mt-2 gap-2 flex-wrap">
            <span id={`comment-help-${ticketId}`} className="small text-muted">{text.length} / {MAX_LENGTH} characters</span>
            <button
              type="submit"
              className="btn btn-sm text-white px-4"
              style={{ backgroundColor: '#006B3C' }}
              disabled={isPosting || !text.trim()}
            >
              {isPosting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
          {postSuccess && <div className="small text-success mt-2" role="status">Comment posted.</div>}
        </form>
      )}
    </section>
  );
};
