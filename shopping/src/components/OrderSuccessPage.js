// src/components/OrderSuccessPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './OrderSuccessPage.css';

function OrderSuccessPage() {
  return (
    <div className="success-container">
      <div className="success-card">
        <h1>Order Placed Successfully!</h1>
        <p>Thank you for shopping with us.</p>
        <Link to="/" className="home-btn">Continue Shopping</Link>
      </div>
    </div>
  );
}

export default OrderSuccessPage;   // ✅ Correct default export
