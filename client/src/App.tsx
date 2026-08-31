import { useState, useEffect } from 'react';
import './App.css'; // แน่ใจว่าไฟล์นี้มีอยู่เพื่อใส่สี Zen Green ภายหลัง

interface Requester {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ดึงรายชื่อจาก API ทันทีที่เปิดหน้าเว็บ
  useEffect(() => {
    const fetchRequesters = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/requesters');
        if (response.ok) {
          const data = await response.json();
          setRequesters(data);
        }
      } catch (error) {
        console.error('Failed to fetch requesters:', error);
      }
    };
    fetchRequesters();
  }, []);

  const handleLogin = () => {
    if (selectedId !== '') {
      // ในอนาคตเราอาจจะเซฟลง localStorage แต่วันนี้เอาแค่ State ก่อน
      setIsLoggedIn(true);
    }
  };

  // ถ้าเลือกล็อกอินแล้ว (จะทำ UI ของจริงใน Issue หน้า)
  if (isLoggedIn) {
    const activeUser = requesters.find(r => r.id === Number(selectedId));
    return (
      <div className="container mt-5 text-center">
        <h2>Welcome, {activeUser?.name}!</h2>
        <p className="text-muted">{activeUser?.email}</p>
        <button className="btn btn-secondary mt-3" onClick={() => setIsLoggedIn(false)}>
          Logout (Change User)
        </button>
      </div>
    );
  }

  // หน้าจอเลือก Requester (ก่อนล็อกอิน)
  return (
    <div className="container mt-5">
      <div className="card shadow-sm" style={{ maxWidth: '500px', margin: '0 auto', borderTop: '5px solid #006B3C' }}>
        <div className="card-header bg-white text-center py-4">
          <h2 className="h4 mb-0" style={{ color: '#006B3C' }}>TokTickIT Service Desk</h2>
          <p className="text-muted mt-2 mb-0">Development Requester Selection</p>
        </div>

        <div className="card-body p-4">
          <div className="mb-4">
            <label htmlFor="requesterSelect" className="form-label fw-bold">
              Simulate Login As:
            </label>
            <select
              id="requesterSelect"
              className="form-select form-select-lg"
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              <option value="" disabled>-- Select a Requester --</option>
              {requesters.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.name} ({req.email})
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-lg w-100 text-white"
            style={{ backgroundColor: '#006B3C' }}
            onClick={handleLogin}
            disabled={selectedId === ''}
          >
            Continue to Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
