import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function OrderSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id') || 'N/A';

  return (
    <div className="success-container">
      <div className="success-card">
        <h1>Payment Successful!</h1>
        <p>Your order has been placed successfully.</p>
        <p><strong>Order ID:</strong> {orderId.replace('ORD_', '')}</p>
        <Link to="/" className="home-btn">Continue Shopping</Link>
      </div>
    </div>
  );
}