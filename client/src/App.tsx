import { useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'online' | 'offline'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const checkSystem = async () => {
    setStatus('loading');
    setErrorMsg('');
    
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        throw new Error('Unable to connect to TokTickIT API');
      }
      const data = await response.json();
      if (data.status === 'ok') {
        setStatus('online');
      } else {
        setStatus('offline');
        setErrorMsg('API returned an unexpected response');
      }
    } catch (error: any) {
      setStatus('offline');
      setErrorMsg(error.message || 'Unable to connect to TokTickIT API');
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card-header bg-primary text-white">
          <h2 className="h4 mb-0">TokTickIT IT Service Desk</h2>
        </div>
        <div className="card-body text-center py-5">
          <button 
            className="btn btn-lg btn-outline-primary mb-4" 
            onClick={checkSystem}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading...
              </>
            ) : (
              '[ Check System ]'
            )}
          </button>

          {status !== 'idle' && status !== 'loading' && (
            <div className={`alert ${status === 'online' ? 'alert-success' : 'alert-danger'} text-start`} role="alert">
              <h5 className="alert-heading">
                System Status: <strong>{status === 'online' ? 'Online' : 'Offline'}</strong>
              </h5>
              
              {status === 'offline' && (
                <p className="mb-0 mt-2">{errorMsg}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
