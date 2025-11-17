// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUserAndCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;
      setUser({ loggedIn: true, role });

      const cart = await api.getCart();
      setCartCount(cart.items?.length || 0);
    } catch (err) {
      console.error('Auth load failed:', err);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndCart();
  }, []);

  const login = async (email, password) => {
    const token = await api.login(email, password);
    await loadUserAndCart();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCartCount(0);
  };

  const updateCartCount = async () => {
    try {
      const cart = await api.getCart();
      setCartCount(cart.items?.length || 0);
    } catch (err) {
      console.error('Failed to update cart count');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      cartCount,
      loading,
      login,
      logout,
      updateCartCount
    }}>
      {children}
    </AuthContext.Provider>
  );
};