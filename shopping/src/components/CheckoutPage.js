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
  const [orderId, setOrderId] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isPolling, setIsPolling] = useState(false);
  const [amountToPay, setAmountToPay] = useState(0);

  // Refs
  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // API
  const API_URL = process.env.REACT_APP_API_URL || 'https://jayshoppy3-backend-1.onrender.com/api';
  const getToken = () => localStorage.getItem('token');

  // Load cart on mount
  useEffect(() => {
    loadCart();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (showPaymentScreen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showPaymentScreen && timeLeft === 0) {
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(err.message || 'Failed to load cart');
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
      setError('Please fill all required fields');
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Invalid phone number');
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
      if (!token) throw new Error('Session expired. Please login again.');

      // 1. Create Order
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
      const dbOrderId = orderData.orderId;

      // 2. Create UPI Payment
      const paymentRes = await fetch(`${API_URL}/user/create-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: dbOrderId, shippingAddress })
      });

      if (!paymentRes.ok) throw new Error(await paymentRes.text());
      const paymentData = await paymentRes.json();

      const amount = paymentData.amount || orderData.amount || cart?.totalPrice || 0;
      const finalOrderId = paymentData.orderId || dbOrderId;

      setAmountToPay(amount);
      setOrderId(finalOrderId);
      setQrUrl(paymentData.qrCodeUrl || '');
      setShowPaymentScreen(true);
      setTimeLeft(300);
      startPolling(finalOrderId);

      toast.success('QR Generated! Scan & Pay');
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Payment setup failed');
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
          if (res.status === 401) {
            stopPolling();
            toast.error('Session expired');
            navigate('/login');
            return;
          }
          throw new Error(await res.text());
        }

        const data = await res.json();
        const status = (data.status || '').toUpperCase();

        if (status === 'PAID') {
          stopPolling();
          updateCartCount();
          toast.success('Payment Successful!');
          const tx = data.transactionId || data.transaction_id || '';
          navigate('/order-success', { state: { orderId: apiId, transactionId: tx } });
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
          stopPolling();
          setError(`Payment ${status.toLowerCase()}`);
          toast.error(`Payment ${status.toLowerCase()}`);
          setShowPaymentScreen(false);
        }
      } catch (err) {
        console.warn('Polling retrying...', err.message);
      }
    }, 3000);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      handleTimeout();
    }, 300000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollIntervalRef.current = null;
    timeoutRef.current = null;
    setIsPolling(false);
  };

  const handleTimeout = () => {
    stopPolling();
    setError('Payment timed out. Please try again.');
    toast.error('Payment timed out');
    setShowPaymentScreen(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Loading & Empty States
  if (loading) return <div className="loading">Loading cart...</div>;
  if (!cart?.items?.length) return <div className="empty">Your cart is empty</div>;

  const cartTotal = cart.totalPrice || 0;

  // Checkout Form
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
              <input name="street" placeholder="Street Address *" value={address.street} onChange={handleInput} required />
              <input name="landmark" placeholder="Landmark (Optional)" value={address.landmark} onChange={handleInput} />
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

  // QR Payment Screen
  return (
    <div className="payment-screen">
      <div className="payment-card">
        <h2>Scan QR to Pay</h2>
        <p>Amount: <strong>₹{Number(amountToPay).toFixed(2)}</strong></p>

        <div className="qr-container">
          {qrUrl ? (
            <img src={qrUrl} alt="Scan to Pay" className="qr-img" />
          ) : (
            <div className="no-qr">Generating QR Code...</div>
          )}
        </div>

        <p className="scan-text">Scan with <strong>PhonePe • GPay • Paytm</strong></p>

        <div className="timer">
          <div className="time-circle">{formatTime(timeLeft)}</div>
          <p>Time remaining</p>
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
            {isPolling ? 'Checking...' : 'Check Status'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => window.location.href = `/payment-return?orderId=${encodeURIComponent(orderId)}`}
          >
            Open Return Page
          </button>

          <button
            className="btn-ghost"
            onClick={() => {
              if (qrUrl) {
                navigator.clipboard.writeText(qrUrl);
                toast.success('QR Link Copied!');
              }
            }}
          >
            Copy QR Link
          </button>
        </div>

        <p className="warning">Do not refresh or close this page</p>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutForm />;
}