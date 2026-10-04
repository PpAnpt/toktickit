import React, { useState } from 'react';
import { changePassword } from '../api';
import { passwordPolicyError, PASSWORD_RULE_TEXT } from '../validation';

interface ChangePasswordProps {
  onPasswordChanged: () => void;
  userEmail?: string;
  // When provided, the dialog is a voluntary password change that can be cancelled.
  // Without it, the dialog is the mandatory first-login change and cannot be dismissed.
  onCancel?: () => void;
}


export const ChangePassword: React.FC<ChangePasswordProps> = ({ onPasswordChanged, userEmail, onCancel }) => {
  const isMandatory = !onCancel;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required.');
      return;
    }

    const policyError = passwordPolicyError(newPassword, 'New password');
    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      onPasswordChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(26, 47, 37, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            fontSize: '1.25rem',
            marginBottom: '0.75rem'
          }}>
            🔒
          </div>
          <h3 id="change-password-title" style={{ margin: '0 0 0.5rem 0', color: '#1A2F25', fontWeight: 700 }}>
            Change Your Password
          </h3>
          <p style={{ margin: 0, color: '#5C7164', fontSize: '0.875rem' }}>
            {userEmail ? `Signed in as ${userEmail}. ` : ''}
            {isMandatory
              ? 'You are signing in with an initial password. You must set a new password before entering the application.'
              : 'Your other signed-in sessions will be signed out after the change.'}
          </p>
        </div>

        {error && (
          <div role="alert" style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #F87171',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#B30000',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="currentPassword" style={{
              display: 'block',
              color: '#1A2F25',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.375rem'
            }}>
              {isMandatory ? 'Current Initial Password' : 'Current Password'} <span style={{ color: '#B30000' }}>*</span>
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="newPassword" style={{
              display: 'block',
              color: '#1A2F25',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.375rem'
            }}>
              New Password (min 8 characters) <span style={{ color: '#B30000' }}>*</span>
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter at least 8 characters"
              disabled={isLoading}
              aria-describedby="newPasswordHelp"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
            <div id="newPasswordHelp" style={{ color: '#5C7164', fontSize: '0.78rem', marginTop: '0.3rem' }}>
              {PASSWORD_RULE_TEXT}.
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="confirmPassword" style={{
              display: 'block',
              color: '#1A2F25',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.375rem'
            }}>
              Confirm New Password <span style={{ color: '#B30000' }}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              backgroundColor: '#006B3C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Saving New Password...' : 'Save New Password'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                color: '#1A2F25',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '0.65rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
export default ChangePassword;
