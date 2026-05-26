import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { User, Mail, Phone, Shield, ArrowLeft, ShoppingBag } from 'lucide-react';
import './ProfilePage.css';

const API_URL = 'https://jayshoppy3-backend-2.onrender.com/api';
const getToken = () => localStorage.getItem('token');

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error("Please login first");
          navigate('/login');
          return;
        }

        const res = await fetch(`${API_URL}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Session expired, please login again");
            navigate('/login');
            return;
          }
          throw new Error("Failed to fetch profile details");
        }

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Profile Fetch Error:", err);
        toast.error(err.message || "Something went wrong loading profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="profile-container-loading">
        <div className="loader">⌛ Loading your profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container-error">
        <p>Could not load user profile details.</p>
        <button onClick={() => navigate('/')} className="btn-back">Go to Home</button>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      <div className="profile-card animate-fade-in">
        <div className="profile-header">
          <div className="avatar-circle">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h1>{profile.name || "User Profile"}</h1>
          <p className="profile-badge">
            <Shield size={16} className="inline-icon" /> {profile.role || "USER"}
          </p>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <div className="detail-icon"><User size={20} /></div>
            <div className="detail-content">
              <label>Full Name</label>
              <span>{profile.name}</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon"><Mail size={20} /></div>
            <div className="detail-content">
              <label>Email Address</label>
              <span>{profile.email}</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon"><Phone size={20} /></div>
            <div className="detail-content">
              <label>Phone Number</label>
              <span>{profile.phone || "Not Provided"}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={() => navigate('/orders')} className="btn-action primary-action">
            <ShoppingBag size={20} /> View My Orders
          </button>
          <button onClick={() => navigate('/')} className="btn-action secondary-action">
            <ArrowLeft size={20} /> Back to Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
