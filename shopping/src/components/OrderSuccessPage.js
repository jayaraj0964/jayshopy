import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { CheckCircle, ShoppingBag, ArrowRight, XCircle, CreditCard, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './OrderSuccessPage.css';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderFailed, setOrderFailed] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const { updateCartCount } = useAuth();

  // Priority: URL → localStorage → fallback
  const urlOrderId = searchParams.get('order_id');
  const pendingOrderId = localStorage.getItem('pendingDbOrderId');
  const rawOrderId = urlOrderId || pendingOrderId;

  // Normalize Order ID (handles ORD_123 or 123) by stripping the ORD_ prefix
  const finalOrderId = rawOrderId ? String(rawOrderId).replace(/^ORD_/, '').trim() : null;

  const parseAddress = (addressStr) => {
    try {
      if (!addressStr) return null;
      return JSON.parse(addressStr);
    } catch (e) {
      return { street: addressStr };
    }
  };

  useEffect(() => {
    if (!finalOrderId || orderConfirmed || orderFailed) return;

    let interval;

    // Fast initial check & start polling
    const checkStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) return { done: true, routeLogin: true };

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
            localStorage.removeItem('pendingDbOrderId');
            setOrderConfirmed(true);
            setOrderDetails(data);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 10000);
            toast.success("Order Confirmed! Thank you for shopping with Jayshopy!", {
              duration: 6000,
              icon: "🎉",
              style: {
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '16px',
                fontWeight: '600',
                borderRadius: '12px',
              }
            });
            return { done: true };
          } else if (data.status === "FAILED" || data.status === "CANCELLED") {
            localStorage.removeItem('pendingDbOrderId');
            setOrderFailed(true);
            return { done: true };
          }
        }
      } catch (err) {
        console.log("Initial check failed, fallback to interval", err);
      }
      return { done: false };
    };

    const run = async () => {
      toast.loading("Confirming your payment with server...", { 
        id: "confirming", 
        duration: 60000 
      });

      const result = await checkStatus();
      if (result.done) {
        toast.dismiss("confirming");
        if (result.routeLogin) {
          toast.error("Please login again");
          navigate('/login');
        } else {
          updateCartCount();
        }
        return;
      }

      // Interval fallback
      const token = localStorage.getItem('token');
      const maxAttempts = 20; // 20 attempts
      let attempts = 1;

      interval = setInterval(async () => {
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
              localStorage.removeItem('pendingDbOrderId');
              setOrderConfirmed(true);
              setOrderDetails(data);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 10000);
              toast.dismiss("confirming");
              toast.success("Order Confirmed! Thank you for shopping with Jayshopy!", {
                duration: 6000,
                icon: "🎉",
                style: {
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '16px',
                  fontWeight: '600',
                  borderRadius: '12px',
                }
              });
              updateCartCount();
            } else if (data.status === "FAILED" || data.status === "CANCELLED") {
              clearInterval(interval);
              localStorage.removeItem('pendingDbOrderId');
              setOrderFailed(true);
              setShowConfetti(false);
              toast.dismiss("confirming");
              toast.error("Payment failed. Please check checkout or retry.");
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            toast.dismiss("confirming");
            toast("Taking longer than usual. Check Orders page.", { icon: "Info" });
          }
        } catch (err) {
          console.log("Polling... still waiting");
        }
      }, 2500);
    };

    run();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [finalOrderId, orderConfirmed, orderFailed, navigate, updateCartCount]);

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

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

      <div className="success-card-premium animate-fade-in" style={orderFailed ? { borderColor: '#fecaca' } : {}}>
        <div className="success-icon-container" style={orderFailed ? { background: '#fef2f2' } : {}}>
          {orderFailed ? (
            <XCircle className="success-check-icon pulse-icon" style={{ color: '#ef4444' }} />
          ) : (
            <CheckCircle className={`success-check-icon ${orderConfirmed ? 'pulse-icon' : 'rotate-icon'}`} />
          )}
        </div>

        <h1 className="success-title" style={orderFailed ? { color: '#dc2626' } : {}}>
          {orderConfirmed ? "Payment Successful!" : orderFailed ? "Payment Failed" : "Verifying Payment..."}
        </h1>

        <p className="success-subtitle">
          {orderConfirmed 
            ? "Thank you! Your order has been placed and confirmed successfully." 
            : orderFailed
            ? "Your payment transaction was not successful. Please try paying again from your orders."
            : "We are waiting for Cashfree to confirm your transaction details."}
        </p>

        {finalOrderId && (
          <div className="success-order-box" style={orderFailed ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}}>
            <span className="order-box-label">Order Reference ID</span>
            <strong className="order-box-id">ORD_{finalOrderId}</strong>
          </div>
        )}

        {/* Dynamic Premium Order Details and Summary */}
        {orderConfirmed && orderDetails && (
          <div className="success-details-section animate-slide-up">
            <div className="success-summary-title flex items-center justify-center gap-2">
              <span>Order Details</span>
            </div>

            <div className="success-summary-grid">
              <div className="success-summary-row">
                <div className="row-left">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span>Amount Paid</span>
                </div>
                <strong className="paid-amount-val">₹{Number(orderDetails.total).toFixed(2)}</strong>
              </div>

              {orderDetails.orderDate && (
                <div className="success-summary-row">
                  <div className="row-left">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Order Date</span>
                  </div>
                  <span>{formatDate(orderDetails.orderDate)}</span>
                </div>
              )}
            </div>

            {orderDetails.shippingAddress && (() => {
              const addr = parseAddress(orderDetails.shippingAddress);
              if (!addr) return null;
              return (
                <div className="success-shipping-address-card">
                  <div className="shipping-card-header">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span>Delivered To</span>
                  </div>
                  <div className="shipping-address-body">
                    <strong>{addr.fullName}</strong>
                    {addr.phone && <p className="phone">📞 {addr.phone}</p>}
                    <p className="address-text">
                      {addr.street}, {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                    </p>
                    {addr.landmark && <p className="landmark">Landmark: {addr.landmark}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="success-status-badge-container">
          <span className={`status-badge-val ${orderConfirmed ? 'status-paid' : orderFailed ? 'status-cancelled' : 'status-pending'}`}>
            Status: {orderConfirmed ? "PAID" : orderFailed ? "FAILED" : "CONFIRMING..."}
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