// src/pages/UserOrdersPage.jsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import { Package, Search, CreditCard, ChevronRight, MapPin, Download, MessageCircle } from 'lucide-react';
import './UserOrdersPage.css';

export default function UserOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getUserOrders();
      setOrders(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = orders.filter(order =>
      order.id.toString().includes(searchQuery) ||
      order.items?.some(item =>
        item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredOrders(filtered);
  }, [orders, searchQuery]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="page-header">
        <Package className="icon-large" />
        <div>
          <h1>Order History</h1>
          <p>View your previous orders</p>
        </div>
      </div>

      {/* Search Only */}
      <div className="filters">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by order number or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <Package className="empty-icon" />
          <h3>No orders found</h3>
          <p>
            {searchQuery
              ? 'Try a different search'
              : "You haven't placed any orders yet"}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card" onClick={() => setSelectedOrder(order)}>
              <div className="card-header">
                <div>
                  <h3>Order #{order.id}</h3>
                  <p className="order-date">{formatDate(order.orderDate)}</p>
                </div>
                <button className="view-btn" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
                  View Details <ChevronRight className="chevron" />
                </button>
              </div>

              <div className="card-meta">
                <div className="meta-item">
                  <Package className="meta-icon" />
                  <span>{order.items?.length || 0} items</span>
                </div>
                <div className="meta-item">
                  <CreditCard className="meta-icon" />
                  <span className="price">₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="items-preview">
                {(order.items || []).slice(0, 3).map((item, idx) => (
                  <div key={item.productId || idx} className="item-row">
                    <div className="item-image-placeholder">
                      <img
                        src={item.productImageBase64}
                        alt={item.productName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>
                    <div className="item-info">
                      <p className="item-name">{item.productName}</p>
                      <p className="item-quantity">Qty: {item.quantity}</p>
                    </div>
                    <p className="item-price">
                      ₹{(item.priceAtPurchase * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                {(order.items?.length || 0) > 3 && (
                  <p className="more-items">
                    + {(order.items.length - 3)} more {(order.items.length - 3) === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

// === MODAL – NO STATUS, NO TAX, NO SHIPPING ===
function OrderDetailsModal({ order, onClose }) {
  const items = order.items || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Order Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="info-grid">
            <div>
              <p className="label">Order Number</p>
              <p>#{order.id}</p>
            </div>
            <div>
              <p className="label">Order Date</p>
              <p>{new Date(order.orderDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <hr />

          <div className="items-section">
            <h3>Items</h3>
            {items.map((item, idx) => (
              <div key={item.productId || idx} className="modal-item">
                <div className="modal-item-image">
                  <img
                    src={item.productImageBase64}
                    alt={item.productName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                </div>
                <div className="modal-item-details">
                  <p>{item.productName}</p>
                  <p>Qty: {item.quantity}</p>
                </div>
                <p>₹{(item.priceAtPurchase * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <hr />

          {/* ONLY TOTAL */}
          <div className="summary">
            <div className="summary-total">
              <span>Total Paid</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          {order.shippingAddress && (
            <>
              <hr />
              <div className="address">
                <h3>Shipping Address</h3>
                <p><MapPin className="inline-icon" /> {order.shippingAddress}</p>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="action-btn outline">
              <Download className="btn-icon" /> Download Invoice
            </button>
            <button className="action-btn outline">
              <MessageCircle className="btn-icon" /> Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}