import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './OrderSuccessPage.css';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const { updateCartCount } = useAuth();

  // Priority: URL → localStorage → fallback
  const urlOrderId = searchParams.get('order_id');
  const pendingOrderId = localStorage.getItem('pendingDbOrderId');
  const rawOrderId = urlOrderId || pendingOrderId;

  // Normalize Order ID (handles ORD_123 or 123) by stripping the ORD_ prefix
  const finalOrderId = rawOrderId ? String(rawOrderId).replace(/^ORD_/, '').trim() : null;

  useEffect(() => {
    if (!finalOrderId || orderConfirmed) return;

    // Confetti for 8 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 8000);

    // Start polling only once
    const pollOrderStatus = async () => {
      toast.loading("Confirming your payment with server...", { 
        id: "confirming", 
        duration: 60000 
      });

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Please login again");
        navigate('/login');
        return;
      }

      const maxAttempts = 20; // 20 × 2.5s = 50 seconds max wait
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`https://jayshoppy3-backend-2.onrender.com/api/user/order-status/${finalOrderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "PAID") {
              clearInterval(interval);
              localStorage.removeItem('pendingDbOrderId'); // Clear old data
              setOrderConfirmed(true);
              toast.dismiss("confirming");
              toast.success("Order Confirmed! Thank you for shopping with Jayshopy!", {
                duration: 6000,
                icon: "Success"
              });
              updateCartCount(); // Refresh the cart count in UI
            }
          }

          // Stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            toast.dismiss("confirming");
            toast("Taking longer than usual. Check Orders page.", { icon: "Info" });
          }
        } catch (err) {
          console.log("Polling... still waiting for server confirmation");
        }
      }, 2500);

      return () => {
        clearInterval(interval);
        clearTimeout(confettiTimer);
      };
    };

    pollOrderStatus();
  }, [finalOrderId, orderConfirmed, navigate, updateCartCount]);

  return (
    <div className="success-wrapper">
      {showConfetti && (
        <Confetti 
          width={window.innerWidth} 
          height={window.innerHeight} 
          recycle={false} 
          numberOfPieces={300} 
        />
      )}

      <div className="success-card-premium animate-fade-in">
        <div className="success-icon-container">
          <CheckCircle className={`success-check-icon ${orderConfirmed ? 'pulse-icon' : 'rotate-icon'}`} />
        </div>

        <h1 className="success-title">
          {orderConfirmed ? "Payment Successful!" : "Verifying Payment..."}
        </h1>

        <p className="success-subtitle">
          {orderConfirmed 
            ? "Thank you! Your order has been placed and confirmed successfully." 
            : "We are waiting for Cashfree to confirm your transaction details."}
        </p>

        {finalOrderId && (
          <div className="success-order-box">
            <span className="order-box-label">Order Reference ID</span>
            <strong className="order-box-id">ORD_{finalOrderId}</strong>
          </div>
        )}

        <div className="success-status-badge-container">
          <span className={`status-badge-val ${orderConfirmed ? 'status-paid' : 'status-pending'}`}>
            Status: {orderConfirmed ? "PAID" : "CONFIRMING..."}
          </span>
        </div>

        <div className="success-button-group">
          <button
            onClick={() => navigate('/orders')}
            className="success-btn-main primary-btn-success"
          >
            <ShoppingBag size={20} /> View My Orders
          </button>

          <button
            onClick={() => navigate('/')}
            className="success-btn-main secondary-btn-success"
          >
            Continue Shopping <ArrowRight size={20} />
          </button>
        </div>

        <div className="success-footer-note">
          <p>A confirmation email with invoice details will be sent shortly.</p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;