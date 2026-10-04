import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import { StaffTicketQueue } from './components/StaffTicketQueue';
import { StaffTicketDetail } from './components/StaffTicketDetail';
import { UserManagement } from './components/UserManagement';
import { PublicComments } from './components/PublicComments';
import { RoleBadge } from './components/RoleBadge';
import {
  getMe,
  logout as apiLogout,
  type UserProfile,
  type OptionItem,
  getAuthToken,
  indicateTicketResolved,
  fetchCategories,
  fetchRelatedSystems,
  fetchMyTickets,
  fetchMyTicket,
  createTicket,
  uploadAttachment,
  removeAttachment,
  downloadAttachment,
  SESSION_EXPIRED_EVENT,
} from './api';

type Tab = 'create' | 'my-tickets' | 'staff-queue' | 'user-management';

function defaultTabFor(role: UserProfile['role']): Tab {
  if (role === 'ADMINISTRATOR') return 'user-management';
  if (role === 'IT_STAFF') return 'staff-queue';
  return 'create';
}

interface AttachmentItem {
  id: number;
  originalFileName: string;
  storedFileName: string;
  size: number;
  mimeType: string;
  isRemoved: boolean;
  removalReason?: string;
  createdAt: string;
}

interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  status: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  updatedAt: string;
  category: OptionItem;
  relatedSystem: OptionItem;
  attachments: AttachmentItem[];
  indicatedResolvedAt?: string | null;
}

function App() {
  // Authentication & Navigation
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(getAuthToken()));
  const [loginNotice, setLoginNotice] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [currentTab, setCurrentTab] = useState<Tab>('create');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const isRequester = currentUser?.role === 'REQUESTER';
  const isStaffOrAdmin = currentUser?.role === 'IT_STAFF' || currentUser?.role === 'ADMINISTRATOR';
  // Normal application screens stay unavailable until a mandatory password change is saved (BR-02)
  const hasAppAccess = isLoggedIn && !!currentUser && !currentUser.mustChangePassword;

  // Check existing session on component mount
  useEffect(() => {
    if (!getAuthToken()) return;
    getMe()
      .then(user => {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setCurrentTab(defaultTabFor(user.role));
      })
      .catch(() => {
        setIsLoggedIn(false);
        setCurrentUser(null);
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setLoginNotice('');
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentTab(defaultTabFor(user.role));
  };

  const handlePasswordChanged = async () => {
    const wasVoluntary = showChangePassword;
    setShowChangePassword(false);
    try {
      setCurrentUser(await getMe());
    } catch {
      setCurrentUser(prev => (prev ? { ...prev, mustChangePassword: false } : null));
    }
    if (wasVoluntary) setProfileMessage('Your password was changed successfully.');
  };

  const resetSessionState = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowChangePassword(false);
    setProfileMessage('');
    setSelectedTicketId(null);
    setTickets([]);
    setTotalItems(0);
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setCurrentPage(1);
    setTicketDetail(null);
    setSuccessMessage(null);
    setApiError('');
    setFormErrors({});
    setDetailError('');
    setDetailFeedback(null);
    window.history.pushState(null, '', '/');
  };

  const handleLogout = async () => {
    await apiLogout();
    resetSessionState();
    setLoginNotice('You have been signed out.');
  };

  // The server rejected the stored token (expired, revoked by logout/password reset, or deactivated)
  useEffect(() => {
    const onExpired = () => {
      resetSessionState();
      setLoginNotice('Your session has ended. Please sign in again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  // Reference Data
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<OptionItem[]>([]);

  // Create Ticket Form State
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [relatedSystemId, setRelatedSystemId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ ticketNumber: string } | null>(null);
  const [apiError, setApiError] = useState('');

  // My Tickets List State
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [ticketsError, setTicketsError] = useState('');

  // Ticket Detail State
  const [ticketDetail, setTicketDetail] = useState<TicketItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailFeedback, setDetailFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isIndicatingResolved, setIsIndicatingResolved] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [isUploadingMore, setIsUploadingMore] = useState(false);

  // Soft-removal with Reason Modal State
  const [removingAttachment, setRemovingAttachment] = useState<{ id: number; name: string } | null>(null);
  const [removalReasonInput, setRemovalReasonInput] = useState('');
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);
  const [removalError, setRemovalError] = useState('');


  // 2. Load Categories & Related Systems for the Requester Create Ticket form
  useEffect(() => {
    if (hasAppAccess && isRequester) {
      fetchCategories()
        .then(setCategories)
        .catch(err => setApiError(err.message));

      fetchRelatedSystems()
        .then(setRelatedSystems)
        .catch(err => setApiError(err.message));
    }
  }, [hasAppAccess, isRequester]);

  // 3. ฟังก์ชันดึงรายการตั๋ว (My Tickets)
  const fetchTickets = useCallback(async () => {
    if (!hasAppAccess || !isRequester) return;
    setIsLoadingTickets(true);
    setTicketsError('');
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '10',
        sortBy,
        sortOrder,
      });
      if (search) params.append('search', search);
      if (filterCategory) params.append('categoryId', String(filterCategory));
      if (filterStatus) params.append('status', filterStatus);

      const data = await fetchMyTickets<TicketItem>(params);
      setTickets(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalItems(data.meta?.totalItems || 0);
    } catch (err: any) {
      setTicketsError(err.message || 'Failed to load tickets.');
    } finally {
      setIsLoadingTickets(false);
    }
  }, [hasAppAccess, isRequester, currentPage, search, filterCategory, filterStatus, sortBy, sortOrder]);

  // Reload the ticket list when signing in, switching tabs, or closing a ticket detail
  useEffect(() => {
    if (hasAppAccess && isRequester) {
      fetchTickets();
    } else {
      setTickets([]);
      setTotalItems(0);
    }
  }, [hasAppAccess, isRequester, currentTab, selectedTicketId, fetchTickets]);

  // 4. Requester Ticket Detail (other requesters' tickets return 404 from the API)
  const fetchTicketDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    setDetailError('');
    try {
      setTicketDetail(await fetchMyTicket<TicketItem>(id));
    } catch (err: any) {
      setTicketDetail(null);
      setDetailError(err.message || 'Failed to load ticket details.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicketId !== null && hasAppAccess && isRequester) {
      setDetailFeedback(null);
      fetchTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId, hasAppAccess, isRequester, fetchTicketDetail]);

  // Sync URL Routing: ตรวจสอบ /tickets/:id จาก Browser Address Bar อัตโนมัติ
  useEffect(() => {
    const handleLocationChange = () => {
      const match = window.location.pathname.match(/\/tickets\/(\d+)/);
      if (match) {
        setSelectedTicketId(Number(match[1]));
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // จัดการเลือกไฟล์แนบ (Create Form)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      setFileError('You can upload a maximum of 5 files.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setFileError(`File "${file.name}" has an unsupported format. (Allowed: JPG, PNG, WEBP, PDF)`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }
    }

    setSelectedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  // Submit สร้างตั๋ว
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError('');
    setSuccessMessage(null);

    const newErrors: Record<string, string> = {};
    if (!summary.trim()) newErrors.summary = 'Summary is required.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!categoryId) newErrors.categoryId = 'Please select a Category.';
    if (!relatedSystemId) newErrors.relatedSystemId = 'Please select a Related System.';

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    // หน่วงเวลาสั้นๆ (700ms) เพื่อให้เห็นสถานะ Submitting... (Busy State) ชัดเจนระหว่างการประมวลผล
    await new Promise((resolve) => setTimeout(resolve, 700));

    try {
      const ticketData = await createTicket({
        summary,
        description,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority: priority
      });

      const failedUploads: string[] = [];
      for (const file of selectedFiles) {
        try {
          await uploadAttachment(ticketData.id, file);
        } catch (uploadErr: any) {
          failedUploads.push(`${file.name}: ${uploadErr.message}`);
        }
      }
      if (failedUploads.length > 0) {
        setApiError(`Ticket ${ticketData.ticketNumber} was created, but some attachments failed to upload. ${failedUploads.join(' ')}`);
      }

      setSuccessMessage({ ticketNumber: ticketData.ticketNumber });
      setSummary('');
      setDescription('');
      setCategoryId('');
      setRelatedSystemId('');
      setPriority('MEDIUM');
      setSelectedFiles([]);
      fetchTickets(); // อัปเดตรายการและตัวเลขตั๋วทันที
    } catch (err: any) {
      setApiError(err.message || 'Error creating ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download an attachment with the authenticated session
  const handleDownloadAttachment = (ticketId: number, attachmentId: number, fileName: string) => {
    setDetailFeedback(null);
    downloadAttachment(ticketId, attachmentId, fileName)
      .catch(err => setDetailFeedback({ type: 'danger', text: err.message }));
  };

  // Soft-remove an attachment with a required removal reason
  const handleOpenRemoveModal = (attId: number, attName: string) => {
    setRemovingAttachment({ id: attId, name: attName });
    setRemovalReasonInput('Uploaded wrong file version');
    setRemovalError('');
  };

  const handleConfirmRemove = async (ticketId: number) => {
    if (!removingAttachment) return;
    const reason = removalReasonInput.trim();
    if (!reason) {
      setRemovalError('A removal reason is required.');
      return;
    }
    setIsSubmittingRemoval(true);
    setRemovalError('');
    try {
      await removeAttachment(ticketId, removingAttachment.id, reason);
      setDetailFeedback({ type: 'success', text: `${removingAttachment.name} was removed.` });
      setRemovingAttachment(null);
      fetchTicketDetail(ticketId);
    } catch (err: any) {
      setRemovalError(err.message || 'Failed to remove attachment.');
    } finally {
      setIsSubmittingRemoval(false);
    }
  };

  // Upload more attachments from the detail page
  const handleAddMoreAttachments = async (ticketId: number) => {
    if (additionalFiles.length === 0) return;
    setIsUploadingMore(true);
    setDetailFeedback(null);
    const failed: string[] = [];
    for (const file of additionalFiles) {
      try {
        await uploadAttachment(ticketId, file);
      } catch (err: any) {
        failed.push(err.message);
      }
    }
    setDetailFeedback(
      failed.length > 0
        ? { type: 'danger', text: failed.join(' ') }
        : { type: 'success', text: 'Attachment uploaded.' }
    );
    setAdditionalFiles([]);
    setIsUploadingMore(false);
    fetchTicketDetail(ticketId);
  };

  // Requester indicates the problem appears resolved; IT Staff still formally resolve the ticket
  const handleIndicateResolved = async (ticketId: number) => {
    setIsIndicatingResolved(true);
    setDetailFeedback(null);
    try {
      await indicateTicketResolved(ticketId);
      setDetailFeedback({ type: 'success', text: 'Thanks! IT Staff have been told the problem appears resolved.' });
      fetchTicketDetail(ticketId);
    } catch (err: any) {
      setDetailFeedback({ type: 'danger', text: err.message || 'Failed to indicate the problem is resolved.' });
    } finally {
      setIsIndicatingResolved(false);
    }
  };


  // --- 1. Login ---
  if (isRestoringSession && !isLoggedIn) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }} role="status">
        <div className="spinner-border text-success"></div>
        <span className="ms-2 text-muted">Restoring your session...</span>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        notice={loginNotice}
      />
    );
  }

  // --- 2. Mandatory first-login password change: no application screens until saved ---
  if (currentUser.mustChangePassword) {
    return (
      <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh' }}>
        <ChangePassword onPasswordChanged={handlePasswordChanged} userEmail={currentUser.email} />
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 10000 }}>
          <button className="btn btn-light btn-sm fw-semibold" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    );
  }

  // --- 3. Main application after login ---
  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh', paddingBottom: '40px' }}>
      {showChangePassword && (
        <ChangePassword
          onPasswordChanged={handlePasswordChanged}
          onCancel={() => setShowChangePassword(false)}
          userEmail={currentUser.email}
        />
      )}

      {/* Zen Green Navigation Bar */}
      <nav className="navbar navbar-light shadow-sm">
        <div className="container flex-wrap gap-2">
          <span className="navbar-brand fw-bold fs-4">TokTickIT</span>
          <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
            <div className="text-dark text-end" style={{ minWidth: 0 }}>
              <div className="fw-semibold d-flex align-items-center justify-content-end flex-wrap gap-1">
                <span className="text-truncate" style={{ maxWidth: '45vw' }}>{currentUser.name}</span>
                <RoleBadge role={currentUser.role} className="ms-1" data-testid="role-badge" />
              </div>
              <small className="text-muted d-none d-sm-inline">{currentUser.email}</small>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm fw-semibold"
              onClick={() => { setProfileMessage(''); setShowChangePassword(true); }}
            >
              Change Password
            </button>
            <button
              className="btn btn-outline-danger btn-sm fw-bold"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        {profileMessage && (
          <div className="alert alert-success alert-dismissible py-2" role="status">
            {profileMessage}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setProfileMessage('')}></button>
          </div>
        )}

        {/* Role-based navigation: only destinations the current role may use */}
        <nav className="d-flex flex-wrap border-bottom mb-4" style={{ borderColor: '#0B7A46' }} aria-label="Main navigation">
          {currentUser.role === 'ADMINISTRATOR' && (
            <button
              className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'user-management' && selectedTicketId === null ? 'border-bottom border-3' : 'text-secondary'}`}
              style={{ color: currentTab === 'user-management' && selectedTicketId === null ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
              onClick={() => { setCurrentTab('user-management'); setSelectedTicketId(null); }}
            >
              User Management
            </button>
          )}
          {isStaffOrAdmin && (
            <button
              className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'staff-queue' ? 'border-bottom border-3' : 'text-secondary'}`}
              style={{ color: currentTab === 'staff-queue' ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
              onClick={() => { setCurrentTab('staff-queue'); setSelectedTicketId(null); }}
            >
              Ticket Queue
            </button>
          )}
          {isRequester && (
            <>
              <button
                className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'create' && selectedTicketId === null ? 'border-bottom border-3' : 'text-secondary'}`}
                style={{ color: currentTab === 'create' && selectedTicketId === null ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
                onClick={() => { setCurrentTab('create'); setSelectedTicketId(null); }}
              >
                Create Ticket
              </button>
              <button
                className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'my-tickets' || selectedTicketId !== null ? 'border-bottom border-3' : 'text-secondary'}`}
                style={{ color: currentTab === 'my-tickets' || selectedTicketId !== null ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
                onClick={() => { setCurrentTab('my-tickets'); setSelectedTicketId(null); }}
              >
                My Tickets {totalItems > 0 && <span className="badge rounded-pill ms-1" style={{ backgroundColor: '#0B7A46' }}>{totalItems}</span>}
              </button>
            </>
          )}
        </nav>

        {/* TAB 1: CREATE TICKET (Requester) */}
        {isRequester && currentTab === 'create' && selectedTicketId === null && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                  <h4 className="mb-0 fw-bold" style={{ color: '#006B3C' }}>Create New Support Ticket</h4>
                </div>

                <div className="card-body p-4">
                  {successMessage && (
                    <div className="alert alert-success d-flex justify-content-between align-items-center mb-4" role="alert">
                      <div>
                        🎉 Ticket created successfully! Your Ticket Number is: <strong>{successMessage.ticketNumber}</strong>
                      </div>
                      <button className="btn btn-sm btn-success" onClick={() => { setCurrentTab('my-tickets'); fetchTickets(); }}>
                        View in My Tickets &rarr;
                      </button>
                    </div>
                  )}

                  {apiError && <div className="alert alert-danger mb-4">{apiError}</div>}

                  <form onSubmit={handleCreateSubmit} noValidate>
                    {/* Read-only Requester Field (Context Proof) */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Requester</label>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={currentUser ? `${currentUser.name} (${currentUser.email})` : ''}
                        readOnly
                        disabled
                      />
                      <div className="form-text text-muted small">
                        Populated automatically from your authenticated session.
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Category <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${formErrors.categoryId ? 'is-invalid' : ''}`}
                          value={categoryId}
                          onChange={(e) => setCategoryId(Number(e.target.value) || '')}
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {formErrors.categoryId && <div className="invalid-feedback">{formErrors.categoryId}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Related System <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${formErrors.relatedSystemId ? 'is-invalid' : ''}`}
                          value={relatedSystemId}
                          onChange={(e) => setRelatedSystemId(Number(e.target.value) || '')}
                        >
                          <option value="">-- Select Related System --</option>
                          {relatedSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {formErrors.relatedSystemId && <div className="invalid-feedback">{formErrors.relatedSystemId}</div>}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Priority</label>
                      <div className="d-flex gap-3">
                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                          <div className="form-check" key={p}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="priority"
                              id={`priority-${p}`}
                              value={p}
                              checked={priority === p}
                              onChange={() => setPriority(p)}
                            />
                            <label className="form-check-label text-capitalize" htmlFor={`priority-${p}`}>
                              {p.toLowerCase()}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Summary <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.summary ? 'is-invalid' : ''}`}
                        placeholder="Brief summary of the issue"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                      />
                      {formErrors.summary && <div className="invalid-feedback">{formErrors.summary}</div>}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Description <span className="text-danger">*</span></label>
                      <textarea
                        className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        placeholder="Detailed description of what happened..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                    </div>

                    <div className="mb-4">
                      <label htmlFor="file-upload" className="form-label fw-semibold">
                        Attachments <small className="text-muted fw-normal">(Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)</small>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        className="form-control"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        disabled={selectedFiles.length >= 5}
                      />
                      {fileError && <div className="text-danger small mt-1">{fileError}</div>}


                      {selectedFiles.length > 0 && (
                        <ul className="list-group mt-2">
                          {selectedFiles.map((file, idx) => (
                            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                              <span className="small text-truncate" style={{ maxWidth: '80%' }}>
                                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-lg w-100 text-white fw-semibold"
                      style={{ backgroundColor: '#006B3C' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting Ticket...
                        </>
                      ) : (
                        'Submit Ticket'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY TICKETS LIST (Requester) */}
        {isRequester && currentTab === 'my-tickets' && selectedTicketId === null && (
          <div>
            {/* Search & Filter Bar */}
            <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
              <div className="row g-2">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Search summary, description, ticket #..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(Number(e.target.value) || ''); setCurrentPage(1); }}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">All Statuses</option>
                    {['New', 'Open', 'In Progress', 'Waiting for Requester', 'Resolved', 'Closed', 'Reopened', 'Cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="requestedPriority-desc">Highest Priority</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ticket List Cards */}
            {isLoadingTickets ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status"></div>
                <p className="text-muted mt-2">Loading tickets...</p>
              </div>
            ) : ticketsError ? (
              <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
                <span>{ticketsError}</span>
                <button className="btn btn-sm btn-outline-danger" onClick={fetchTickets}>Try again</button>
              </div>
            ) : tickets.length === 0 ? (
              /* Empty State */
              <div className="card shadow-sm border-0 p-5 text-center bg-white">
                <div className="fs-1 mb-3">🎫</div>
                <h4 className="fw-bold" style={{ color: '#006B3C' }}>No tickets found</h4>
                <p className="text-muted">You haven't submitted any support requests matching this criteria.</p>
                <div className="mt-2">
                  <button className="btn text-white fw-semibold px-4" style={{ backgroundColor: '#006B3C' }} onClick={() => setCurrentTab('create')}>
                    Create a New Ticket
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="d-flex flex-column gap-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="card shadow-sm border-0 p-3 bg-white ticket-card"
                      style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        window.history.pushState(null, '', `/tickets/${t.id}`);
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge text-white fw-bold px-2 py-1" style={{ backgroundColor: '#006B3C' }}>
                              {t.ticketNumber}
                            </span>
                            <span className={`badge ${t.requestedPriority === 'HIGH' || t.requestedPriority === 'URGENT' ? 'bg-danger' : t.requestedPriority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                              {t.requestedPriority}
                            </span>
                            <span className="badge bg-light text-dark border">{t.category?.name}</span>
                            <span className="badge bg-light text-muted border">{t.relatedSystem?.name}</span>
                          </div>
                          <h5 className="mb-1 fw-bold text-dark">{t.summary}</h5>
                          <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '600px' }}>
                            {t.description}
                          </p>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 mb-2 d-inline-block">
                            {t.status}
                          </span>
                          <div className="text-muted small">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                          {t.attachments && t.attachments.length > 0 && (
                            <div className="small text-muted mt-1">
                              📎 {t.attachments.length} attachment(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <span className="text-muted small">
                      Page {currentPage} of {totalPages} ({totalItems} total tickets)
                    </span>
                    <div className="btn-group">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        &larr; Previous
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STAFF TICKET QUEUE */}
        {isStaffOrAdmin && currentTab === 'staff-queue' && selectedTicketId === null && (
          <StaffTicketQueue
            currentUser={currentUser}
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
            }}
          />
        )}

        {/* TAB 4: ADMINISTRATOR USER MANAGEMENT */}
        {currentTab === 'user-management' && selectedTicketId === null && currentUser?.role === 'ADMINISTRATOR' && (
          <UserManagement currentUser={currentUser} />
        )}

        {/* VIEW: TICKET DETAIL VIEW */}
        {selectedTicketId !== null && (
          isStaffOrAdmin ? (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              currentUser={currentUser}
              onBack={() => {
                setSelectedTicketId(null);
                setDetailError('');
                window.history.pushState(null, '', '/');
              }}
              onTicketUpdated={() => {
                fetchTickets();
              }}
            />
          ) : (
            <div>
              <button
                className="btn btn-outline-secondary btn-sm mb-3"
                onClick={() => {
                  setSelectedTicketId(null);
                  setDetailError('');
                  window.history.pushState(null, '', '/');
                }}
              >
                &larr; Back to My Tickets
              </button>

              {isLoadingDetail ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success"></div>
                </div>
              ) : detailError ? (
                <div className="card shadow-sm border-0 p-5 text-center bg-white my-3">
                  <div className="fs-1 mb-3">🔍</div>
                  <h4 className="fw-bold text-danger">Ticket Unavailable</h4>
                  <p className="text-muted fs-6 mb-4" role="alert">{detailError}</p>
                  <div>
                    <button
                      className="btn text-white fw-semibold px-4"
                      style={{ backgroundColor: '#006B3C' }}
                      onClick={() => {
                        setSelectedTicketId(null);
                        setDetailError('');
                        window.history.pushState(null, '', '/');
                      }}
                    >
                      &larr; Back to My Tickets
                    </button>
                  </div>
                </div>
              ) : ticketDetail ? (
                <div className="card shadow-sm border-0">
                  <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge text-white fs-6" style={{ backgroundColor: '#006B3C' }}>
                        {ticketDetail.ticketNumber}
                      </span>
                      <h5 className="mb-0 fw-bold" style={{ color: '#006B3C' }}>Ticket Details</h5>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {ticketDetail.indicatedResolvedAt ? (
                        <span className="badge bg-info text-dark">
                          ✓ You indicated this appears resolved ({new Date(ticketDetail.indicatedResolvedAt).toLocaleDateString()})
                        </span>
                      ) : (
                        !['Resolved', 'Closed', 'Cancelled'].includes(ticketDetail.status) && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            disabled={isIndicatingResolved}
                            title="Let IT Staff know the problem seems fixed. IT Staff will formally resolve the ticket."
                            onClick={() => handleIndicateResolved(ticketDetail.id)}
                          >
                            {isIndicatingResolved ? 'Sending...' : 'My Problem Appears Resolved'}
                          </button>
                        )
                      )}
                      <span className="badge bg-success fs-6">{ticketDetail.status}</span>
                    </div>
                  </div>

                  <div className="card-body p-4">
                    {detailFeedback && (
                      <div
                        className={`alert alert-${detailFeedback.type} alert-dismissible py-2`}
                        role={detailFeedback.type === 'danger' ? 'alert' : 'status'}
                      >
                        {detailFeedback.text}
                        <button type="button" className="btn-close" aria-label="Close" onClick={() => setDetailFeedback(null)}></button>
                      </div>
                    )}
                    {/* Meta Details Row */}
                    <div className="row bg-light p-3 rounded mb-4 g-3">
                      <div className="col-sm-3">
                        <small className="text-muted d-block">Category</small>
                        <strong>{ticketDetail.category?.name}</strong>
                      </div>
                      <div className="col-sm-3">
                        <small className="text-muted d-block">Related System</small>
                        <strong>{ticketDetail.relatedSystem?.name}</strong>
                      </div>
                      <div className="col-sm-3">
                        <small className="text-muted d-block">Priority</small>
                        <span className={`badge ${ticketDetail.requestedPriority === 'HIGH' ? 'bg-danger' : ticketDetail.requestedPriority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {ticketDetail.requestedPriority}
                        </span>
                      </div>
                      <div className="col-sm-3">
                        <small className="text-muted d-block">Created Date</small>
                        <span>{new Date(ticketDetail.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Summary & Description */}
                    <div className="mb-4">
                      <h5 className="fw-bold">{ticketDetail.summary}</h5>
                      <div className="p-3 bg-white border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                        {ticketDetail.description}
                      </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="border-top pt-4">
                      <h6 className="fw-bold mb-3" style={{ color: '#006B3C' }}>
                        Attachments ({ticketDetail.attachments.filter(a => !a.isRemoved).length} / 5)
                      </h6>

                      {ticketDetail.attachments.length === 0 ? (
                        <p className="text-muted small">No attachments uploaded for this ticket.</p>
                      ) : (
                        <ul className="list-group mb-3">
                          {ticketDetail.attachments.map((att) => (
                            <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                              <div>
                                {att.isRemoved ? (
                                  <div>
                                    <div>
                                      <span className="text-muted text-decoration-line-through">
                                        📄 {att.originalFileName}
                                      </span>
                                      <span className="badge bg-secondary ms-2">REMOVED</span>
                                    </div>
                                    {att.removalReason && (
                                      <div className="small text-danger mt-1">
                                        <strong>Removal Reason:</strong> {att.removalReason}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span>
                                    📄 <strong>{att.originalFileName}</strong>{' '}
                                    <small className="text-muted">({(att.size / 1024).toFixed(1)} KB)</small>
                                  </span>
                                )}
                              </div>

                              {!att.isRemoved && (
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => handleDownloadAttachment(ticketDetail.id, att.id, att.originalFileName)}
                                  >
                                    ⬇ Download
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleOpenRemoveModal(att.id, att.originalFileName)}
                                  >
                                    🗑 Remove
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Upload More Attachments (if < 5 active) */}
                      {ticketDetail.attachments.filter(a => !a.isRemoved).length < 5 && (
                        <div className="card bg-light border-0 p-3 mt-3">
                          <label className="form-label fw-semibold small mb-1">Add More Attachments</label>
                          <div className="d-flex gap-2 flex-wrap">
                            <input
                              type="file"
                              className="form-control form-control-sm"
                              style={{ maxWidth: '300px' }}
                              accept=".jpg,.jpeg,.png,.webp,.pdf"
                              onChange={(e) => {
                                if (e.target.files) setAdditionalFiles(Array.from(e.target.files));
                              }}
                            />
                            <button
                              className="btn btn-sm text-white"
                              style={{ backgroundColor: '#006B3C' }}
                              disabled={additionalFiles.length === 0 || isUploadingMore}
                              onClick={() => handleAddMoreAttachments(ticketDetail.id)}
                            >
                              {isUploadingMore ? 'Uploading...' : 'Upload File'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Public Comments shared with IT Staff (Internal Notes are never shown to Requesters) */}
                    <PublicComments
                      ticketId={ticketDetail.id}
                      canPost={!['Closed', 'Cancelled'].includes(ticketDetail.status)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )
        )}
      </div>

      {/* Soft-removal with Reason Confirmation Modal */}
      {removingAttachment && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#006B3C' }}>Confirm Attachment Removal</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRemovingAttachment(null)}
                  disabled={isSubmittingRemoval}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-3 text-dark">
                  Are you sure you want to remove <strong>{removingAttachment.name}</strong>?
                </p>
                <div className="mb-2">
                  <label htmlFor="removalReasonInput" className="form-label fw-semibold">
                    Removal Reason <span className="text-danger">*</span>
                  </label>
                  <input
                    id="removalReasonInput"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Uploaded wrong file version"
                    value={removalReasonInput}
                    onChange={(e) => setRemovalReasonInput(e.target.value)}
                    autoFocus
                  />
                  <div className="form-text text-muted small">
                    This reason will be recorded and displayed permanently in the audit trail.
                  </div>
                  {removalError && <div className="text-danger small mt-2" role="alert">{removalError}</div>}
                </div>
              </div>
              <div className="modal-footer bg-light py-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setRemovingAttachment(null)}
                  disabled={isSubmittingRemoval}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-semibold"
                  disabled={isSubmittingRemoval || !removalReasonInput.trim()}
                  onClick={() => ticketDetail && handleConfirmRemove(ticketDetail.id)}
                >
                  {isSubmittingRemoval ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
