// src/config.js  ← NEW FILE CREATE CHEY

const CONFIG = {
  // development: {
  //   API_URL: 'http://localhost:8080/api'  // Local backend
  // },
  production: {
    API_URL: 'http://localhost:8080/api'
    // 'https://jayshopfinal2.onrender.com/api'  // Live Render
  }
};

// Automatically detect environment
const env = process.env.NODE_ENV || 'development';
const currentConfig = CONFIG[env];

// For Vercel/Netlify/Render frontend deployment
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  currentConfig.API_URL =
  // 'https://jayshopfinal2.onrender.com/api'
    'http://localhost:8080/api';
}

export const API_URL = currentConfig.API_URL;
export default CONFIG;