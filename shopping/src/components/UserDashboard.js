// src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import { X, Sparkles, Upload, RefreshCw, ShoppingCart } from 'lucide-react';
import './UserDashboard.css';

const NO_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABABJRU5ErkJggg==";

function UserDashboard() {
  const { user, cartCount, updateCartCount } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('search') || '';

  // AI Try-on states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userTryOnImage, setUserTryOnImage] = useState(null);
  const [userTryOnPreview, setUserTryOnPreview] = useState(null);
  const [aiResultImage, setAiResultImage] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingStep, setAiLoadingStep] = useState('');

  const handleTryOnImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserTryOnImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserTryOnPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setAiResultImage(null);
    }
  };

  const triggerAiTryOn = async () => {
    if (!userTryOnImage || !selectedProduct) {
      toast.error('Please upload your photo first!');
      return;
    }
    
    setAiLoading(true);
    setAiResultImage(null);

    const steps = [
      'Initializing Virtual Try-On Engine...',
      'Extracting clothing silhouette from product image...',
      'Detecting body landmarks and human pose keypoints...',
      'Warping fabric texture to match pose contours...',
      'Synthesizing lighting, shadow gradients, and details...',
      'Blending finalized try-on image...'
    ];

    let stepIdx = 0;
    setAiLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setAiLoadingStep(steps[stepIdx]);
      }
    }, 1200);

    try {
      const prodImageBase64 = getProductImage(selectedProduct);
      const res = await api.tryOn(userTryOnImage, prodImageBase64);
      clearInterval(stepInterval);
      setAiResultImage(res.resultImage);
      toast.success('AI Try-on Completed!');
    } catch (err) {
      clearInterval(stepInterval);
      toast.error(err.message || 'AI Try-on failed. Try another image.');
    } finally {
      setAiLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setUserTryOnImage(null);
    setUserTryOnPreview(null);
    setAiResultImage(null);
    setAiLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [user, navigate]);

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    );
  });

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
        filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className="product-card clickable-card"
                onClick={() => setSelectedProduct(product)}
              >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product.id, product.stock);
                  }}
                  disabled={product.stock === 0}
                  className={`add-to-cart ${product.stock === 0 ? 'disabled' : ''}`}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>{searchQuery ? `No products match "${searchQuery}"` : 'No products available.'}</p>
        )
      ) : (
        <p>Please <Link to="/login">login</Link> to view products.</p>
      )}

      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => closeModal()}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => closeModal()}>
              <X className="w-6 h-6" />
            </button>
            
            <div className="modal-grid">
              {/* Left Column: Product Image */}
              <div className="modal-left">
                <div className="modal-image-container">
                  <img
                    src={getProductImage(selectedProduct)}
                    alt={selectedProduct.name}
                    className="modal-product-img"
                  />
                </div>
                <div className="modal-product-meta">
                  <span className="modal-product-category">{selectedProduct.category || 'General'}</span>
                  {getStockBadge(selectedProduct.stock)}
                </div>
              </div>

              {/* Right Column: Details & AI Try-On */}
              <div className="modal-right">
                <h2 className="modal-product-name">{selectedProduct.name}</h2>
                <div className="modal-price-row">
                  <span className="modal-price">₹{selectedProduct.price}</span>
                  {selectedProduct.vendorShopName && (
                    <span className="modal-shop-name">Sold by: {selectedProduct.vendorShopName}</span>
                  )}
                </div>
                
                <p className="modal-description">
                  {selectedProduct.description || 'No description available for this premium product.'}
                </p>

                <div className="modal-spec-grid">
                  {selectedProduct.color && (
                    <div className="spec-item">
                      <span className="spec-label">Color:</span>
                      <span className="spec-value">{selectedProduct.color}</span>
                    </div>
                  )}
                  {selectedProduct.size && (
                    <div className="spec-item">
                      <span className="spec-label">Size:</span>
                      <span className="spec-value">{selectedProduct.size}</span>
                    </div>
                  )}
                </div>

                {/* AI Try-on Workbench */}
                <div className="ai-tryon-box">
                  <div className="ai-tryon-header">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <h3>AI Virtual Try-On Room</h3>
                  </div>

                  {!userTryOnPreview ? (
                    <div className="ai-upload-placeholder">
                      <Upload className="w-8 h-8 text-slate-500 mb-2" />
                      <p>Upload a portrait of yourself to try on this garment virtually!</p>
                      <label className="ai-upload-btn">
                        Select Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTryOnImageChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="ai-workspace">
                      <div className="ai-split-view">
                        <div className="ai-preview-panel">
                          <span>Your Photo</span>
                          <img src={userTryOnPreview} alt="User Preview" className="ai-preview-img" />
                        </div>
                        <div className="ai-result-panel">
                          <span>AI Try-on Result</span>
                          {aiLoading ? (
                            <div className="ai-loader-container">
                              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                              <p className="ai-loader-text">{aiLoadingStep}</p>
                            </div>
                          ) : aiResultImage ? (
                            <img src={aiResultImage} alt="AI Try-on Output" className="ai-result-img" />
                          ) : (
                            <div className="ai-result-placeholder">
                              <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                              <p>Click "Generate" to visualize this garment on you!</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ai-actions-row">
                        <label className="ai-action-btn secondary">
                          Change Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleTryOnImageChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        
                        <button
                          onClick={triggerAiTryOn}
                          disabled={aiLoading}
                          className="ai-action-btn primary"
                        >
                          <Sparkles className="w-4 h-4" />
                          {aiLoading ? 'Compositing...' : 'Generate Try-On'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Add to Cart Button */}
                <button
                  onClick={() => {
                    addToCart(selectedProduct.id, selectedProduct.stock);
                    closeModal();
                  }}
                  disabled={selectedProduct.stock === 0}
                  className="modal-add-to-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;