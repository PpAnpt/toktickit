import React, { useState } from 'react';
import { login, type UserProfile } from '../api';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  // Informational message, e.g. after logout or an expired session
  notice?: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, notice }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(email.trim(), password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="login-container" style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="login-card" style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        padding: '2.5rem',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#006B3C',
            color: '#FFFFFF',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.75rem'
          }}>
            T
          </div>
          <h2 style={{ color: '#1A2F25', fontWeight: 700, margin: '0 0 0.25rem 0' }}>TokTickIT</h2>
          <h3 style={{ color: '#5C7164', fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>TokTickIT Service Desk</h3>
          <p style={{ color: '#5C7164', fontSize: '0.9rem', margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        {/* Error Alert */}
        {notice && !error && (
          <div role="status" style={{
            backgroundColor: '#EAF6EF',
            border: '1px solid #0B7A46',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#006B3C',
            fontSize: '0.85rem'
          }}>
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #F87171',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#B30000',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{
              display: 'block',
              color: '#1A2F25',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.375rem'
            }}>
              Email Address <span style={{ color: '#B30000' }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah.connor@example.com"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{
              display: 'block',
              color: '#1A2F25',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.375rem'
            }}>
              Password <span style={{ color: '#B30000' }}>*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
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
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'background-color 0.2s',
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  );
};
export default Login;
