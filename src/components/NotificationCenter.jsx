import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { setupForegroundNotificationListener } from '../services/firebaseMessaging';

const NotificationCenter = ({ role, userId, restaurantId }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);
  const { token } = useAuthStore();
  
  useEffect(() => {
    fetchNotifications();

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token: token || localStorage.getItem('qb-auth-token') || localStorage.getItem('token') },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[NotificationCenter] Connected to socket');
      if (userId) socket.emit('join', `user_${userId}`);
      if (restaurantId) socket.emit('join', `restaurant_${restaurantId}`);
      if (role === 'admin') socket.emit('join', 'admin_room');
      if (role === 'delivery' && userId) socket.emit('join', `delivery_${userId}`);
      if ((role === 'customer' || role === 'user') && userId) socket.emit('join', `customer_${userId}`);
    });

    const SOUND_NOTIFICATION_TYPES = new Set([
      'NEW_ORDER_RESTAURANT',
      'ORDER_REJECTED_CUSTOMER',
      'DELIVERY_ASSIGNED_RIDER'
    ]);

    socket.on('notification:new', (notif) => {
      console.log('[NotificationCenter] Received new notification', notif);
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      if (SOUND_NOTIFICATION_TYPES.has(notif.type)) {
        playNotificationSound();
      }
    });

    // Also attach foreground Web Push listener
    let unsubscribePush = () => {};
    setupForegroundNotificationListener((payload) => {
      console.log('[NotificationCenter] Foreground FCM push notification:', payload);
      fetchNotifications();
    }).then(unsub => {
      if (typeof unsub === 'function') unsubscribePush = unsub;
    });

    return () => {
      socket.disconnect();
      unsubscribePush();
    };
  }, [userId, restaurantId, token]);

  const fetchNotifications = async () => {
    const activeToken = token || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');
    if (!activeToken) return;

    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.notifications || []);
        setNotifications(list);
        const unread = typeof data.unreadCount === 'number' ? data.unreadCount : list.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed (browser policy)', e));
    }
  };

  const markAsRead = async (id) => {
    const activeToken = token || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');
    if (!activeToken) return;

    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    const activeToken = token || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');
    if (!activeToken) return;

    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif._id);
    }
    const meta = notif.metadata || notif.data || {};
    const orderId = notif.orderId || meta.orderId || notif.rideId || meta.rideId;
    const recipientRole = notif.recipientRole || meta.recipientRole || role;

    if (recipientRole === 'restaurant' || meta.screen === 'restaurant-orders') {
      navigate('/restaurant-dashboard');
    } else if (recipientRole === 'delivery' || meta.screen === 'rider-orders') {
      navigate('/delivery-dashboard');
    } else if (recipientRole === 'admin' || meta.screen === 'admin-orders') {
      navigate('/admin-dashboard');
    } else if (orderId) {
      navigate(`/order-tracking/${orderId}`);
    } else if (notif.link || meta.link) {
      navigate(notif.link || meta.link);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      {/* Audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-black focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-100"
          >
            <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No new notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif._id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${!notif.read ? 'bg-blue-50/50' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-semibold ${!notif.read ? "text-blue-800" : "text-gray-800"}`}>{notif.title}</h4>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1"></span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
