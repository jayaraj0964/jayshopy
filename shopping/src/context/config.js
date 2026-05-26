// src/config.js  ← NEW FILE CREATE CHEY

const CONFIG = {
  production: {
    API_URL: 'https://jayshoppy3-backend-2.onrender.com/api'
  }
};

// Automatically detect environment
const env = process.env.NODE_ENV || 'development';
const currentConfig = CONFIG[env];

// For Vercel/Netlify/Render frontend deployment
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  currentConfig.API_URL = 'https://jayshoppy3-backend-2.onrender.com/api';
}

export const API_URL = currentConfig.API_URL;
export default CONFIG;