// src/pages/OrderSuccess.jsx → FIXED VERSION (Copy-Paste chey)

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pollingStarted, setPollingStarted] = useState(false);

  const params = new URLSearchParams(location.search);
  const urlOrderId = params.get('order_id');
  const pendingDbId = localStorage.getItem('pendingDbOrderId');
  const dbOrderId = urlOrderId || pendingDbId;

  useEffect(() => {
    if (!dbOrderId || pollingStarted) return;

    setPollingStarted(true);
    toast.loading("Confirming your payment...", { id: "confirm" });

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`http://localhost:8080/api/user/order-status/${dbOrderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();

        if (data.status === "PAID") {
          clearInterval(interval);
          localStorage.removeItem('pendingDbOrderId');
          toast.dismiss("confirm");
          toast.success("Order confirmed successfully!");
        }
      } catch (err) {
        // Silent fail – keep polling
      }
    }, 2500);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      toast.dismiss("confirm");
    };
  }, [dbOrderId, pollingStarted]); // ← Fixed dependency warning

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-3xl p-20 text-center max-w-2xl">
        <h1 className="text-8xl font-black text-green-600 mb-8">Payment Successful!</h1>
        <p className="text-4xl text-gray-700 mb-6">Thank you for your order!</p>
        {dbOrderId && (
          <p className="text-3xl text-gray-600 mb-10">Order ID: <strong>{dbOrderId}</strong></p>
        )}
        <button
          onClick={() => navigate('/products')}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-16 py-8 rounded-3xl text-4xl font-bold hover:scale-110 transition shadow-2xl"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default OrderSuccess;