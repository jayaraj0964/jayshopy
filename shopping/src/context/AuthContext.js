// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const loadCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const cart = await api.getCart();
      setCartCount(cart.items?.length || 0);
      setUser({ loggedIn: true });
    } catch (err) {
      localStorage.removeItem('token');
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const login = async (email, password) => {
    await api.login(email, password);
    await loadCart();
  };

 const logout = () => {
  localStorage.removeItem('token');
  setUser(null);
  setCartCount(0); // ← Clear cart count
//   setProducts([]); // ← Optional: clear products in state if stored
};

  const updateCartCount = async () => {
    await loadCart();
  };

  return (
    <AuthContext.Provider value={{
      user,
      cartCount,
      login,
      logout,
      updateCartCount
    }}>
      {children}
    </AuthContext.Provider>
  );
};