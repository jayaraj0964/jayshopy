// src/pages/OrderSuccess.jsx
import { useSearchParams } from 'react-router-dom';

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const status = params.get('status');

  return (
    <div className="success-page">
      <h1>Payment Successful!</h1>
      <p>Order ID: <strong>{orderId}</strong></p>
      <p>Thank you for shopping with us!</p>
      <a href="/">Continue Shopping</a>
    </div>
  );
}