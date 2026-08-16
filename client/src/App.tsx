import { useState } from 'react'
import './App.css'
interface Category {
  id: number;
  name: string;
}

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'online' | 'offline'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);

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
        // เพิ่มส่วนนี้เพื่อดึงข้อมูล Categories
        const catResponse = await fetch('http://localhost:3000/api/categories');
        if (catResponse.ok) {
          const catData = await catResponse.json();
          setCategories(catData);
        }
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
              {status === 'online' && categories.length > 0 && (
                <div className="mt-4 text-start">
                  <h6>IT Request Categories:</h6>
                  <ul className="list-group">
                    {categories.map((cat) => (
                      <li key={cat.id} className="list-group-item d-flex align-items-center">
                        <span className="badge bg-secondary me-3">{cat.id}</span>
                        {cat.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}


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
