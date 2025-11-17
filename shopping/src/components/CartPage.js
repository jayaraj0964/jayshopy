// src/components/CartPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link, useNavigate } from 'react-router-dom'; // ✅ Added useNavigate
import './CartPage.css';
import { toast } from 'react-hot-toast';

const NO_IMAGE = "data:image/svg+xml;base64,..."; // keep your existing NO_IMAGE

function CartPage() {
  const { user, updateCartCount } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const navigate = useNavigate(); // ✅ Defined navigate


  const loadCart = useCallback(async () => {
    try {
      const data = await api.getCart();
      setCart(data);
      updateCartCount(); // Sync navbar count
    } catch (err) {
      console.error(err);
      alert('Failed to load cart');
    } finally {
      setLoading(false);
    }
}, [updateCartCount]);

useEffect(() => {
    loadCart();
  }, [loadCart]);

//   const updateQuantity = async (productId, newQty) => {
//     if (newQty < 1) return;
//     setUpdating(prev => ({ ...prev, [productId]: true }));
//     try {
//       await api.updateCartItem(productId, newQty);
//       await loadCart();
//     } catch (err) {
//       alert(err.message || 'Update failed');
//     } finally {
//       setUpdating(prev => ({ ...prev, [productId]: false }));
//     }
//   };

const updateQuantity = async (itemId, newQty) => {
  try {
    await api.updateCartItem(itemId, newQty);
    toast.success('Cart updated!');
    loadCart();
  } catch (err) {
    toast.error('out of stock'); // SHOW STOCK MESSAGE
  }
};

  const removeItem = async (productId) => {
    if (!window.confirm('Remove this item?')) return;
    setUpdating(prev => ({ ...prev, [productId]: true }));
    try {
      await api.removeFromCart(productId);
      await loadCart();
      alert('Item removed!');
    } catch (err) {
      alert(err.message || 'Remove failed');
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) return <div className="cart-loading">Loading cart...</div>;
  if (!user) return <div className="cart-login">Please <Link to="/login">login</Link> to view cart</div>;
  if (!cart?.items?.length) return <div className="cart-empty">Your cart is empty</div>;

  const total = cart.totalPrice || 0;

  return (
    <div className="cart-container">
      <h1>Your Cart ({cart.items.length} items)</h1>
      <div className="cart-items">
        {cart.items.map(item => (
          <div key={item.id} className="cart-item-card">
            <img
              src={item.productImageBase64 || NO_IMAGE}
              alt={item.productName}
              className="item-image"
              onError={(e) => e.target.src = NO_IMAGE}
            />
            <div className="item-details">
              <h3 className="item-name">{item.productName}</h3>
              <p className="item-price">₹{item.price.toFixed(2)}</p>
              <div className="quantity-controls">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1 || updating[item.productId]}
                  className="qty-btn"
                >
                  -
                </button>
                <span className="qty-display">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={updating[item.productId]}
                  className="qty-btn"
                >
                  +
                </button>
              </div>
              <p className="item-subtotal">Subtotal: ₹{(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <button
              onClick={() => removeItem(item.productId)}
              disabled={updating[item.productId]}
              className="remove-btn"
            >
              {updating[item.productId] ? '...' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <div className="total-price">
          <strong>Total: ₹{total.toFixed(2)}</strong>
        </div>
        <button className="checkout-btn" onClick={() => navigate('/checkout')}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

export default CartPage;
