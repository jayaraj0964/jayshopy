// src/pages/OrderSuccess.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    const orderId = params.get('order_id');
    const pendingDbId = localStorage.getItem('pendingDbOrderId');
    const dbOrderId = orderId || pendingDbId;

    if (dbOrderId) {
      // Poll for confirmation
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8080/api/user/order-status/${dbOrderId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.status === "PAID") {
            clearInterval(interval);
            localStorage.removeItem('pendingDbOrderId');
            toast.success("Order confirmed!");
          }
        } catch (e) { }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [location]);

  return (
    <div className="success-page">
      <h1>Payment Successful!</h1>
      <p>Order ID: {params.get('order_id')}</p>
      <button onClick={() => navigate('/products')}>Continue Shopping</button>
    </div>
  );
};

export default OrderSuccess;