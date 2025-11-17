// src/components/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import './AdminDashboard.css';
import { Pencil, Trash2, Plus, Search, Package, Users, X, ShoppingBag, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const NO_IMAGE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5OTyBJTUc8L3RleHQ+PC9zdmc+";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState({});


  const loadData = useCallback(async () => {
      try {
      setLoading(true);
      if (activeTab === 'products') {
        const prodRes = await api.getAllProductsAdmin();
        setProducts(prodRes);
      } else if (activeTab === 'users') {
        const userRes = await api.getAllUsers();
        setUsers(userRes);
      } else if (activeTab === 'orders') {
        const orderRes = await api.getAllOrdersAdmin();
        setOrders(orderRes);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
}, [activeTab]);
useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (p) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      category: p.category
    });
    setShowEditModal(true);
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    try {
      await api.updateProduct(editingProduct.id, editFormData);
      toast.success('Product updated!');
      setShowEditModal(false);
      setEditingProduct(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.deleteProduct(id);
      toast.success('Product deleted!');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateUserRole = async (userId) => {
    const role = userRole[userId];
    if (!role) return;
    try {
      await api.updateUserRole(userId, role);
      toast.success('Role updated!');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-dashboard">
        <div className="admin-container">

          {/* Header */}
          <div className="admin-header">
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Manage products, users, and orders</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-container">
            <button onClick={() => setActiveTab('products')} className={`stat-card ${activeTab === 'products' ? 'active' : ''}`}>
              <Package className="w-5 h-5" /> <span>{products.length} Products</span>
            </button>
            <button onClick={() => setActiveTab('users')} className={`stat-card ${activeTab === 'users' ? 'active' : ''}`}>
              <Users className="w-5 h-5" /> <span>{users.length} Users</span>
            </button>
            <button onClick={() => setActiveTab('orders')} className={`stat-card ${activeTab === 'orders' ? 'active' : ''}`}>
              <ShoppingBag className="w-5 h-5" /> <span>{orders.length} Orders</span>
            </button>
          </div>

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div>
              <div className="section-header">
                <div className="section-icon green">
                  <ShoppingBag className="w-6 h-6" style={{ color: 'white' }} />
                </div>
                <div>
                  <h2 className="section-title">Product Management</h2>
                  <p className="section-subtitle">Update, edit or remove products</p>
                </div>
              </div>

              <div className="search-actions">
                <div className="search-container">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <a href="http://localhost:3000/createproduct" className="add-button" target="_blank" rel="noopener noreferrer">
                  <Plus className="w-5 h-5" /> Add Product
                </a>
              </div>

              <div className="products-list">
                {filteredProducts.map(p => (
                  <div key={p.id} className="product-card">
                    <div className="product-content">
                      <div className="product-image">
                        {p.images && p.images.length > 0 && p.images[0].base64Image ? (
                          <img src={p.images[0].base64Image} alt={p.name} onError={(e) => { e.target.src = NO_IMAGE; }} />
                        ) : (
                          <Package className="w-16 h-16" style={{ color: '#ca8a04' }} />
                        )}
                      </div>
                      <div className="product-details">
                        <div>
                          <h3 className="product-name">{p.name}</h3>
                          <p className="product-description">{p.description || 'No description'}</p>
                          <div className="product-badges">
                            <span className="badge green">₹{p.price}</span>
                            <span className="badge blue">{p.stock} in stock</span>
                          </div>
                        </div>
                      </div>
                      <div className="product-actions">
                        <button onClick={() => startEdit(p)} className="action-button primary">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="action-button secondary">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <div className="section-header">
                <div className="section-icon purple">
                  <Users className="w-6 h-6" style={{ color: 'white' }} />
                </div>
                <div>
                  <h2 className="section-title">User Management</h2>
                  <p className="section-subtitle">Manage user roles and permissions</p>
                </div>
              </div>
              <div className="users-list">
                {users.map(u => (
                  <div key={u.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="user-name">{u.name}</p>
                        <p className="user-email">{u.email}</p>
                      </div>
                    </div>
                    <div className="user-actions">
                      <select
                        value={userRole[u.id] || u.role}
                        onChange={e => setUserRole({ ...userRole, [u.id]: e.target.value })}
                        className="role-select"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button onClick={() => updateUserRole(u.id)} className="update-button">
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ORDERS TAB – ALL USERS */}
          {activeTab === 'orders' && (
            <div>
              <div className="section-header">
                <div className="section-icon blue">
                  <ShoppingBag className="w-6 h-6" style={{ color: 'white' }} />
                </div>
                <div>
                  <h2 className="section-title">All Orders</h2>
                  <p className="section-subtitle">View orders from all users</p>
                </div>
              </div>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No orders yet.</p>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">Order #{order.id}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString('en-IN')} at{' '}
                            {new Date(order.orderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="font-medium">Customer ID</p>
                          <p className="text-gray-600">User #{order.userId}</p>
                        </div>
                        <div>
                          <p className="font-medium">Total Amount</p>
                          <p className="text-lg font-bold">₹{order.total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Items</p>
                          <p>{order.items.length} product(s)</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="font-medium mb-2">Order Items:</p>
                        <div className="space-y-1 text-sm">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.productName || 'Unknown'} × {item.quantity}</span>
                              <span>₹{item.priceAtPurchase.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <p className="font-medium">Shipping Address:</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress || 'Not provided'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">Edit Product</h3>
                <button onClick={() => setShowEditModal(false)} className="close-button">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="modal-description">Make changes to the product details below</p>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input type="text" value={editFormData.name || ''} onChange={(e) => handleEditChange('name', e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={editFormData.description || ''} onChange={(e) => handleEditChange('description', e.target.value)} rows={3} className="form-textarea" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input type="number" step="0.01" value={editFormData.price || ''} onChange={(e) => handleEditChange('price', e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input type="number" value={editFormData.stock || ''} onChange={(e) => handleEditChange('stock', e.target.value)} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" value={editFormData.category || ''} onChange={(e) => handleEditChange('category', e.target.value)} className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="modal-button cancel">Cancel</button>
              <button onClick={saveProduct} className="modal-button save">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}