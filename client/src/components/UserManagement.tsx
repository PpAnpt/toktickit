import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  type AdminUser,
  type UserProfile,
} from '../api';

interface UserManagementProps {
  currentUser: UserProfile;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'REQUESTER' as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR',
    initialPassword: '',
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'REQUESTER' as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR',
    isActive: true,
  });
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Load users
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminUsers({
        search: searchQuery,
        role: roleFilter,
      });
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.initialPassword.trim()) {
      setCreateError('All fields are required.');
      return;
    }

    if (createForm.initialPassword.length < 6) {
      setCreateError('Initial password must be at least 6 characters.');
      return;
    }

    setIsCreating(true);
    try {
      await createAdminUser(createForm);
      setSuccessMsg(`User ${createForm.name} created successfully!`);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        role: 'REQUESTER',
        initialPassword: '',
      });
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setEditError('');
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Name and email are required.');
      return;
    }

    setIsEditing(true);
    try {
      await updateAdminUser(editingUser.id, editForm);
      setSuccessMsg(`User ${editForm.name} updated successfully!`);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  // Open Reset Password Modal
  const openResetModal = (user: AdminUser) => {
    setResettingUser(user);
    setResetPasswordInput('');
    setResetError('');
  };

  // Handle Reset Password Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetError('');

    if (resetPasswordInput.length < 6) {
      setResetError('New initial password must be at least 6 characters.');
      return;
    }

    setIsResetting(true);
    try {
      await resetAdminUserPassword(resettingUser.id, resetPasswordInput);
      setSuccessMsg(`Password reset for ${resettingUser.name}. User must change password at next login.`);
      setResettingUser(null);
      loadUsers();
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return <span className="badge bg-danger">ADMINISTRATOR</span>;
      case 'IT_STAFF':
        return <span className="badge bg-primary">IT_STAFF</span>;
      case 'REQUESTER':
      default:
        return <span className="badge bg-secondary">REQUESTER</span>;
    }
  };

  return (
    <div className="container py-4">
      {/* Header & Title */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: '#006B3C' }}>
            User Management
          </h3>
          <p className="text-muted mb-0 small">
            Manage user accounts, roles, access statuses, and initial password resets.
          </p>
        </div>
        <button
          className="btn text-white fw-semibold px-3"
          style={{ backgroundColor: '#006B3C' }}
          onClick={() => {
            setIsCreateOpen(true);
            setCreateError('');
          }}
        >
          + Create New User
        </button>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')} aria-label="Close"></button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">🔍</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <label className="text-secondary small fw-semibold text-nowrap mb-0">Filter Role:</label>
                <select
                  className="form-select form-select-sm"
                  aria-label="Filter Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </div>
            </div>
            <div className="col-12 col-md-2 text-md-end text-muted small">
              Total: <strong>{users.length}</strong> accounts
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading users...</span>
              </div>
              <p className="text-muted mt-2">Loading user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="fs-5 mb-1">No users found</p>
              <small>Try adjusting your search query or role filter.</small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: '#EAF6EF' }}>
                  <tr>
                    <th className="py-3 px-4" style={{ color: '#006B3C' }}>Name</th>
                    <th className="py-3" style={{ color: '#006B3C' }}>Email</th>
                    <th className="py-3" style={{ color: '#006B3C' }}>Role</th>
                    <th className="py-3 text-center" style={{ color: '#006B3C' }}>Status</th>
                    <th className="py-3 text-center" style={{ color: '#006B3C' }}>1st Login Change</th>
                    <th className="py-3 px-4 text-end" style={{ color: '#006B3C' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id}>
                        <td className="px-4 py-3">
                          <div className="fw-semibold text-dark">
                            {u.name} {isSelf && <span className="badge bg-success-subtle text-success border ms-1">You</span>}
                          </div>
                          <small className="text-muted">ID: #{u.id}</small>
                        </td>
                        <td className="py-3 text-dark">{u.email}</td>
                        <td className="py-3">{getRoleBadge(u.role)}</td>
                        <td className="py-3 text-center">
                          {u.isActive ? (
                            <span className="badge rounded-pill" style={{ backgroundColor: '#006B3C' }}>
                              Active
                            </span>
                          ) : (
                            <span className="badge rounded-pill bg-secondary">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {u.mustChangePassword ? (
                            <span className="badge bg-warning text-dark">Required</span>
                          ) : (
                            <span className="text-muted small">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => openEditModal(u)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline-warning text-dark"
                              onClick={() => openResetModal(u)}
                            >
                              Reset Pass
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#006B3C' }}>Create New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createError && <div className="alert alert-danger mb-3 small">{createError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Full Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Alex Mercer"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Address <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g., alex.mercer@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Assigned Role <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Initial Temporary Password <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={createForm.initialPassword}
                      onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                      required
                    />
                    <div className="form-text text-muted small">
                      The user will be required to change this password upon their first login (AC-04, AC-22).
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm fw-semibold px-3"
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#006B3C' }}>Edit User Account</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingUser(null)}
                  disabled={isEditing}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4">
                  {editError && <div className="alert alert-danger mb-3 small">{editError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Full Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Address <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Role <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small d-block">Account Active Status</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="userActiveSwitch"
                        checked={editForm.isActive}
                        disabled={editingUser.id === currentUser.id}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="userActiveSwitch">
                        {editForm.isActive ? 'Active Account' : 'Inactive / Deactivated'}
                      </label>
                    </div>
                    {editingUser.id === currentUser.id ? (
                      <div className="form-text text-danger small">
                        ⚠️ Administrators cannot deactivate their own account (BR-19).
                      </div>
                    ) : (
                      <div className="form-text text-muted small">
                        Soft deactivation prevents login without deleting any ticket history or records (BR-18).
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setEditingUser(null)}
                    disabled={isEditing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm fw-semibold px-3"
                    disabled={isEditing}
                  >
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#006B3C' }}>Reset User Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResettingUser(null)}
                  disabled={isResetting}
                ></button>
              </div>
              <form onSubmit={handleResetSubmit}>
                <div className="modal-body p-4">
                  {resetError && <div className="alert alert-danger mb-3 small">{resetError}</div>}
                  <p className="text-dark mb-3">
                    Set a new initial password for <strong>{resettingUser.name}</strong> ({resettingUser.email}):
                  </p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">New Initial Password <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <div className="form-text text-muted small mt-2">
                      🔒 Setting a new password will automatically flag this account with <code>mustChangePassword=true</code>, forcing the user to change it on their next login (BR-21, AC-22).
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setResettingUser(null)}
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning btn-sm fw-semibold text-dark px-3"
                    disabled={isResetting}
                  >
                    {isResetting ? 'Resetting...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
