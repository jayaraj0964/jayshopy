// src/components/PrivateRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, adminOnly = false }) {
  const [status, setStatus] = useState('checking'); // checking | login | home | admin

  useEffect(() => {
    const token = localStorage.getItem('token');

    // 1. NO TOKEN → LOGIN
    if (!token) {
      setStatus('login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;

      // 2. ADMIN ONLY ROUTE
      if (adminOnly) {
        if (role === 'ROLE_ADMIN') {
          setStatus('admin');
        } else {
          setStatus('home'); // USER → HOME
        }
      } else {
        setStatus('admin'); // Normal route → allow
      }
    } catch (e) {
      console.error("Invalid token:", e);
      localStorage.removeItem('token');
      setStatus('login');
    }
  }, [adminOnly]);

  // IMMEDIATE REDIRECT – NO RENDER
  if (status === 'login') return <Navigate to="/login" replace />;
  if (status === 'home') return <Navigate to="/" replace />;
  if (status === 'checking') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontFamily: 'Arial', color: '#555'
      }}>
        <p>Verifying access...</p>
      </div>
    );
  }

  // ONLY ADMIN REACHES HERE
  return children;
}