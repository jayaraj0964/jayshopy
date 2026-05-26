import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const { updateCartCount } = useAuth();

  // Priority: URL → localStorage → fallback
  const urlOrderId = searchParams.get('order_id');
  const pendingOrderId = localStorage.getItem('pendingDbOrderId');
  const rawOrderId = urlOrderId || pendingOrderId;

  // Normalize Order ID (handles ORD_123 or 123) by stripping the ORD_ prefix
  const finalOrderId = rawOrderId ? String(rawOrderId).replace(/^ORD_/, '').trim() : null;

  useEffect(() => {
    if (!finalOrderId || orderConfirmed) return;

    // Confetti for 8 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 8000);

    // Start polling only once
    const pollOrderStatus = async () => {
      toast.loading("Confirming your payment with server...", { 
        id: "confirming", 
        duration: 60000 
      });

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Please login again");
        navigate('/login');
        return;
      }

      const maxAttempts = 20; // 20 × 2.5s = 50 seconds max wait
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`https://jayshoppy3-backend-2.onrender.com/api/user/order-status/${finalOrderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "PAID") {
              clearInterval(interval);
              localStorage.removeItem('pendingDbOrderId'); // Clear old data
              setOrderConfirmed(true);
              toast.dismiss("confirming");
              toast.success("Order Confirmed! Thank you for shopping with Jayshopy!", {
                duration: 6000,
                icon: "Success"
              });
              updateCartCount(); // Refresh the cart count in UI
            }
          }

          // Stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            toast.dismiss("confirming");
            toast("Taking longer than usual. Check Orders page.", { icon: "Info" });
          }
        } catch (err) {
          console.log("Polling... still waiting for server confirmation");
        }
      }, 2500);

      return () => {
        clearInterval(interval);
        clearTimeout(confettiTimer);
      };
    };

    pollOrderStatus();
  }, [finalOrderId, orderConfirmed, navigate]);

  return (
    <>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />}

      <div className="min-h-screen bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-black opacity-20"></div>
        
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-12 max-w-4xl w-full text-center transform transition-all hover:scale-[1.02]">
          <div className="mb-10">
            <CheckCircle className="w-32 h-32 mx-auto text-green-600 animate-bounce" />
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-6">
            Payment Successful!
          </h1>

          <p className="text-2xl md:text-4xl text-gray-700 font-semibold mb-4">
            Thank you for your order!
          </p>

          {finalOrderId && (
            <div className="bg-gray-100 rounded-2xl py-6 px-10 inline-block mb-8">
              <p className="text-lg text-gray-600">Your Order ID</p>
              <p className="text-3xl font-bold text-emerald-600 tracking-wider">
                {finalOrderId}
              </p>
            </div>
          )}

          <p className="text-xl text-gray-600 mb-10">
            {orderConfirmed 
              ? "Your order has been confirmed and is being processed."
              : "We're confirming your payment... Please wait a moment."}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate('/orders')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-6 rounded-2xl text-2xl font-bold flex items-center justify-center gap-3 transition transform hover:scale-105 shadow-xl"
            >
              <ShoppingBag size={32} />
              View My Orders
            </button>

            <button
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-6 rounded-2xl text-2xl font-bold transition transform hover:scale-105 shadow-xl"
            >
              Continue Shopping
            </button>
          </div>

          <div className="mt-12 text-gray-500 text-lg">
            <p>You will receive an email confirmation shortly.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderSuccess;