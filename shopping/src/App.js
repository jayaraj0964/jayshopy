// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import FlipkartNavbar from './components/Navbar';
import UserDashboard from './components/UserDashboard';
import CartPage from './components/CartPage';
import Login from './components/Login';
import Register from './components/Register';
import ProductForm from './components/ProductForm';
import PrivateRoute from './components/PrivateRoute';
import CheckoutPage from './components/CheckoutPage';
import OrderSuccessPage from './components/OrderSuccessPage';
import { Toaster } from 'react-hot-toast';
import AdminDashboard from './components/AdminDashboard';
import UserOrdersPage from './components/UserOrdersPage';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <Router>
        <FlipkartNavbar />  {/* ← Navbar everywhere */}

        <Routes>
          {/* HOME = Products */}
          <Route path="/" element={<UserDashboard />} />

          {/* CART */}
          <Route path="/cart" element={<CartPage />} />

          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* REGISTER */}
          <Route path="/register" element={<Register />} />

          <Route path='/checkout' element={<CheckoutPage />} />

          <Route path="/order-success" element={<OrderSuccessPage />} />
         
         <Route path="/admindashboard" element={<AdminDashboard />} />

        <Route path="/orders" element={<UserOrdersPage />} />

          {/* ADMIN */}
          <Route
            path="/createproduct"
            element={
              <PrivateRoute adminOnly>
                <ProductForm />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;