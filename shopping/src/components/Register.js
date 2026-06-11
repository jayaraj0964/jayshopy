// components/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import shoppingHeroImage from './shopping_login_hero.jpg';
import './Auth.css'; // Reuse same CSS

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // VALIDATIONS
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone must be 10 digits');
      setLoading(false);
      return;
    }

    try {
      await api.register(form);
      alert('Registration Successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-hero">
          <div className="auth-hero-content">
            <div className="brand-logo">
              <span className="brand-icon">🛍️</span>
              <span className="brand-name">Jay Shop</span>
            </div>
            <h1>Join a community of smart shoppers.</h1>
            <p>Create an account to save your favorite products, view order history, and receive exclusive offers.</p>
          </div>
          <div className="auth-hero-img-wrap">
            <img src={shoppingHeroImage} alt="Shopping Illustration" className="auth-hero-img" />
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Create Account</h2>
            <p>Get started with your free account today</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <p className="switch-auth">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}