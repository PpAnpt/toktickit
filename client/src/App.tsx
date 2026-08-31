import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

interface Requester {
  id: number;
  name: string;
  email: string;
}

interface OptionItem {
  id: number;
  name: string;
}

interface AttachmentItem {
  id: number;
  originalFileName: string;
  storedFileName: string;
  size: number;
  mimeType: string;
  isRemoved: boolean;
  createdAt: string;
}

interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  status: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  category: OptionItem;
  relatedSystem: OptionItem;
  attachments: AttachmentItem[];
}

function App() {
  // Authentication & Navigation
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [currentRequesterId, setCurrentRequesterId] = useState<number | ''>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTab, setCurrentTab] = useState<'create' | 'my-tickets'>('create');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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

  // Ticket Detail State
  const [ticketDetail, setTicketDetail] = useState<TicketItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [isUploadingMore, setIsUploadingMore] = useState(false);

  // 1. ดึง Requesters
  useEffect(() => {
    fetch('http://localhost:3000/api/requesters')
      .then(res => res.json())
      .then(data => setRequesters(data))
      .catch(err => console.error('Failed to load requesters:', err));
  }, []);

  // 2. ดึง Categories & Systems เมื่อล็อกอิน
  useEffect(() => {
    if (isLoggedIn) {
      fetch('http://localhost:3000/api/categories')
        .then(res => res.json())
        .then(data => setCategories(data))
        .catch(err => console.error('Failed to load categories:', err));

      fetch('http://localhost:3000/api/related-systems')
        .then(res => res.json())
        .then(data => setRelatedSystems(data))
        .catch(err => console.error('Failed to load systems:', err));
    }
  }, [isLoggedIn]);

  // 3. ฟังก์ชันดึงรายการตั๋ว (My Tickets)
  const fetchTickets = useCallback(async () => {
    if (!isLoggedIn || !currentRequesterId) return;
    setIsLoadingTickets(true);
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

      const res = await fetch(`http://localhost:3000/api/tickets?${params.toString()}`, {
        headers: { 'X-Requester-Id': String(currentRequesterId) }
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.data || []);
        setTotalPages(data.meta.totalPages || 1);
        setTotalItems(data.meta.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [isLoggedIn, currentRequesterId, currentPage, search, filterCategory, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    if (currentTab === 'my-tickets' && selectedTicketId === null) {
      fetchTickets();
    }
  }, [currentTab, selectedTicketId, fetchTickets]);

  // 4. ฟังก์ชันดึงรายละเอียดตั๋ว (Ticket Detail)
  const fetchTicketDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    setDetailError('');
    try {
      const res = await fetch(`http://localhost:3000/api/tickets/${id}`, {
        headers: { 'X-Requester-Id': String(currentRequesterId) }
      });
      const data = await res.json();
      if (res.ok) {
        setTicketDetail(data);
      } else {
        setDetailError(data.error || 'Failed to load ticket details.');
      }
    } catch (err: any) {
      setDetailError(err.message || 'Network error.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [currentRequesterId]);

  useEffect(() => {
    if (selectedTicketId !== null) {
      fetchTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId, fetchTicketDetail]);

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
    try {
      const ticketRes = await fetch('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(currentRequesterId)
        },
        body: JSON.stringify({
          summary,
          description,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority: priority
        })
      });

      const ticketData = await ticketRes.json();
      if (!ticketRes.ok) throw new Error(ticketData.error || 'Failed to create ticket.');

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await fetch(`http://localhost:3000/api/tickets/${ticketData.id}/attachments`, {
            method: 'POST',
            headers: { 'X-Requester-Id': String(currentRequesterId) },
            body: formData
          });
        }
      }

      setSuccessMessage({ ticketNumber: ticketData.ticketNumber });
      setSummary('');
      setDescription('');
      setCategoryId('');
      setRelatedSystemId('');
      setPriority('MEDIUM');
      setSelectedFiles([]);
    } catch (err: any) {
      setApiError(err.message || 'Error creating ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ดาวน์โหลดไฟล์แนบ
  const handleDownloadAttachment = (ticketId: number, attachmentId: number, fileName: string) => {
    fetch(`http://localhost:3000/api/tickets/${ticketId}/attachments/${attachmentId}/download`, {
      headers: { 'X-Requester-Id': String(currentRequesterId) }
    })
      .then(response => {
        if (!response.ok) throw new Error('File download failed or file removed.');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert(err.message));
  };

  // ลบไฟล์แบบ Soft-remove
  const handleSoftRemoveAttachment = async (ticketId: number, attachmentId: number) => {
    if (!window.confirm('Are you sure you want to remove this attachment?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/tickets/${ticketId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'X-Requester-Id': String(currentRequesterId) }
      });
      if (res.ok) {
        fetchTicketDetail(ticketId); // โหลดข้อมูลใหม่
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove attachment.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // อัปโหลดไฟล์เพิ่มในหน้า Detail
  const handleAddMoreAttachments = async (ticketId: number) => {
    if (additionalFiles.length === 0) return;
    setIsUploadingMore(true);
    try {
      for (const file of additionalFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`http://localhost:3000/api/tickets/${ticketId}/attachments`, {
          method: 'POST',
          headers: { 'X-Requester-Id': String(currentRequesterId) },
          body: formData
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to upload attachment.');
        }
      }
      setAdditionalFiles([]);
      fetchTicketDetail(ticketId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingMore(false);
    }
  };

  const activeUser = requesters.find(r => r.id === Number(currentRequesterId));

  // --- 1. หน้า Login เลือก Requester ---
  if (!isLoggedIn) {
    return (
      <div className="container mt-5">
        <div className="card shadow-sm" style={{ maxWidth: '500px', margin: '0 auto', borderTop: '5px solid #006B3C' }}>
          <div className="card-header bg-white text-center py-4">
            <h2 className="h4 mb-0" style={{ color: '#006B3C' }}>TokTickIT Service Desk</h2>
            <p className="text-muted mt-2 mb-0">Development Requester Selection</p>
          </div>
          <div className="card-body p-4">
            <div className="mb-4">
              <label htmlFor="requesterSelect" className="form-label fw-bold">Simulate Login As:</label>
              <select
                id="requesterSelect"
                className="form-select form-select-lg"
                value={currentRequesterId}
                onChange={(e) => setCurrentRequesterId(Number(e.target.value))}
              >
                <option value="" disabled>-- Select a Requester --</option>
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>{req.name} ({req.email})</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-lg w-100 text-white fw-semibold"
              style={{ backgroundColor: '#006B3C' }}
              onClick={() => setIsLoggedIn(true)}
              disabled={currentRequesterId === ''}
            >
              Continue to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. หน้า Main Portal หลังล็อกอิน ---
  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Zen Green Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light shadow-sm">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4">TokTickIT</span>
          <div className="d-flex align-items-center">
            <div className="text-dark me-3 text-end d-none d-sm-block">
              <div className="fw-semibold">{activeUser?.name}</div>
              <small className="text-muted">{activeUser?.email}</small>
            </div>
            <button
              className="btn btn-outline-success btn-sm fw-bold"
              onClick={() => { setIsLoggedIn(false); setCurrentRequesterId(''); setSelectedTicketId(null); }}
            >
              Switch User
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        {/* Navigation Tabs */}
        <div className="d-flex border-bottom mb-4" style={{ borderColor: '#0B7A46' }}>
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
        </div>

        {/* TAB 1: CREATE TICKET */}
        {currentTab === 'create' && selectedTicketId === null && (
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
                      <label className="form-label fw-semibold">
                        Attachments <small className="text-muted fw-normal">(Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)</small>
                      </label>
                      <input
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

        {/* TAB 2: MY TICKETS LIST */}
        {currentTab === 'my-tickets' && selectedTicketId === null && (
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
                    <option value="New">New</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
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
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge text-white fw-bold px-2 py-1" style={{ backgroundColor: '#006B3C' }}>
                              {t.ticketNumber}
                            </span>
                            <span className={`badge ${t.requestedPriority === 'HIGH' ? 'bg-danger' : t.requestedPriority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
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

        {/* VIEW: TICKET DETAIL VIEW */}
        {selectedTicketId !== null && (
          <div>
            <button className="btn btn-outline-secondary btn-sm mb-3" onClick={() => setSelectedTicketId(null)}>
              &larr; Back to My Tickets
            </button>

            {isLoadingDetail ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success"></div>
              </div>
            ) : detailError ? (
              <div className="alert alert-danger">{detailError}</div>
            ) : ticketDetail ? (
              <div className="card shadow-sm border-0">
                <div className="card-header py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge text-white fs-6" style={{ backgroundColor: '#006B3C' }}>
                      {ticketDetail.ticketNumber}
                    </span>
                    <h5 className="mb-0 fw-bold" style={{ color: '#006B3C' }}>Ticket Details</h5>
                  </div>
                  <span className="badge bg-success fs-6">{ticketDetail.status}</span>
                </div>

                <div className="card-body p-4">
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
                                <span className="text-muted text-decoration-line-through">
                                  📄 {att.originalFileName} <span className="badge bg-secondary ms-2">Removed</span>
                                </span>
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
                                  onClick={() => handleSoftRemoveAttachment(ticketDetail.id, att.id)}
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
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
