// src/pages/CheckoutPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './CheckoutPage.css';

function CheckoutForm() {
  const { updateCartCount } = useAuth();
  const navigate = useNavigate();

  // CART
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ADDRESS
  const [address, setAddress] = useState({
    fullName: '', phone: '', street: '', city: '', state: '', pincode: '', landmark: ''
  });

  // PAYMENT STATE
  const [orderId, setOrderId] = useState(null);           // DB ID or ORD_123
  const [qrUrl, setQrUrl] = useState('');
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);         // 5 min
  const [isPolling, setIsPolling] = useState(false);
  const [amountToPay, setAmountToPay] = useState(0);

  // Refs
  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // API
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
  const getToken = () => localStorage.getItem('token');

  // Load cart
  useEffect(() => {
    loadCart();
    return () => stopPolling();
  }, []);

  // Countdown
  useEffect(() => {
    if (showPaymentScreen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showPaymentScreen && timeLeft === 0) {
      handleTimeout();
    }
  }, [showPaymentScreen, timeLeft]);

  const loadCart = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Please login');

      const res = await fetch(`${API_URL}/user/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCart(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const validateAddress = () => {
    const { fullName, phone, street, city, state, pincode } = address;
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      setError('Fill all required fields');
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Invalid phone');
      return false;
    }
    if (!/^\d{6}$/.test(pincode)) {
      setError('Invalid pincode');
      return false;
    }
    setError(null);
    return true;
  };

  // PAY NOW
  const payNow = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    const shippingAddress = `${address.fullName}, ${address.phone}, ${address.street}${address.landmark ? ', ' + address.landmark : ''}, ${address.city}, ${address.state} - ${address.pincode}`;

    try {
      const token = getToken();
      if (!token) throw new Error('Login expired');

      // 1. Create order
      const orderRes = await fetch(`${API_URL}/user/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingAddress })
      });

      if (!orderRes.ok) throw new Error(await orderRes.text());
      const orderData = await orderRes.json();
      const dbOrderId = orderData.orderId; // numeric or ORD_123

      // 2. Create UPI payment
      const paymentRes = await fetch(`${API_URL}/user/create-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: dbOrderId,
          shippingAddress
        })
      });

      if (!paymentRes.ok) throw new Error(await paymentRes.text());
      const paymentData = await paymentRes.json();

      // Set amount
      const amount = paymentData.amount || orderData.amount || cart.totalPrice;
      setAmountToPay(amount);

      // Use orderId from backend
      const finalOrderId = paymentData.orderId || dbOrderId;
      setOrderId(finalOrderId);
      setQrUrl(paymentData.qrCodeUrl || paymentData.qr_url);
      setShowPaymentScreen(true);
      setTimeLeft(300);

      // Start polling
      startPolling(finalOrderId);

      toast.success('QR Generated! Scan to pay');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  // POLLING
  const startPolling = (id) => {
    if (isPolling) return;
    setIsPolling(true);

    const token = getToken();
    const apiId = String(id).replace(/^ORD_/, '');

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/user/order-status/${apiId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 401) {
            stopPolling();
            toast.error('Session expired');
            navigate('/login');
            return;
          }
          throw new Error(text);
        }

        const data = await res.json();
        const status = (data.status || '').toUpperCase();

        console.log('Poll status:', status);

        if (status === 'PAID') {
          stopPolling();
          updateCartCount();
          toast.success('Payment successful!');
          const tx = data.transactionId || data.transaction_id || '';
          navigate('/order-success', {
            state: { orderId: apiId, transactionId: tx }
          });
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
          stopPolling();
          setError(`Payment ${status.toLowerCase()}`);
          toast.error(`Payment ${status.toLowerCase()}`);
          setShowPaymentScreen(false);
        }
      } catch (err) {
        console.warn('Polling error (retrying):', err.message);
        // Keep polling
      }
    }, 3000);

    // Safety timeout
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      handleTimeout();
    }, 300000); // 5 min
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPolling(false);
  };

  const handleTimeout = () => {
    stopPolling();
    setError('Payment timed out. Try again.');
    toast.error('Payment timed out');
    setShowPaymentScreen(false);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // UI
  if (loading) return <div className="loading">Loading cart...</div>;
  if (!cart?.items?.length) return <div className="empty">Cart is empty</div>;

  const cartTotal = cart.totalPrice || 0;

  // FORM
  if (!showPaymentScreen) {
    return (
      <div className="checkout-container">
        <h1>Checkout</h1>
        <div className="checkout-grid">
          <div className="form-section">
            <h2>Delivery Address</h2>
            <form onSubmit={payNow}>
              <input name="fullName" placeholder="Full Name *" value={address.fullName} onChange={handleInput} required />
              <input name="phone" placeholder="Phone *" value={address.phone} onChange={handleInput} required />
              <input name="street" placeholder="Street *" value={address.street} onChange={handleInput} required />
              <input name="landmark" placeholder="Landmark" value={address.landmark} onChange={handleInput} />
              <div className="row">
                <input name="city" placeholder="City *" value={address.city} onChange={handleInput} required />
                <input name="state" placeholder="State *" value={address.state} onChange={handleInput} required />
              </div>
              <input name="pincode" placeholder="Pincode *" value={address.pincode} onChange={handleInput} required />

              <button type="submit" className="pay-btn-final">
                Pay ₹{cartTotal.toFixed(2)} via QR
              </button>
              {error && <div className="error">{error}</div>}
            </form>
          </div>

          <div className="summary">
            <h2>Order Summary</h2>
            {cart.items.map(item => (
              <div key={item.id} className="item">
                <span>{item.productName} × {item.quantity}</span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="total">
              <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR SCREEN
  return (
    <div className="payment-screen">
      <div className="payment-card">
        <h2>Scan QR to Pay</h2>
        <p>Amount: <strong>₹{Number(amountToPay).toFixed(2)}</strong></p>

        <div className="qr-container">
          {qrUrl ? (
            <img src={qrUrl} alt="Scan QR" className="qr-img" />
          ) : (
            <div className="no-qr">Generating QR...</div>
          )}
        </div>

        <p className="scan-text">Scan with <strong>PhonePe / GPay / Paytm</strong></p>

        <div className="timer">
          <div className="time-circle">{formatTime(timeLeft)}</div>
          <p>Time left</p>
        </div>

        <div className="qr-actions">
          <button
            className="btn"
            onClick={() => {
              const apiId = String(orderId).replace(/^ORD_/, '');
              if (apiId && !isPolling) startPolling(apiId);
            }}
            disabled={isPolling}
          >
            {isPolling ? 'Checking...' : 'Re-check'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              window.location.href = `/payment-return?orderId=${encodeURIComponent(orderId)}`;
            }}
          >
            Open Return Page
          </button>

          <button
            className="btn-ghost"
            onClick={() => {
              if (qrUrl) {
                navigator.clipboard.writeText(qrUrl);
                toast.success('QR link copied!');
              }
            }}
          >
            Copy QR Link
          </button>
        </div>

        <p className="warning">Do not refresh or go back</p>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutForm />;
}