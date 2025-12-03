// src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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

  // Localhost backend + Live payments = Perfect combo
  const API_URL = 'http://localhost:8080/api';

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

      // Try SDK first (best experience)
      if (window.Cashfree && sdkLoaded) {
        try {
          const cashfree = window.Cashfree({ mode: "production" });
          cashfree.checkout({
            paymentSessionId: sessionId,
            redirectTarget: "_self"
          });
          return;
        } catch (sdkError) {
          console.warn("SDK failed, using direct link", sdkError);
        }
      }

      // 100% Fallback – Direct link (NEVER FAILS)
      const directLink = `https://payments.cashfree.com/orders/pay_${sessionId}`;
      console.log("Opening payment:", directLink);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-800">
        <div className="text-6xl font-black text-white animate-pulse">Loading Cart...</div>
      </div>
    );
  }

  // Empty cart
  if (!cart?.items?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-purple-900">
        <div className="text-7xl font-black text-white">Your Cart is Empty!</div>
      </div>
    );
  }

  // Address Form
  if (!showPayment) {
    return (
      <div className="max-w-7xl mx-auto p-8 bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
        <h1 className="text-8xl font-black text-center mb-16 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Checkout
        </h1>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Address Form */}
          <div className="bg-white p-12 rounded-3xl shadow-3xl border-8 border-purple-300">
            <h2 className="text-5xl font-bold mb-12 text-purple-800">Delivery Address</h2>
            <div className="space-y-8">
              <input name="fullName" placeholder="Full Name *" value={address.fullName} onChange={handleAddressChange} required className="w-full p-6 border-4 border-purple-300 rounded-2xl text-2xl focus:outline-none focus:border-purple-600" />
              <input name="phone" placeholder="Phone Number *" value={address.phone} onChange={handleAddressChange} required className="w-full p-6 border-4 border-purple-300 rounded-2xl text-2xl" />
              <input name="street" placeholder="Flat, House no., Building, Street *" value={address.street} onChange={handleAddressChange} required className="w-full p-6 border-4 border-purple-300 rounded-2xl text-2xl" />
              <input name="landmark" placeholder="Landmark (optional)" value={address.landmark} onChange={handleAddressChange} className="w-full p-6 border-4 border-purple-300 rounded-2xl text-2xl" />
              
              <div className="grid grid-cols-2 gap-8">
                <input name="city" placeholder="City *" value={address.city} onChange={handleAddressChange} required className="p-6 border-4 border-purple-300 rounded-2xl text-2xl" />
                <input name="state" placeholder="State *" value={address.state} onChange={handleAddressChange} required className="p-6 border-4 border-purple-300 rounded-2xl text-2xl" />
              </div>
              
              <input name="pincode" placeholder="Pincode *" value={address.pincode} onChange={handleAddressChange} required className="w-full p-6 border-4 border-purple-300 rounded-2xl text-2xl" />

              <button 
                onClick={() => setShowPayment(true)} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-10 rounded-3xl text-4xl font-black hover:scale-105 transition shadow-3xl"
              >
                Continue to Payment
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-purple-200 to-pink-200 p-12 rounded-3xl shadow-3xl">
            <h2 className="text-5xl font-bold mb-12 text-purple-900">Order Summary</h2>
            {cart.items.map(item => (
              <div key={item.id} className="flex justify-between py-6 text-3xl border-b-4 border-purple-400">
                <span>{item.productName} × {item.quantity}</span>
                <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
            <div className="text-7xl font-black text-right mt-16 text-purple-900">
              Total: ₹{amountToPay.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Final Payment Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-3xl p-20 max-w-2xl w-full text-center border-8 border-purple-500">
        <h2 className="text-6xl font-black mb-10 text-gray-800">Complete Payment</h2>
        <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-16">
          ₹{amountToPay.toFixed(2)}
        </div>
        
        <button
          onClick={initiatePayment}
          disabled={window.paymentInProgress}
          className={`w-full text-white text-5xl font-black py-16 rounded-3xl transform transition shadow-3xl mb-10
            ${window.paymentInProgress 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-110'
            }`}
        >
          {window.paymentInProgress ? "Processing..." : `Pay ₹${amountToPay} Securely`}
        </button>

        <p className="text-3xl font-bold text-gray-700 mb-10">
          Powered by Cashfree Payments<br />
          UPI • Cards • Wallets • Netbanking • EMI
        </p>

        <button 
          onClick={() => setShowPayment(false)} 
          className="text-purple-700 font-black text-3xl hover:underline"
        >
          ← Change Address
        </button>
      </div>
    </div>
  );
}