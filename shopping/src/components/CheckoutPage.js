// src/pages/CheckoutPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './CheckoutPage.css';

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-use-before-define */

function CheckoutForm() {
  const { updateCartCount } = useAuth();
  const navigate = useNavigate();

  // STATES
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [address, setAddress] = useState({
    fullName: '', phone: '', street: '', city: '', state: '', pincode: '', landmark: ''
  });

  // AFTER ORDER CREATED → SHOW 2 PAYMENT OPTIONS
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [orderId, setOrderId] = useState(null); // DB Order ID
  const [amountToPay, setAmountToPay] = useState(0);

  // UPI PAYMENT SCREEN
  const [showUpiScreen, setShowUpiScreen] = useState(false);
  const [upiData, setUpiData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isPolling, setIsPolling] = useState(false);

  // LOADING STATES
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://jayshoppy3-backend-1.onrender.com/api';
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    loadCart();
  }, []);

  // Timer for UPI screen
  useEffect(() => {
    if (showUpiScreen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showUpiScreen && timeLeft === 0) {
      handleTimeout();
    }
  }, [showUpiScreen, timeLeft]);

  const loadCart = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Please login');
      const res = await fetch(`${API_URL}/user/cart`, { headers: { Authorization: `Bearer ${token}` } });
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

  const handleInput = (e) => setAddress({ ...address, [e.target.name]: e.target.value });

  const validateAddress = () => {
    const { fullName, phone, street, city, state, pincode } = address;
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      setError('Please fill all required fields');
      return false;
    }
    if (!/^\d{10}$/.test(phone)) { setError('Invalid phone number'); return false; }
    if (!/^\d{6}$/.test(pincode)) { setError('Invalid pincode'); return false; }
    setError(null);
    return true;
  };

  // STEP 1: CREATE ORDER + SHOW 2 PAYMENT BUTTONS
  const createOrderAndShowOptions = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    const shippingAddress = `${address.fullName}, ${address.phone}, ${address.street}${address.landmark ? ', ' + address.landmark : ''}, ${address.city}, ${address.state} - ${address.pincode}`;

    try {
      const token = getToken();
      const orderRes = await fetch(`${API_URL}/user/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shippingAddress })
      });

      if (!orderRes.ok) throw new Error(await orderRes.text());
      const orderData = await orderRes.json();

      setOrderId(orderData.orderId);
      setAmountToPay(orderData.totalPrice || cart.totalPrice);
      setShowPaymentOptions(true);
      toast.success('Order created! Choose payment method');
    } catch (err) {
      toast.error(err.message || 'Order creation failed');
      setError(err.message);
    }
  };

  // STEP 2: UPI PAYMENT → QR SCREEN
  const payWithUPI = async () => {
    setLoadingUpi(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/user/create-upi-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setUpiData(data);
      setShowUpiScreen(true);
      setTimeLeft(300);
      startPolling(orderId);
      toast.success('Scan QR to pay!');
    } catch (err) {
      toast.error(err.message || 'UPI payment failed');
    } finally {
      setLoadingUpi(false);
    }
  };

  // STEP 3: CARD PAYMENT → FULL CASHFREE PAGE
  const payWithCard = async () => {
    setLoadingCard(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/user/create-card-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      window.open(data.paymentLink, '_blank');
      toast.success('Redirecting to secure payment...');
      startPolling(orderId);
    } catch (err) {
      toast.error(err.message || 'Card payment failed');
    } finally {
      setLoadingCard(false);
    }
  };

  // POLLING
  const startPolling = (id) => {
    if (isPolling) return;
    setIsPolling(true);
    const apiId = String(id);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/user/order-status/${apiId}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {}
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.status === 'PAID') {
          stopPolling();
          updateCartCount();
          toast.success('Payment Successful!');
          navigate('/order-success', { state: { orderId: apiId, transactionId: data.transactionId } });
        }
      } catch (err) { console.warn('Polling...', err); }
    }, 3000);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      handleTimeout();
    }, 300000);
  };

  const stopPolling = () => {
    clearInterval(pollIntervalRef.current);
    clearTimeout(timeoutRef.current);
    setIsPolling(false);
  };

  const handleTimeout = () => {
    stopPolling();
    setError('Payment timed out');
    toast.error('Payment timed out');
    setShowUpiScreen(false);
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${s%60 < 10 ? '0' : ''}${s%60}`;

  if (loading) return <div className="loading">Loading cart...</div>;
  if (!cart?.items?.length) return <div className="empty">Cart is empty</div>;

  // 1. ADDRESS FORM
  if (!showPaymentOptions && !showUpiScreen) {
    return (
      <div className="checkout-container">
        <h1>Checkout</h1>
        <div className="checkout-grid">
          <div className="form-section">
            <h2>Delivery Address</h2>
            <form onSubmit={createOrderAndShowOptions}>
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
                Continue to Payment
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
            <div className="total"><strong>Total: ₹{cart.totalPrice.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. CHOOSE PAYMENT METHOD
  if (showPaymentOptions && !showUpiScreen) {
    return (
      <div className="payment-options-screen">
        <div className="payment-card">
          <h2>Select Payment Method</h2>
          <p className="amount-big">₹{Number(amountToPay).toFixed(2)}</p>

          <button className="btn-upi-big" onClick={payWithUPI} disabled={loadingUpi}>
            {loadingUpi ? "Loading QR..." : "Pay with UPI → GPay • PhonePe • Paytm"}
          </button>

          <div className="or-separator">OR</div>

          <button className="btn-card-big" onClick={payWithCard} disabled={loadingCard}>
            {loadingCard ? "Redirecting..." : "Pay with Card / Wallet / Net Banking"}
          </button>

          <button className="btn-back" onClick={() => setShowPaymentOptions(false)}>
            ← Back to Address
          </button>
        </div>
      </div>
    );
  }

  // 3. UPI QR SCREEN
  return (
    <div className="payment-screen">
      <div className="payment-card">
        <h2>Scan & Pay with UPI</h2>
        <p className="amount-big">₹{Number(amountToPay).toFixed(2)}</p>

        <div className="qr-container">
          {upiData?.qrCodeUrl ? (
            <img src={upiData.qrCodeUrl} alt="UPI QR" className="qr-img" />
          ) : (
            <div className="no-qr">Generating QR...</div>
          )}
        </div>

        <p className="scan-text">Works with <strong>GPay • PhonePe • Paytm • BHIM</strong></p>

        <div className="timer">
          <div className="time-circle">{formatTime(timeLeft)}</div>
          <p>Time remaining</p>
        </div>

        <div className="qr-actions">
          <button className="btn" onClick={() => startPolling(orderId)} disabled={isPolling}>
            {isPolling ? 'Checking...' : 'Check Payment Status'}
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