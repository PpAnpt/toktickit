import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchStaffTicketDetail,
  updateTicketOwner,
  updateTicketPriority,
  updateTicketStatus,
  fetchPublicComments,
  postPublicComment,
  fetchInternalNotes,
  postInternalNote,
  fetchStaffMembers,
  type StaffTicketDetail as StaffTicketDetailType,
  type StaffMember,
  type CommentItem,
  type NoteItem,
  type UserProfile
} from '../api';

interface StaffTicketDetailProps {
  ticketId: number;
  currentUser: UserProfile;
  onBack: () => void;
  onTicketUpdated?: () => void;
}

const validTransitions: Record<string, string[]> = {
  'New': ['Open', 'Cancelled'],
  'Open': ['In Progress', 'Waiting for Requester', 'Resolved', 'Cancelled'],
  'In Progress': ['Waiting for Requester', 'Resolved', 'Cancelled'],
  'InProgress': ['Waiting for Requester', 'Resolved', 'Cancelled'],
  'Waiting for Requester': ['In Progress', 'Resolved', 'Cancelled'],
  'WaitingForRequester': ['In Progress', 'Resolved', 'Cancelled'],
  'Resolved': ['Closed', 'Reopened'],
  'Reopened': ['In Progress', 'Resolved', 'Cancelled'],
  'Closed': [],
  'Cancelled': []
};

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  currentUser,
  onBack,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [internalNotes, setInternalNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Form states
  const [activeDiscussionTab, setActiveDiscussionTab] = useState<'comments' | 'notes'>('comments');
  const [newCommentText, setNewCommentText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Operations states
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('MEDIUM');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingOwner, setIsUpdatingOwner] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  const loadTicketData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [ticketData, membersData, commentsData, notesData] = await Promise.all([
        fetchStaffTicketDetail(ticketId),
        fetchStaffMembers().catch(() => []),
        fetchPublicComments(ticketId).catch(() => []),
        fetchInternalNotes(ticketId).catch(() => []),
      ]);
      setTicket(ticketData);
      setStaffMembers(membersData);
      setComments(commentsData.length > 0 ? commentsData : (ticketData.comments || []));
      setInternalNotes(notesData.length > 0 ? notesData : (ticketData.internalNotes || []));
      setSelectedOwnerId(ticketData.owner ? String(ticketData.owner.id) : '');
      setSelectedPriority(ticketData.itPriority || ticketData.requestedPriority || 'MEDIUM');
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Handle Claim Ticket (quick assign to current user)
  const handleClaimTicket = async () => {
    setIsUpdatingOwner(true);
    setError('');
    setActionSuccess('');
    try {
      const updated = await updateTicketOwner(ticketId, currentUser.id);
      setTicket(updated);
      setSelectedOwnerId(String(currentUser.id));
      setActionSuccess('Ticket successfully claimed!');
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to claim ticket');
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Handle Assign Owner
  const handleAssignOwner = async () => {
    setIsUpdatingOwner(true);
    setError('');
    setActionSuccess('');
    try {
      const targetId = selectedOwnerId ? Number(selectedOwnerId) : null;
      const updated = await updateTicketOwner(ticketId, targetId);
      setTicket(updated);
      setActionSuccess('Ticket ownership updated successfully!');
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update owner');
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Handle Update IT Priority
  const handleUpdatePriority = async () => {
    setIsUpdatingPriority(true);
    setError('');
    setActionSuccess('');
    try {
      const updated = await updateTicketPriority(ticketId, selectedPriority);
      setTicket(updated);
      setActionSuccess('IT Priority updated successfully!');
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update IT Priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Handle Status Transition
  const handleTransitionStatus = async (nextStatus: string) => {
    setIsUpdatingStatus(true);
    setError('');
    setActionSuccess('');
    try {
      const updated = await updateTicketStatus(ticketId, nextStatus);
      setTicket(updated);
      setActionSuccess(`Status transitioned to '${nextStatus}' successfully!`);
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to transition status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Post Public Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);
    setError('');
    try {
      const newComment = await postPublicComment(ticketId, newCommentText);
      setComments((prev) => [...prev, newComment]);
      setNewCommentText('');
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle Post Internal Note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    setError('');
    try {
      const newNote = await postInternalNote(ticketId, newNoteText);
      setInternalNotes((prev) => [...prev, newNote]);
      setNewNoteText('');
    } catch (err: any) {
      setError(err.message || 'Failed to post internal note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Status Badge Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="badge bg-primary">New</span>;
      case 'Open':
        return <span className="badge bg-info text-dark">Open</span>;
      case 'In Progress':
      case 'InProgress':
        return <span className="badge bg-warning text-dark">In Progress</span>;
      case 'Waiting for Requester':
      case 'WaitingForRequester':
        return <span className="badge bg-secondary">Waiting</span>;
      case 'Resolved':
        return <span className="badge bg-success">Resolved</span>;
      case 'Closed':
        return <span className="badge bg-dark">Closed</span>;
      case 'Reopened':
        return <span className="badge bg-danger">Reopened</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  // Priority Badge Styling
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return <span className="badge bg-danger">URGENT</span>;
      case 'HIGH':
        return <span className="badge" style={{ backgroundColor: '#e67e22', color: '#fff' }}>HIGH</span>;
      case 'MEDIUM':
        return <span className="badge bg-info text-dark">MEDIUM</span>;
      case 'LOW':
        return <span className="badge bg-secondary">LOW</span>;
      default:
        return <span className="badge bg-light text-dark">{priority}</span>;
    }
  };

  const getTransitionButtonClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'btn-outline-info';
      case 'In Progress':
        return 'btn-outline-warning text-dark';
      case 'Waiting for Requester':
        return 'btn-outline-secondary';
      case 'Resolved':
        return 'btn-success';
      case 'Closed':
        return 'btn-dark';
      case 'Reopened':
        return 'btn-outline-danger';
      case 'Cancelled':
        return 'btn-outline-danger';
      default:
        return 'btn-outline-primary';
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="text-muted mt-2">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger mb-3">Ticket not found or error loading data.</div>
        <button className="btn btn-outline-success" onClick={onBack}>&larr; Back to Queue</button>
      </div>
    );
  }

  const allowedNextStatuses = validTransitions[ticket.status] || [];

  return (
    <div className="container py-4">
      {/* Top Bar: Back button, Ticket Number & Status */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            &larr; Back to Queue
          </button>
          <div>
            <h3 className="fw-bold mb-0 d-inline-block me-2" style={{ color: '#006B3C' }}>
              {ticket.ticketNumber}
            </h3>
            {getStatusBadge(ticket.status)}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {ticket.owner?.id !== currentUser.id && (
            <button
              className="btn btn-sm btn-success fw-semibold"
              onClick={handleClaimTicket}
              disabled={isUpdatingOwner}
            >
              {isUpdatingOwner ? 'Claiming...' : 'Claim Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
        </div>
      )}
      {actionSuccess && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {actionSuccess}
          <button type="button" className="btn-close" onClick={() => setActionSuccess('')} aria-label="Close"></button>
        </div>
      )}

      {/* Indicated Resolved Alert Banner */}
      {ticket.indicatedResolvedAt && (
        <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
          <span className="fs-5 me-2">💡</span>
          <div>
            <strong>Requester Indication:</strong> The requester indicated that this problem appears resolved on{' '}
            {new Date(ticket.indicatedResolvedAt).toLocaleString()}. You may formally transition this ticket to <strong>Resolved</strong> below.
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* LEFT COLUMN: Main Ticket Content & Discussion Threads */}
        <div className="col-12 col-lg-8">
          {/* Ticket Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
              <h5 className="mb-0 fw-bold text-dark">{ticket.summary}</h5>
            </div>
            <div className="card-body p-4">
              <div className="mb-4">
                <h6 className="fw-semibold text-secondary small text-uppercase mb-2">Description</h6>
                <div className="p-3 bg-light rounded text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {ticket.description}
                </div>
              </div>

              {/* Attachments Section */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-semibold text-secondary small text-uppercase mb-2">
                    Attachments ({ticket.attachments.length})
                  </h6>
                  <ul className="list-group list-group-flush border rounded">
                    {ticket.attachments.map((att) => (
                      <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <span className="me-2">📎</span>
                          <span className={att.isRemoved ? 'text-decoration-line-through text-muted' : 'fw-medium'}>
                            {att.originalFileName}
                          </span>
                          <span className="text-muted small ms-2">({Math.round(att.size / 1024)} KB)</span>
                          {att.isRemoved && (
                            <span className="badge bg-danger ms-2">Removed: {att.removalReason}</span>
                          )}
                        </div>
                        {!att.isRemoved && (
                          <a
                            href={`http://localhost:3000/api/tickets/${ticket.id}/attachments/${att.id}/download`}
                            className="btn btn-sm btn-outline-primary"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* TWO-TIER DISCUSSION THREADS */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom p-0">
              <ul className="nav nav-tabs border-0" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link border-0 py-3 px-4 fw-bold ${activeDiscussionTab === 'comments' ? 'border-bottom border-3 text-success' : 'text-secondary'}`}
                    style={{ borderColor: activeDiscussionTab === 'comments' ? '#006B3C' : 'transparent' }}
                    onClick={() => setActiveDiscussionTab('comments')}
                    type="button"
                    role="tab"
                  >
                    💬 Public Comments ({comments.length})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link border-0 py-3 px-4 fw-bold ${activeDiscussionTab === 'notes' ? 'border-bottom border-3 text-warning' : 'text-secondary'}`}
                    style={{ borderColor: activeDiscussionTab === 'notes' ? '#f39c12' : 'transparent' }}
                    onClick={() => setActiveDiscussionTab('notes')}
                    type="button"
                    role="tab"
                  >
                    🔒 Internal Notes ({internalNotes.length})
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body p-4">
              {/* TAB 1: PUBLIC COMMENTS */}
              {activeDiscussionTab === 'comments' && (
                <div>
                  <div className="alert alert-light border small text-muted mb-4">
                    📢 <strong>Public Thread:</strong> Messages here are visible to the Requester, IT Staff, and Administrators.
                  </div>

                  {/* Comment List */}
                  {comments.length === 0 ? (
                    <div className="text-center text-muted py-4">No public comments posted yet.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3 mb-4">
                      {comments.map((c) => (
                        <div key={c.id} className="card border bg-light">
                          <div className="card-body py-2 px-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-semibold text-dark">
                                {c.author.name}{' '}
                                <span className="badge bg-secondary ms-1 small" style={{ fontSize: '0.7rem' }}>
                                  {c.author.role}
                                </span>
                              </span>
                              <span className="text-muted small">
                                {new Date(c.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post Comment Form */}
                  <form onSubmit={handlePostComment}>
                    <div className="mb-2">
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Write a public response to the requester..."
                        value={newCommentText}
                        maxLength={2000}
                        onChange={(e) => setNewCommentText(e.target.value)}
                      />
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">{newCommentText.length} / 2000 characters</span>
                      <button
                        type="submit"
                        className="btn btn-sm btn-success px-4"
                        disabled={isSubmittingComment || !newCommentText.trim()}
                      >
                        {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: INTERNAL NOTES */}
              {activeDiscussionTab === 'notes' && (
                <div>
                  <div className="alert alert-warning border small text-dark mb-4">
                    🔒 <strong>Staff Operational Notes:</strong> These notes are completely private and confidential. Only IT Staff and Administrators can view or post here.
                  </div>

                  {/* Note List */}
                  {internalNotes.length === 0 ? (
                    <div className="text-center text-muted py-4">No internal notes recorded yet.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3 mb-4">
                      {internalNotes.map((n) => (
                        <div key={n.id} className="card border" style={{ backgroundColor: '#FFFDF5', borderColor: '#FDECC8' }}>
                          <div className="card-body py-2 px-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-semibold text-dark">
                                🔒 {n.author.name}{' '}
                                <span className="badge bg-warning text-dark ms-1 small" style={{ fontSize: '0.7rem' }}>
                                  {n.author.role}
                                </span>
                              </span>
                              <span className="text-muted small">
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>{n.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post Note Form */}
                  <form onSubmit={handlePostNote}>
                    <div className="mb-2">
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Record internal troubleshooting steps, vendor logs, diagnostic notes..."
                        value={newNoteText}
                        maxLength={2000}
                        onChange={(e) => setNewNoteText(e.target.value)}
                      />
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">{newNoteText.length} / 2000 characters</span>
                      <button
                        type="submit"
                        className="btn btn-sm btn-warning text-dark fw-semibold px-4"
                        disabled={isSubmittingNote || !newNoteText.trim()}
                      >
                        {isSubmittingNote ? 'Saving Note...' : 'Add Internal Note'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operations Sidebar (Status, Owner, Priority, Requester Info) */}
        <div className="col-12 col-lg-4">
          {/* Status Workflow Action Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold text-dark">Status & Workflow Transitions</h6>
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">Current Status:</span>
                {getStatusBadge(ticket.status)}
              </div>

              {allowedNextStatuses.length === 0 ? (
                <div className="alert alert-secondary small mb-0">
                  This ticket is in a terminal state (<strong>{ticket.status}</strong>). No further status transitions are permitted.
                </div>
              ) : (
                <div>
                  <label className="form-label small fw-semibold text-secondary mb-2">Permitted Transitions:</label>
                  <div className="d-flex flex-column gap-2">
                    {allowedNextStatuses.map((st) => (
                      <button
                        key={st}
                        className={`btn btn-sm text-start fw-semibold ${getTransitionButtonClass(st)}`}
                        onClick={() => handleTransitionStatus(st)}
                        disabled={isUpdatingStatus}
                      >
                        &rarr; Move to <strong>{st}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Ownership Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold text-dark">Ticket Ownership</h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <div className="small text-muted mb-1">Assigned Owner:</div>
                {ticket.owner ? (
                  <div className="fw-semibold text-dark">
                    👤 {ticket.owner.name}{' '}
                    <span className="badge bg-light text-secondary border small ms-1">
                      {ticket.owner.role}
                    </span>
                  </div>
                ) : (
                  <div className="text-danger fw-semibold">Unassigned</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="select-ticket-owner" className="form-label small fw-semibold text-secondary mb-1">
                  Reassign Owner
                </label>
                <select
                  id="select-ticket-owner"
                  className="form-select form-select-sm"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                >
                  <option value="">-- Unassign (None) --</option>
                  {staffMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}) {m.id === currentUser.id ? '★ You' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-sm btn-outline-success w-100"
                onClick={handleAssignOwner}
                disabled={isUpdatingOwner}
              >
                {isUpdatingOwner ? 'Updating...' : 'Save Owner Assignment'}
              </button>
            </div>
          </div>

          {/* Ticket Priority Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold text-dark">Priority Management</h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <div className="small text-muted mb-1">Requested Priority (User):</div>
                <div className="d-flex align-items-center gap-2">
                  {getPriorityBadge(ticket.requestedPriority)}
                  <span className="small text-muted">(Immutable)</span>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="select-it-priority" className="form-label small fw-semibold text-secondary mb-1">
                  Operational IT Priority
                </label>
                <select
                  id="select-it-priority"
                  className="form-select form-select-sm"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                >
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <button
                className="btn btn-sm btn-outline-success w-100"
                onClick={handleUpdatePriority}
                disabled={isUpdatingPriority}
              >
                {isUpdatingPriority ? 'Updating...' : 'Save IT Priority'}
              </button>
            </div>
          </div>

          {/* Requester & Meta Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold text-dark">Requester & Ticket Details</h6>
            </div>
            <div className="card-body p-3 small">
              <div className="mb-2">
                <span className="text-muted">Requester:</span>{' '}
                <strong className="text-dark">{ticket.requester.name}</strong>
              </div>
              <div className="mb-2">
                <span className="text-muted">Email:</span>{' '}
                <span className="text-dark">{ticket.requester.email}</span>
              </div>
              {ticket.category && (
                <div className="mb-2">
                  <span className="text-muted">Category:</span>{' '}
                  <span className="badge bg-light text-dark border ms-1">{ticket.category.name}</span>
                </div>
              )}
              {ticket.relatedSystem && (
                <div className="mb-2">
                  <span className="text-muted">System:</span>{' '}
                  <span className="badge bg-light text-dark border ms-1">{ticket.relatedSystem.name}</span>
                </div>
              )}
              <div className="mb-2">
                <span className="text-muted">Created:</span>{' '}
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted">Last Updated:</span>{' '}
                <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffTicketDetail;
