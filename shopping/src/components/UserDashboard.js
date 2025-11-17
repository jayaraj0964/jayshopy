// src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import './UserDashboard.css';

const NO_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABABJRU5ErkJggg==";

function UserDashboard() {
  const { user, cartCount, updateCartCount } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // const navigate = useNavigate();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (user) {
          const data = await api.getProducts();
          setProducts(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [user]);

  // const displayName = user?.email?.split('@')[0] || 'Guest';

  // ADD TO CART WITH FRONTEND STOCK CHECK
  const addToCart = async (productId, stock) => {
    if (stock <= 0) {
      toast.error('Out of stock!'); // TOAST FROM FRONTEND
      return;
    }

    try {
      await api.addToCart(productId);
      toast.success('Added to cart!');
      updateCartCount();
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      const main = product.images.find(i => i.isMain) || product.images[0];
      return main.base64Image || NO_IMAGE;
    }
    return NO_IMAGE;
  };

  const getStockBadge = (stock) => {
    if (stock === 0) {
      return <span className="stock-badge out-of-stock">Out of Stock</span>;
    } else if (stock <= 5) {
      return <span className="stock-badge low-stock">Only {stock} left!</span>;
    } else {
      return <span className="stock-badge in-stock">In Stock</span>;
    }
  };

  return (
    <div className="dashboard">
      {/* <h2>Welcome, {displayName}!</h2> */}
      <p>Your Cart: {cartCount > 0 ? `${cartCount} items` : 'Empty'}</p>

      {loading ? (
        <div className="products-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="product-card skeleton-card">
              <div className="image-container skeleton"></div>
              <h3 className="skeleton-text short" aria-label="Loading product name">
                &nbsp;
                </h3>
              <p className="skeleton-text medium"></p>
            </div>
          ))}
        </div>
      ) : user ? (
        products.length > 0 ? (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <div className="image-container">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="product-img"
                    onError={(e) => e.target.src = NO_IMAGE}
                  />
                </div>

                <h3 className="product-name">{product.name}</h3>
                <p className="price">₹{product.price}</p>

                {/* STOCK BADGE */}
                <div className="stock-container">
                  {getStockBadge(product.stock)}
                </div>

                {/* ADD TO CART BUTTON */}
                <button
                  onClick={() => addToCart(product.id, product.stock)}
                  disabled={product.stock === 0}
                  className={`add-to-cart ${product.stock === 0 ? 'disabled' : ''}`}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No products available.</p>
        )
      ) : (
        <p>Please <Link to="/login">login</Link> to view products.</p>
      )}
    </div>
  );
}

export default UserDashboard;