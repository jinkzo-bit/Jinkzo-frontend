import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  ArrowLeft,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Tag,
  CreditCard,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const SERVICE_ICONS = {
  FOOD: { icon: UtensilsCrossed, label: 'Food', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' },
  GROCERY: { icon: ShoppingBag, label: 'Grocery', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
  BAKERY: { icon: Sparkles, label: 'Bakery', color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/50' },
  VEG_FRUITS: { icon: ShoppingBag, label: 'Veg & Fruits', color: 'text-green-500 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/50' },
  MEAT: { icon: ShoppingBag, label: 'Meat', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' },
  RIDE: { icon: Bike, label: 'Ride', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' },
  COURIER: { icon: Bike, label: 'Courier', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50' },
  PAYMENT: { icon: CreditCard, label: 'Payment', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50' },
  OFFER: { icon: Tag, label: 'Offer', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50' },
  SYSTEM: { icon: ShieldAlert, label: 'System', color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' },
  GENERAL: { icon: Bell, label: 'General', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRead, setFilterRead] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, filterRead, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications?page=${page}&limit=25`;
      if (activeTab !== 'ALL') {
        url += `&serviceType=${activeTab}`;
      }
      if (filterRead === 'unread') {
        url += '&unreadOnly=true';
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setPagination(data.pagination || { totalPages: 1, totalCount: 0 });
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
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

    const role = user?.role;
    if (notif.targetType === 'order' || notif.targetType === 'store_order') {
      if (role === 'admin') navigate('/admin');
      else if (role === 'store_operator') navigate('/store-operations');
      else if (role === 'delivery') navigate('/delivery');
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

  // Filter by local search query
  const searchedNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.message && n.message.toLowerCase().includes(q)) ||
      (n.orderId && n.orderId.toLowerCase().includes(q))
    );
  });

  // Group by date
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

  const grouped = groupNotifications(searchedNotifications);

  const tabs = [
    { id: 'ALL', label: 'All Notifications' },
    { id: 'FOOD', label: 'Food 🍴' },
    { id: 'STORE', label: 'Store 🛒' },
    { id: 'RIDE', label: 'Ride & Courier 🛵' },
    { id: 'OFFER', label: 'Offers & Deals 🏷️' },
    { id: 'PAYMENT', label: 'Payments 💳' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back and Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-500 text-white shadow-sm">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Stay updated with your orders, rides, offers, and account alerts
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 rounded-xl border border-orange-200 dark:border-orange-900/40 transition-colors self-start sm:self-auto shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications or orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Timeline */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium">Loading notifications...</p>
          </div>
        ) : searchedNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-slate-800 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No notifications here</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              You don't have any updates in this category right now. New activity will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {groupName}
                    </span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                  </div>

                  <div className="space-y-2.5">
                    {items.map(notif => {
                      const sType = notif.serviceType || 'GENERAL';
                      const cfg = SERVICE_ICONS[sType] || SERVICE_ICONS.GENERAL;
                      const IconComp = cfg.icon;

                      return (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                            !notif.read
                              ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40 shadow-sm hover:shadow-md hover:border-orange-300'
                              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${cfg.color}`}>
                            <IconComp className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                                  {cfg.label}
                                </span>
                                <h3 className={`text-sm font-bold truncate ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notif.title}
                                </h3>
                              </div>
                              <span className="text-[11px] text-gray-400 shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                              {notif.message}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between">
                              {notif.orderId ? (
                                <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                                  Order #{notif.orderId.slice(-6).toUpperCase()}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span></span>
                              )}

                              {!notif.read && (
                                <button
                                  onClick={(e) => markAsRead(notif._id, e)}
                                  className="text-[11px] font-semibold text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-gray-500">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
