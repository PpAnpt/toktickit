import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchStaffTickets,
  fetchStaffMembers,
  type StaffTicket,
  type StaffMember,
  type UserProfile
} from '../api';

interface StaffTicketQueueProps {
  currentUser: UserProfile;
  onSelectTicket?: (ticketId: number) => void;
}

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({
  currentUser,
  onSelectTicket
}) => {
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filter and pagination states
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTickets, setTotalTickets] = useState<number>(0);

  // Fetch staff members for the owner filter
  useEffect(() => {
    fetchStaffMembers()
      .then((members) => setStaffMembers(members))
      .catch((err) => console.error('Failed to load staff members:', err));
  }, []);

  // Fetch ticket queue
  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchStaffTickets({
        page: currentPage,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter,
        priority: priorityFilter,
        owner: ownerFilter,
        sortBy,
        sortOrder
      });
      setTickets(res.tickets);
      setTotalPages(res.pagination.totalPages);
      setTotalTickets(res.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket queue');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter, priorityFilter, ownerFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setOwnerFilter('All');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    ownerFilter !== 'All';

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

  return (
    <div className="container py-4">
      {/* Header & Stats Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-0" style={{ color: '#1A2F25' }}>IT Staff Ticket Queue</h2>
          <p className="text-muted small mb-0">Triage, claim, and resolve service desk tickets</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span
            className="badge rounded-pill px-3 py-2 fs-6"
            style={{ backgroundColor: '#EAF6EF', color: '#006B3C', border: '1px solid #006B3C' }}
          >
            Total in Queue: <strong>{totalTickets}</strong>
          </span>
          <button
            className="btn btn-sm btn-outline-success"
            onClick={() => loadQueue()}
            title="Refresh queue"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: '#F8FAF9' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-4">
              <label htmlFor="staff-search-input" className="form-label small fw-semibold text-secondary mb-1">
                Search
              </label>
              <input
                id="staff-search-input"
                type="text"
                className="form-control"
                placeholder="Search ticket #, summary, requester..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="staff-status-filter" className="form-label small fw-semibold text-secondary mb-1">
                Status
              </label>
              <select
                id="staff-status-filter"
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Requester">Waiting for Requester</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="staff-priority-filter" className="form-label small fw-semibold text-secondary mb-1">
                Priority
              </label>
              <select
                id="staff-priority-filter"
                className="form-select"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Priorities</option>
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="staff-owner-filter" className="form-label small fw-semibold text-secondary mb-1">
                Owner
              </label>
              <select
                id="staff-owner-filter"
                className="form-select"
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Owners</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
                {staffMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.id === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="col-6 col-md-2">
              <label htmlFor="staff-sort-filter" className="form-label small fw-semibold text-secondary mb-1">
                Sort By
              </label>
              <select
                id="staff-sort-filter"
                className="form-select"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy || 'createdAt');
                  setSortOrder((newSortOrder as 'asc' | 'desc') || 'desc');
                  setCurrentPage(1);
                }}
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="ticketNumber-asc">Ticket # (Asc)</option>
                <option value="ticketNumber-desc">Ticket # (Desc)</option>
                <option value="priority-desc">Priority</option>
              </select>
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div className="mt-3 text-end">
              <button
                className="btn btn-sm btn-link text-decoration-none text-muted"
                onClick={handleResetFilters}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={() => loadQueue()}>Retry</button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading queue...</span>
          </div>
          <p className="text-muted mt-2">Loading ticket queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div className="card text-center py-5 border-0 shadow-sm" style={{ backgroundColor: '#F8FAF9' }}>
          <div className="card-body">
            <div className="fs-1 text-muted mb-3">🎫</div>
            <h5 className="fw-bold text-dark mb-2">No tickets found</h5>
            <p className="text-muted mb-3">
              {hasActiveFilters
                ? 'No tickets match the current search criteria or filters.'
                : 'There are currently no tickets in the queue.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-success px-4" onClick={handleResetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Ticket Queue Table */
        <div className="card shadow-sm border-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ backgroundColor: '#EAF6EF', color: '#006B3C' }}>
                <tr>
                  <th scope="col" className="py-3 px-3">Ticket #</th>
                  <th scope="col" className="py-3">Summary</th>
                  <th scope="col" className="py-3">Requester</th>
                  <th scope="col" className="py-3">Status</th>
                  <th scope="col" className="py-3">IT Priority</th>
                  <th scope="col" className="py-3">Owner</th>
                  <th scope="col" className="py-3">Created</th>
                  <th scope="col" className="py-3 text-end px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: onSelectTicket ? 'pointer' : 'default' }}
                    onClick={() => onSelectTicket && onSelectTicket(t.id)}
                  >
                    <td className="px-3 fw-bold" style={{ color: '#006B3C' }}>
                      {t.ticketNumber}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '300px' }}>
                        {t.summary}
                      </div>
                      {t.category && (
                        <span className="badge bg-light text-secondary me-1">
                          {t.category.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="small fw-medium text-dark">{t.requester.name}</div>
                      <div className="small text-muted">{t.requester.email}</div>
                    </td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td>{getPriorityBadge(t.itPriority || t.requestedPriority)}</td>
                    <td>
                      {t.owner ? (
                        <span className="badge rounded-pill bg-light text-dark border">
                          👤 {t.owner.name}
                        </span>
                      ) : (
                        <span className="badge rounded-pill bg-secondary text-white opacity-75">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="small text-muted">
                      {new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="text-end px-3">
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectTicket) onSelectTicket(t.id);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3 border-top">
              <span className="text-muted small">
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalTickets} tickets)
              </span>
              <nav aria-label="Staff ticket pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p)}>
                        {p}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffTicketQueue;
