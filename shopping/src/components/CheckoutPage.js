// src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountToPay, setAmountToPay] = useState(0);
  const [address, setAddress] = useState({
    fullName: '', phone: '', street: '', city: '', state: '', pincode: '', landmark: ''
  });
  const [showPayment, setShowPayment] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Backend API URL
  const API_URL = 'https://jayshoppy3-backend-2.onrender.com/api';

  const getToken = () => localStorage.getItem('token');

  // Load cart
  useEffect(() => {
    const loadCart = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Login required");

        const res = await fetch(`${API_URL}/user/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load cart");
        const data = await res.json();
        setCart(data);
        setAmountToPay(data.totalPrice || 0);
      } catch (err) {
        toast.error("Please login again");
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [navigate]);

  // Load Cashfree SDK with error handling
  useEffect(() => {
    if (window.Cashfree) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;

    script.onload = () => {
      console.log("Cashfree SDK Loaded Successfully");
      setSdkLoaded(true);
    };

    script.onerror = () => {
      console.error("Cashfree SDK failed to load");
      toast.error("Payment gateway issue. Will use direct link.");
      setSdkLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      const existing = document.querySelector('script[src*="cashfree.js"]');
      if (existing) existing.remove();
    };
  }, []);

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const validateAddress = () => {
    const { fullName, phone, street, city, state, pincode } = address;
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      toast.error("All fields are required!");
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      toast.error("Enter valid 10-digit phone number");
      return false;
    }
    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Enter valid 6-digit pincode");
      return false;
    }
    return true;
  };

  // FINAL BULLETPROOF PAYMENT FUNCTION
  const initiatePayment = async () => {
    if (!validateAddress()) return;

    // Prevent double click
    if (window.paymentInProgress) return;
    window.paymentInProgress = true;

    toast.loading("Creating secure payment...", { id: "pay" });

    try {
      const response = await fetch(`${API_URL}/user/create-payment-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount: amountToPay,
          shippingAddress: address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment failed");
      }

      toast.dismiss("pay");
      toast.success("Redirecting to Cashfree...");

      const sessionId = data.payment_session_id;

      // Store pending order ID for success page polling fallback
      if (data.orderId) {
        localStorage.setItem('pendingDbOrderId', data.orderId);
      }

      // Smart dynamic Cashfree mode detection:
      // 1. Check data.environment returned by backend (if backend is updated)
      // 2. Check process.env.REACT_APP_CASHFREE_MODE
      // 3. Fallback to 'sandbox' if on localhost or using onrender.com backend
      // 4. Otherwise default to 'production'
      let cashfreeMode = 'production';
      if (data.environment) {
        cashfreeMode = data.environment;
      } else if (process.env.REACT_APP_CASHFREE_MODE) {
        cashfreeMode = process.env.REACT_APP_CASHFREE_MODE;
      } else if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
         window.location.hostname.includes('local') ||
         API_URL.includes('onrender.com'))
      ) {
        cashfreeMode = 'sandbox';
      }

      console.log(`Initializing Cashfree SDK in ${cashfreeMode} mode`);

      // Try SDK first (best experience)
      if (window.Cashfree && sdkLoaded) {
        try {
          const cashfree = window.Cashfree({ mode: cashfreeMode });
          cashfree.checkout({
            paymentSessionId: sessionId,
            redirectTarget: "_self"
          });
          return;
        } catch (sdkError) {
          console.warn("SDK failed, using direct link fallback", sdkError);
        }
      }

      // 100% Fallback – Direct hosted checkout link (NEVER FAILS)
      const directLink = cashfreeMode === 'production'
        ? `https://payments.cashfree.com/order/#${sessionId}`
        : `https://payments-test.cashfree.com/order/#${sessionId}`;

      console.log("Opening payment link:", directLink);
      window.location.href = directLink;

    } catch (error) {
      console.error("Payment Error:", error);
      toast.dismiss("pay");
      toast.error(error.message || "Payment failed. Try again.");
    } finally {
      window.paymentInProgress = false;
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="checkout-wrapper">
        <div className="checkout-card">
          <div className="checkout-header">
            <div className="logo-icon">⌛</div>
            <h1>Loading Cart...</h1>
            <p>Preparing your colorful checkout experience.</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (!cart?.items?.length) {
    return (
      <div className="checkout-wrapper">
        <div className="checkout-card">
          <div className="checkout-header">
            <div className="logo-icon">🛒</div>
            <h1>Your Cart is Empty!</h1>
            <p>Add something nice and come back to checkout.</p>
          </div>
        </div>
      </div>
    );
  }

  // Address Form
  if (!showPayment) {
    return (
      <div className="checkout-wrapper">
        <div className="checkout-card">
          <div className="checkout-header">
            <div className="logo-icon">✨</div>
            <h1>Checkout</h1>
            <p>Fast, secure and bright payment flow.</p>
          </div>

          <div className="checkout-grid">
            <div className="form-section">
              <h2>Delivery Details</h2>

              <div className="form-group">
                <label>Full Name <span>*</span></label>
                <input name="fullName" placeholder="Your name" value={address.fullName} onChange={handleAddressChange} required className="input-field" />
              </div>

              <div className="form-group">
                <label>Phone Number <span>*</span></label>
                <input name="phone" placeholder="10-digit phone" value={address.phone} onChange={handleAddressChange} required className="input-field" />
              </div>

              <div className="form-group">
                <label>Street Address <span>*</span></label>
                <input name="street" placeholder="House, street, area" value={address.street} onChange={handleAddressChange} required className="input-field" />
              </div>

              <div className="form-group">
                <label>Landmark</label>
                <input name="landmark" placeholder="Optional" value={address.landmark} onChange={handleAddressChange} className="input-field" />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>City <span>*</span></label>
                  <input name="city" placeholder="City" value={address.city} onChange={handleAddressChange} required className="input-field" />
                </div>

                <div className="form-group">
                  <label>State <span>*</span></label>
                  <input name="state" placeholder="State" value={address.state} onChange={handleAddressChange} required className="input-field" />
                </div>
              </div>

              <div className="form-group">
                <label>Pincode <span>*</span></label>
                <input name="pincode" placeholder="6-digit postal code" value={address.pincode} onChange={handleAddressChange} required className="input-field" />
              </div>

              <button 
                onClick={() => setShowPayment(true)} 
                className="submit-btn"
              >
                Continue to Payment
              </button>
            </div>

            <div className="summary-card">
              <h2>Order Summary</h2>
              {cart.items.map(item => (
                <div key={item.id} className="summary-item">
                  <span>{item.productName} × {item.quantity}</span>
                  <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
              <div className="summary-total">
                <span>Total</span>
                <strong>₹{amountToPay.toFixed(2)}</strong>
              </div>
              <p className="summary-note">Secure checkout powered by Cashfree. Fast and safe payments.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Final Payment Screen
  return (
    <div className="checkout-wrapper">
      <div className="checkout-card payment-card">
        <div className="checkout-header">
          <div className="logo-icon">💳</div>
          <h1>Complete Payment</h1>
          <p>One tap away from finishing your order.</p>
        </div>
        <div className="form-section">
          <div className="amount-display">₹{amountToPay.toFixed(2)}</div>

          <button
            onClick={initiatePayment}
            disabled={window.paymentInProgress}
            className={`submit-btn ${window.paymentInProgress ? 'success-btn' : ''}`}
          >
            {window.paymentInProgress ? "Processing..." : `Pay ₹${amountToPay} Securely`}
          </button>

          <p className="summary-note">
            Powered by Cashfree Payments<br />
            UPI • Cards • Wallets • Netbanking • EMI
          </p>

          <button 
            onClick={() => setShowPayment(false)} 
            className="submit-btn success-btn"
          >
            ← Change Address
          </button>
        </div>
      </div>
    </div>
  );
}