// src/pages/PaymentReturnPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const getToken = () => localStorage.getItem('token');

export default function PaymentReturnPage() {
  const navigate = useNavigate();
  const [orderIdParam, setOrderIdParam] = useState(null);     // can be "ORD_123" or "123"
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('orderId') || params.get('order_id') || params.get('order');
    if (!oid) {
      setError('Order ID missing in return URL');
      return;
    }
    setOrderIdParam(oid);
    // immediately check once
    checkStatus(oid);
    // eslint-disable-next-line
  }, []);

  const normalizeOrderId = (oid) => {
    if (!oid) return null;
    if (typeof oid === 'string' && oid.startsWith('ORD_')) {
      // if your backend endpoints expect numeric ID, strip prefix
      const maybe = oid.replace(/^ORD_/, '');
      return maybe;
    }
    return oid;
  };

  const checkStatus = async (oid) => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const idForApi = normalizeOrderId(oid);
      const res = await fetch(`${API_URL}/user/order-status/${idForApi}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(data.status || '');
      setTransactionId(data.transactionId || data.transaction_id || '');
      if ((data.status || '').toUpperCase() === 'PAID') {
        toast.success('Payment confirmed');
        // navigate to success page showing transaction id
        navigate('/order-success', { state: { orderId: idForApi, transactionId: (data.transactionId || data.transaction_id || '') } });
        return;
      }
      if ((data.status || '').toUpperCase() === 'FAILED') {
        setError('Payment failed. Please try again or contact support.');
      } else if ((data.status || '').toUpperCase() === 'PENDING') {
        // start short polling for a minute
        startShortPolling(idForApi);
      } else {
        // unknown state
        setError('Unable to determine payment status yet. Please re-check.');
      }
    } catch (err) {
      console.error('checkStatus error', err);
      setError('Could not check payment status right now');
    } finally {
      setLoading(false);
    }
  };

  const startShortPolling = (idForApi) => {
    if (pollingRef.current) return;
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/user/order-status/${idForApi}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('non-ok');
        const data = await res.json();
        setStatus(data.status || '');
        setTransactionId(data.transactionId || data.transaction_id || '');
        if ((data.status || '').toUpperCase() === 'PAID') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          toast.success('Payment confirmed');
          navigate('/order-success', { state: { orderId: idForApi, transactionId: (data.transactionId || data.transaction_id || '') } });
        } else if ((data.status || '').toUpperCase() === 'FAILED') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setError('Payment failed. Please try again.');
        } else if (attempts >= 20) { // ~1 minute at 3s interval
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setError('Payment still pending. Please check Orders page later.');
        }
      } catch (err) {
        console.error('poll err', err);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleManualRecheck = () => {
    if (!orderIdParam) return;
    checkStatus(orderIdParam);
  };

  const handleOpenOrders = () => {
    navigate('/orders'); // or your orders page
  };

  return (
    <div className="payment-return-container">
      <h1>Payment status</h1>
      {loading && <p>Checking payment status…</p>}
      {status && <p>Status: <strong>{status}</strong></p>}
      {transactionId && <p>Transaction ID: <strong>{transactionId}</strong></p>}
      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button onClick={handleManualRecheck} className="btn">Re-check status</button>
        <button onClick={handleOpenOrders} className="btn-secondary">View Orders</button>
      </div>

      <p>If you paid but status is not updated, keep this page open or contact support with the UPI transaction id.</p>
    </div>
  );
}
