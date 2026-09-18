import React, { useState } from 'react';
import { login, UserProfile } from '../api';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  // Legacy support for Lab 2 test compatibility
  onSimulatedLogin?: (requesterId: number) => void;
  requesters?: Array<{ id: number; name: string; email: string }>;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSimulatedLogin, requesters = [] }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simulated login state for test compatibility
  const [simulatedId, setSimulatedId] = useState<number | ''>('');

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

  const handleSimulatedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (simulatedId && onSimulatedLogin) {
      onSimulatedLogin(Number(simulatedId));
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
          <h2 style={{ color: '#1A2F25', fontWeight: 700, margin: '0 0 0.5rem 0' }}>TokTickIT</h2>
          <p style={{ color: '#5C7164', fontSize: '0.9rem', margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        {/* Error Alert */}
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

        {/* Lab 2 Regression Compatibility: Simulated Requester Section */}
        {requesters && requesters.length > 0 && onSimulatedLogin && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed #E2E8F0', opacity: 0.85 }}>
            <p style={{ fontSize: '0.75rem', color: '#5C7164', marginBottom: '0.5rem', textAlign: 'center' }}>
              Development Requester Selector (Testing Context)
            </p>
            <form onSubmit={handleSimulatedSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="requesterSelect" style={{ fontSize: '0.8rem', color: '#1A2F25' }}>
                Simulate Login As:
              </label>
              <select
                id="requesterSelect"
                value={simulatedId}
                onChange={(e) => setSimulatedId(Number(e.target.value) || '')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">-- Choose Test Requester --</option>
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.name} ({req.email})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!simulatedId}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#EAF6EF',
                  color: '#006B3C',
                  border: '1px solid #006B3C',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: simulatedId ? 'pointer' : 'not-allowed'
                }}
              >
                Continue to Portal
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default Login;
