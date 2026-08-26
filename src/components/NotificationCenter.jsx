import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Filter, UtensilsCrossed, ShoppingBag, Bike, Tag, CreditCard, ShieldAlert, Sparkles, Check } from 'lucide-react';

const SERVICE_ICONS = {
  FOOD: { icon: UtensilsCrossed, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  GROCERY: { icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  BAKERY: { icon: Sparkles, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200' },
  VEG_FRUITS: { icon: ShoppingBag, color: 'text-green-500 bg-green-50 dark:bg-green-950/40 border-green-200' },
  MEAT: { icon: ShoppingBag, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  RIDE: { icon: Bike, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  COURIER: { icon: Bike, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
  PAYMENT: { icon: CreditCard, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  OFFER: { icon: Tag, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  SYSTEM: { icon: ShieldAlert, color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200' },
  GENERAL: { icon: Bell, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' }
};

const NotificationCenter = ({ userId, role, restaurantId }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [toastNotif, setToastNotif] = useState(null);
  const dropdownRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchNotifications();

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      if (userId) socket.emit('join', `user_${userId}`);
      if (restaurantId) socket.emit('join', `restaurant_${restaurantId}`);
      if (role === 'admin') socket.emit('join', 'admin_room');
      if (role === 'store_operator') socket.emit('join', 'store_operator_room');
    });

    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      setToastNotif(notif);
      setTimeout(() => setToastNotif(null), 5000);
      playNotificationSound();
    });

    // Re-sync on window focus
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);

    // Close on outside click
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.disconnect();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId, restaurantId, role]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications?limit=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
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
    setIsOpen(false);
    setToastNotif(null);

    // Deep navigation mapping
    if (notif.targetType === 'order' || notif.targetType === 'store_order') {
      if (role === 'admin') navigate('/admin-dashboard');
      else if (role === 'store_operator') navigate('/store-operations');
      else if (role === 'delivery') navigate('/delivery-dashboard');
      else if (notif.orderId) navigate(`/order-tracking/${notif.orderId}`);
      else navigate('/orders');
    } else if (notif.targetType === 'ride') {
      navigate('/ride');
    } else if (notif.targetType === 'offer') {
      if (notif.serviceType === 'GROCERY') navigate('/restaurants?category=grocery');
      else if (notif.serviceType === 'BAKERY') navigate('/restaurants?category=cool_hot');
      else if (notif.serviceType === 'VEG_FRUITS') navigate('/restaurants?category=veg_fruits');
      else if (notif.serviceType === 'MEAT') navigate('/restaurants?category=meat');
      else navigate('/restaurants');
    } else if (notif.targetType === 'inventory') {
      navigate('/store-operations');
    }
  };

  // Filter notifications by tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'FOOD') return n.serviceType === 'FOOD';
    if (activeTab === 'STORE') return ['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].includes(n.serviceType);
    if (activeTab === 'RIDE') return ['RIDE', 'COURIER'].includes(n.serviceType);
    if (activeTab === 'OFFERS') return n.serviceType === 'OFFER';
    if (activeTab === 'OTHERS') return !['FOOD', 'GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT', 'RIDE', 'COURIER', 'OFFER'].includes(n.serviceType);
    return true;
  });

  // Group notifications by date
  const groupNotifications = (list) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    list.forEach(item => {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    return groups;
  };

  const grouped = groupNotifications(filteredNotifications);

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'FOOD', label: 'Food' },
    { id: 'STORE', label: 'Store' },
    { id: 'RIDE', label: 'Ride' },
    { id: 'OFFERS', label: 'Offers' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Real-time Toast Alert */}
      <AnimatePresence>
        {toastNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={() => { handleNotificationClick(toastNotif); setToastNotif(null); }}
            className="fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-slate-700 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:border-orange-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{toastNotif.title}</h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1">{toastNotif.message}</p>
            </div>
            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 shrink-0">View →</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification List with Time Groups */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 mx-auto flex items-center justify-center mb-2">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No notifications found</p>
                  <p className="text-xs text-gray-400 mt-0.5">We'll alert you when updates arrive.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([groupTitle, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={groupTitle} className="p-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-slate-800/30 rounded">
                        {groupTitle}
                      </div>
                      {items.map(notif => {
                        const sType = notif.serviceType || 'GENERAL';
                        const cfg = SERVICE_ICONS[sType] || SERVICE_ICONS.GENERAL;
                        const IconComp = cfg.icon;

                        return (
                          <div
                            key={notif._id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`group relative p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 my-0.5 ${
                              !notif.read
                                ? 'bg-orange-50/40 dark:bg-orange-950/20 hover:bg-orange-50/80 dark:hover:bg-orange-950/40'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className={`text-xs font-bold truncate ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.orderId && (
                                <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                                  ID: #{notif.orderId.slice(-6).toUpperCase()}
                                </span>
                              )}
                            </div>

                            {!notif.read && (
                              <button
                                onClick={(e) => markAsRead(notif._id, e)}
                                title="Mark read"
                                className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1 hover:scale-125 transition-transform"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-800 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 inline-flex items-center gap-1"
              >
                View Full Notification History
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
