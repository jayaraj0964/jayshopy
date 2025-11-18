// src/pages/PaymentReturnPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://jayshoppy3-backend-1.onrender.com/api';
const getToken = () => localStorage.getItem('token');

export default function PaymentReturnPage() {
  const navigate = useNavigate();
  const location = useLocation(); // ← ADDED (better than window.location)
  
  const [orderIdParam, setOrderIdParam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  
  const pollingRef = useRef(null);
  const hasCheckedRef = useRef(false); // ← PREVENT DOUBLE CHECK

  // Normalize Order ID (handles ORD_123 or 123)
  const normalizeOrderId = (oid) => {
    if (!oid) return null;
    return String(oid).replace(/^ORD_/, '').trim();
  };

  // Main status check
  const checkStatus = async (rawOrderId) => {
    if (!rawOrderId || hasCheckedRef.current) return;
    
    hasCheckedRef.current = true;
    setLoading(true);
    setError('');

    try {
      const idForApi = normalizeOrderId(rawOrderId);
      if (!idForApi || isNaN(idForApi)) {
        throw new Error('Invalid Order ID');
      }

      const token = getToken();
      const res = await fetch(`${API_URL}/user/order-status/${idForApi}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Session expired. Login again');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch status');
      }

      const data = await res.json();
      const currentStatus = (data.status || '').toUpperCase();

      setStatus(currentStatus);
      setTransactionId(data.transactionId || data.transaction_id || '');

      if (currentStatus === 'PAID') {
        toast.success('Payment Successful!');
        stopPolling();
        navigate('/order-success', {
          state: { orderId: idForApi, transactionId: data.transactionId || '' },
          replace: true
        });
      } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(currentStatus)) {
        setError(`Payment ${currentStatus.toLowerCase()}`);
        toast.error(`Payment ${currentStatus.toLowerCase()}`);
        stopPolling();
      } else {
        // Still PENDING → start polling
        startPolling(idForApi);
      }
    } catch (err) {
      console.error('Status check failed:', err);
      setError('Unable to verify payment. Try refreshing or check Orders.');
      toast.error('Status check failed');
    } finally {
      setLoading(false);
    }
  };

  // Short polling (max 2 minutes)
  const startPolling = (idForApi) => {
    stopPolling(); // clear any old
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes

    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/user/order-status/${idForApi}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error('poll failed');
        const data = await res.json();
        const st = (data.status || '').toUpperCase();

        if (st === 'PAID') {
          stopPolling();
          toast.success('Payment Confirmed!');
          navigate('/order-success', {
            state: { orderId: idForApi, transactionId: data.transactionId || '' },
            replace: true
          });
        } else if (['FAILED', 'CANCELLED'].includes(st)) {
          stopPolling();
          setError('Payment failed');
          toast.error('Payment failed');
        } else if (attempts >= maxAttempts) {
          stopPolling();
          setError('Payment taking longer than usual. Check Orders page.');
          toast('Still processing...', { icon: '⏳' });
        }
      } catch (e) {
        console.warn('Polling error, retrying...');
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Extract orderId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oid = params.get('orderId') || params.get('order_id') || params.get('order');
    
    if (!oid) {
      setError('No order ID found in URL');
      setLoading(false);
      toast.error('Invalid return URL');
      return;
    }

    setOrderIdParam(oid);
    checkStatus(oid);

    return () => {
      stopPolling();
      hasCheckedRef.current = true;
    };
  }, [location]);

  const handleManualCheck = () => {
    if (orderIdParam) {
      hasCheckedRef.current = false;
      checkStatus(orderIdParam);
    }
  };

  return (
    <div className="payment-return-container">
      <div className="payment-card">
        <h1>Verifying Payment...</h1>

        {loading && <p>Please wait while we confirm your payment</p>}
        
        {status && !loading && (
          <div className="status-box">
            <p>Status: <strong>{status}</strong></p>
            {transactionId && <p>Transaction ID: <strong>{transactionId}</strong></p>}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="actions">
          <button onClick={handleManualCheck} className="btn" disabled={loading}>
            {loading ? 'Checking...' : 'Re-check Status'}
          </button>
          <button onClick={() => navigate('/orders')} className="btn-secondary">
            View My Orders
          </button>
        </div>

        <p className="info">
          Paid successfully? We'll redirect you in a few seconds.<br />
          If stuck, use "Re-check Status" or check your Orders.
        </p>
      </div>
    </div>
  );
}