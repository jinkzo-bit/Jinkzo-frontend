import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatAppDate } from '../utils/dateUtils';

export default function Orders() {
  const [activeTab, setActiveTab] = useState('Running'); // 'Running' | 'History'
  const { token } = useAuthStore();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Fetch order history error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchOrderHistory();
    }
  }, [token]);

  // Filter orders
  const runningOrders = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status));
  
  const displayedOrders = activeTab === 'Running' ? runningOrders : historyOrders;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24">
      {/* Header */}
      <header className="pt-4 pb-4 px-4 flex justify-center items-center border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="font-bold text-lg text-gray-900">My Orders</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('Running')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'Running' ? 'text-primary' : 'text-gray-400'}`}
        >
          Running
          {activeTab === 'Running' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('History')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'History' ? 'text-primary' : 'text-gray-400'}`}
        >
          History
          {activeTab === 'History' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : displayedOrders.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center px-4 mt-20">
          <div className="relative mb-6 text-gray-300">
            {/* Custom Illustration SVG Matching the Design */}
            <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 100 L160 100 L140 150 L60 150 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
              <path d="M110 130 H120" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <path d="M90 130 H100" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <rect x="120" y="50" width="60" height="40" rx="20" stroke="currentColor" strokeWidth="4"/>
              <path d="M140 60 L160 80 M160 60 L140 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="100" cy="70" r="10" stroke="currentColor" strokeWidth="4"/>
              <path d="M60 80 L70 90 M70 80 L60 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <path d="M160 70 L170 80 M170 70 L160 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="40" cy="50" r="5" stroke="currentColor" strokeWidth="4"/>
            </svg>
          </div>
          <h2 className="text-gray-400 font-semibold text-lg">No order found</h2>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayedOrders.map(order => (
            <div key={order._id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col gap-3 cursor-pointer" onClick={() => navigate(`/order-tracking/${order._id}`)}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase">{order.status}</span>
              </div>
              <p className="text-sm text-gray-500">{formatAppDate(order.createdAt)}</p>
              <div className="text-sm font-semibold text-gray-800">
                ₹{order.totalAmount?.toFixed(2)} • {order.items?.length || 0} items
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
