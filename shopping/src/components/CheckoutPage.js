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

  // PAYMENT UI state
  const [orderId, setOrderId] = useState(null);          // ORD_123 or numeric id
  const [qrUrl, setQrUrl] = useState('');
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);         // countdown in seconds
  const [isPolling, setIsPolling] = useState(false);
  const [amountToPay, setAmountToPay] = useState(0);     // amount from backend (rupees)

  // timers/interval refs
  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // API config
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    loadCart();
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showPaymentScreen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showPaymentScreen && timeLeft === 0) {
      setError('Payment timeout. Please try again.');
      toast.error('Payment timeout. Please try again.');
      stopPolling();
      setShowPaymentScreen(false);
    }
  }, [showPaymentScreen, timeLeft]);

  // LOAD CART
  const loadCart = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Please login to continue');
      }

      const res = await fetch(`${API_URL}/user/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCart(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // Address handlers
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

  // PAY NOW → CREATE ORDER + GET QR FROM BACKEND
  const payNow = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    const shippingAddress = `${address.fullName}, ${address.phone}, ${address.street}, ${address.landmark ? address.landmark + ', ' : ''}${address.city}, ${address.state} - ${address.pincode}`;

    try {
      const token = getToken();
      if (!token) throw new Error('Please login to continue');

      // 1) CREATE ORDER on backend (your API should return numeric db id or ORD_ prefixed id)
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
      const newOrderId = orderData.orderId; // can be numeric or "ORD_123"
      const backendCheckoutAmount = typeof orderData.amount === 'number' ? orderData.amount : null;

      // 2) ASK BACKEND TO CREATE CASHFREE ORDER / RETURN QR
      const paymentRes = await fetch(`${API_URL}/user/create-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: newOrderId,
          shippingAddress
        })
      });

      if (!paymentRes.ok) throw new Error(await paymentRes.text());
      const paymentData = await paymentRes.json();

      // Use backend amount (single source of truth)
      setAmountToPay(typeof paymentData.amount === 'number' ? paymentData.amount : (backendCheckoutAmount ?? (cart?.totalPrice || 0)));

      // store orderId used for polling (prefer backend returned one)
      const returnedOrderId = paymentData.orderId || newOrderId;
      setOrderId(returnedOrderId);
      setQrUrl(paymentData.qrCodeUrl);
      setShowPaymentScreen(true);
      setTimeLeft(300);

      // Start polling for payment status (pass DB id or ORD_ id as your /order-status expects)
      startPolling(returnedOrderId);

      toast.success('QR Generated! Scan to pay');
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment failed');
      toast.error(err.message || 'Payment failed');
    }
  };

  // POLLING
  const startPolling = (id) => {
    if (isPolling && pollIntervalRef.current) return;
    setIsPolling(true);

    const token = getToken();

    // Normalize id for API call: strip ORD_ if backend expects numeric id
    const apiId = String(id).replace(/^ORD_/, '');

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/user/order-status/${apiId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        console.log('Polling status:', data.status);

        const status = (data.status || '').toUpperCase();

        if (status === 'PAID') {
          stopPolling();
          updateCartCount();
          toast.success('Payment successful!');
          const tx = data.transactionId || data.transaction_id || '';
          setShowPaymentScreen(false);
          navigate('/order-success', { state: { orderId: apiId, transactionId: tx } });
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          stopPolling();
          setError(status === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed');
          toast.error(status === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed');
          setShowPaymentScreen(false);
        }
        // otherwise keep polling
      } catch (err) {
        console.error('Polling error:', err);
        // ignore transient errors; keep polling
      }
    }, 3000);

    // Stop polling after 5 minutes (safety)
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setShowPaymentScreen(false);
      setError('Payment timed out. Please try again.');
    }, 300000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // UI: loading / empty states
  if (loading) return <div className="loading">Loading cart...</div>;
  if (!cart?.items?.length) return <div className="empty">Cart is empty</div>;

  const cartTotal = cart.totalPrice || 0;

  // CHECKOUT FORM
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
          {/* If qrUrl is a data URL or image url display it; if it's a UPI link, you may want to generate QR client-side */}
          {qrUrl ? <img src={qrUrl} alt="Scan QR" className="qr-img" /> : <div className="no-qr">QR not available</div>}
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
              // manual re-check immediately
              const apiId = String(orderId || '').replace(/^ORD_/, '');
              if (apiId) startPolling(apiId);
            }}
          >
            Re-check status
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              // Open return page (frontend) so user can re-check / let Cashfree redirect UX work
              const returnUrl = `${window.location.origin}/payment-return?orderId=${encodeURIComponent(orderId || '')}`;
              window.location.href = returnUrl;
            }}
          >
            Open payment return page
          </button>

          <button
            className="btn-ghost"
            onClick={() => {
              if (qrUrl) {
                navigator.clipboard?.writeText(qrUrl);
                toast.success('QR link copied to clipboard');
              } else {
                toast.error('No QR link to copy');
              }
            }}
          >
            Copy QR link
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
