// src/pages/CheckoutPage.jsx → FINAL VERSION

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Package, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import './CheckoutPage.css'; // ← YE LINE ADD KARNA ZAROORI HAI

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountToPay, setAmountToPay] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', phone: '', address: '', landmark: '', city: '', state: '', zipCode: ''
  });

  const API_URL = 'http://localhost:8080/api';
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const loadCart = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Login required");

        const res = await fetch(`${API_URL}/user/cart`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Cart empty");
        const data = await res.json();
        setCart(data);
        setAmountToPay(data.totalPrice || 0);
      } catch (err) {
        toast.error("Login again");
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const initiatePayment = async () => {
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      toast.error("All fields required!");
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Valid 10-digit phone required");
      return;
    }
    if (!/^\d{6}$/.test(formData.zipCode)) {
      toast.error("Valid 6-digit pincode required");
      return;
    }

    window.paymentInProgress = true;
    toast.loading("Creating payment...", { id: "pay" });

    try {
      const res = await fetch(`${API_URL}/user/create-payment-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount: amountToPay,
          shippingAddress: {
            fullName: formData.fullName,
            phone: formData.phone,
            street: formData.address,
            landmark: formData.landmark,
            city: formData.city,
            state: formData.state,
            pincode: formData.zipCode
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");

      toast.dismiss("pay");
      setSubmitted(true);
      setTimeout(() => {
        window.location.href = `https://payments.cashfree.com/orders/pay_${data.payment_session_id}`;
      }, 1500);

    } catch (err) {
      toast.dismiss("pay");
      toast.error(err.message);
    } finally {
      window.paymentInProgress = false;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600"><Loader2 className="w-16 h-16 text-white animate-spin" /></div>;
  if (!cart?.items?.length) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-pink-600"><h1 className="text-6xl font-black text-white">Cart Empty!</h1></div>;

  return (
    <div className="checkout-wrapper">
      <div className="checkout-card">
        <div className="checkout-header">
          <div className="logo-icon">
            <Package className="w-10 h-10 text-purple-600" />
          </div>
          <h1>Checkout</h1>
          <p>Complete your shipping details to proceed</p>
        </div>

        <div className="form-section">
          <h2>
            <MapPin className="w-7 h-7" />
            Shipping Address
          </h2>

          <div className="form-group">
            <label>Full Name <span>*</span></label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} className="input-field" placeholder="Enter your full name" />
          </div>

          <div className="form-group">
            <label>Phone Number <span>*</span></label>
            <input name="phone" value={formData.phone} onChange={handleChange} className="input-field" placeholder="9876543210" />
          </div>

          <div className="form-group">
            <label>Street Address <span>*</span></label>
            <input name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="Flat no., Building, Street" />
          </div>

          <div className="form-group">
            <input name="landmark" value={formData.landmark} onChange={handleChange} className="input-field" placeholder="Landmark (optional)" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label>City <span>*</span></label>
              <input name="city" value={formData.city} onChange={handleChange} className="input-field" placeholder="Hyderabad" />
            </div>
            <div className="form-group">
              <label>State <span>*</span></label>
              <input name="state" value={formData.state} onChange={handleChange} className="input-field" placeholder="Telangana" />
            </div>
            <div className="form-group">
              <label>Pincode <span>*</span></label>
              <input name="zipCode" value={formData.zipCode} onChange={handleChange} className="input-field" placeholder="500001" />
            </div>
          </div>

          <button onClick={initiatePayment} disabled={window.paymentInProgress || submitted}
            className={`submit-btn ${submitted ? 'success-btn' : ''}`}>
            {submitted ? (
              <>Order Placed! <CheckCircle className="w-7 h-7" /></>
            ) : window.paymentInProgress ? (
              <>Processing... <Loader2 className="w-7 h-7 animate-spin" /></>
            ) : (
              <>Continue to Payment</>
            )}
          </button>
        </div>

        <div className="checkout-footer">
          <p>Your information is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
}