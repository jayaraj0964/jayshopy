// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, cartCount, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // SAFE: Only set admin if user exists
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  // SAFE: Get display name only if user exists
  const getDisplayName = () => {
    if (!user || !user.email) return 'Account';
    return user.email.split('@')[0];
  };

  return (
    <div className="navbar-main bg-white shadow-md sticky top-0 z-50">
      <div className="navbar-container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="logo flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <span className="logo-text text-xl font-bold">Jay Shop</span>
        </Link>

        {/* Search */}
        <div className="search-bar hidden md:flex flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Search for products, brands and more"
            className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none"
          />
          <button className="bg-blue-600 text-white px-4 rounded-r-lg hover:bg-blue-700">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="nav-actions flex items-center gap-6">

          {/* ADMIN DASHBOARD BUTTON */}
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition"
            >
              <Package className="w-5 h-5" />
              Admin
            </Link>
          )}

          {/* USER DROPDOWN */}
          {user ? (
            <div className="dropdown relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="dropdown-toggle flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium"
              >
                <User className="w-5 h-5" />
                <span>{getDisplayName()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                  <Link to="/profile" className="dropdown-item block px-4 py-2 hover:bg-gray-100">My Profile</Link>
                  <Link to="/orders" className="dropdown-item block px-4 py-2 hover:bg-gray-100">My Orders</Link>
                  {isAdmin && (
                    <Link to="/admin" className="dropdown-item block px-4 py-2 hover:bg-gray-100 text-purple-600 font-medium">
                      Admin Dashboard
                    </Link>
                  )}
                  <hr />
                  <button onClick={handleLogout} className="dropdown-item w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="auth-btn text-blue-600 font-medium hover:underline">Login</Link>
              <Link to="/register" className="auth-btn bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Register</Link>
            </>
          )}

          {/* CART */}
          <Link to="/cart" className="cart-btn relative flex items-center gap-1 text-gray-700 hover:text-blue-600">
            <ShoppingCart className="w-6 h-6" />
            <span className="hidden md:inline">Cart</span>
            {cartCount > 0 && (
              <span className="cart-badge absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}