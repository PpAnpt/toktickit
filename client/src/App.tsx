import React, { useState, useEffect } from 'react';
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

function App() {
  // Authentication & State
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [currentRequesterId, setCurrentRequesterId] = useState<number | ''>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTab, setCurrentTab] = useState<'create' | 'my-tickets'>('create');

  // Form Reference Data
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<OptionItem[]>([]);

  // Form Fields
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [relatedSystemId, setRelatedSystemId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // UX & Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ ticketNumber: string } | null>(null);
  const [apiError, setApiError] = useState('');

  // 1. ดึง Requesters สำหรับหน้า Login
  useEffect(() => {
    fetch('http://localhost:3000/api/requesters')
      .then(res => res.json())
      .then(data => setRequesters(data))
      .catch(err => console.error('Failed to load requesters:', err));
  }, []);

  // 2. ดึง Categories และ Related Systems เมื่อล็อกอินสำเร็จ
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

  // จัดการการเลือกไฟล์แนบ
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
    e.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit ฟอร์มสร้างตั๋ว
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');
    setSuccessMessage(null);

    // Client-side Validation
    const newErrors: Record<string, string> = {};
    if (!summary.trim()) newErrors.summary = 'Summary is required.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!categoryId) newErrors.categoryId = 'Please select a Category.';
    if (!relatedSystemId) newErrors.relatedSystemId = 'Please select a Related System.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. สร้าง Ticket
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

      if (!ticketRes.ok) {
        throw new Error(ticketData.error || 'Failed to create ticket.');
      }

      // 2. อัปโหลดไฟล์แนบทีละไฟล์ (ถ้ามี)
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);

          await fetch(`http://localhost:3000/api/tickets/${ticketData.id}/attachments`, {
            method: 'POST',
            headers: {
              'X-Requester-Id': String(currentRequesterId)
            },
            body: formData
          });
        }
      }

      // 3. แจ้งเตือนสำเร็จและล้างฟอร์ม
      setSuccessMessage({ ticketNumber: ticketData.ticketNumber });
      setSummary('');
      setDescription('');
      setCategoryId('');
      setRelatedSystemId('');
      setPriority('MEDIUM');
      setSelectedFiles([]);
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while submitting the ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeUser = requesters.find(r => r.id === Number(currentRequesterId));

  // --- หน้า Login เลือก Requester ---
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
              className="btn btn-lg w-100 text-white"
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

  // --- หน้า Portal หลังล็อกอิน ---
  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Zen Green Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{ backgroundColor: '#006B3C' }}>
        <div className="container">
          <span className="navbar-brand fw-bold fs-4">TokTickIT</span>
          <div className="d-flex align-items-center">
            <div className="text-white me-3 text-end d-none d-sm-block">
              <div className="fw-semibold">{activeUser?.name}</div>
              <small className="opacity-75">{activeUser?.email}</small>
            </div>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => { setIsLoggedIn(false); setCurrentRequesterId(''); }}
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
            className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'create' ? 'border-bottom border-3' : 'text-secondary'}`}
            style={{ color: currentTab === 'create' ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
            onClick={() => setCurrentTab('create')}
          >
            Create Ticket
          </button>
          <button
            className={`btn btn-link text-decoration-none pb-2 px-3 fw-bold ${currentTab === 'my-tickets' ? 'border-bottom border-3' : 'text-secondary'}`}
            style={{ color: currentTab === 'my-tickets' ? '#006B3C' : '#6c757d', borderColor: '#006B3C', borderRadius: 0 }}
            onClick={() => setCurrentTab('my-tickets')}
          >
            My Tickets
          </button>
        </div>

        {/* Tab 1: Create Ticket Form */}
        {currentTab === 'create' && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                  <h4 className="mb-0 fw-bold" style={{ color: '#006B3C' }}>Create New Support Ticket</h4>
                </div>

                <div className="card-body p-4">
                  {/* Alert ข้อความสำเร็จ */}
                  {successMessage && (
                    <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                      <div>
                        🎉 Ticket created successfully! Your Ticket Number is:{' '}
                        <strong>{successMessage.ticketNumber}</strong>
                      </div>
                    </div>
                  )}

                  {/* Alert ข้อผิดพลาดจาก API */}
                  {apiError && (
                    <div className="alert alert-danger mb-4" role="alert">
                      {apiError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    {/* Category & Related System Dropdowns */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Category <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                          value={categoryId}
                          onChange={(e) => setCategoryId(Number(e.target.value) || '')}
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Related System <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.relatedSystemId ? 'is-invalid' : ''}`}
                          value={relatedSystemId}
                          onChange={(e) => setRelatedSystemId(Number(e.target.value) || '')}
                        >
                          <option value="">-- Select Related System --</option>
                          {relatedSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {errors.relatedSystemId && <div className="invalid-feedback">{errors.relatedSystemId}</div>}
                      </div>
                    </div>

                    {/* Priority Selector */}
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

                    {/* Summary Input */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Summary <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.summary ? 'is-invalid' : ''}`}
                        placeholder="Brief summary of the issue"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                      />
                      {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
                    </div>

                    {/* Description Textarea */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        placeholder="Detailed description of what happened..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>

                    {/* File Attachments */}
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

                      {/* File List Preview */}
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
                                onClick={() => removeFile(idx)}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Submit Button */}
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

        {/* Tab 2: My Tickets Placeholder (เตรียมไว้สำหรับ Issue 4) */}
        {currentTab === 'my-tickets' && (
          <div className="card shadow-sm border-0 p-5 text-center">
            <h5 className="text-muted">My Tickets screen will be implemented in Issue 4.</h5>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
