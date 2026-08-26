import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Megaphone,
  Bike,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Eye,
  Trash2,
  Pencil,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Upload,
  Calendar,
  DollarSign,
  User,
  Phone,
  MapPin,
  Check,
  X,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../utils/uploadUtil';
import { formatAppDate, formatAppTimeOnly } from '../utils/dateUtils';
import { io } from 'socket.io-client';
import NotificationCenter from '../components/NotificationCenter';

const SERVICE_CONFIG = {
  GROCERY: { label: 'Grocery', badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', color: '#059669', icon: '🛒' },
  BAKERY: { label: 'Bakery & Beverages', badgeBg: 'bg-pink-500/10 text-pink-600 border-pink-500/20', color: '#db2777', icon: '🥐' },
  VEG_FRUITS: { label: 'Veg & Fruits', badgeBg: 'bg-teal-500/10 text-teal-600 border-teal-500/20', color: '#0d9488', icon: '🥦' },
  MEAT: { label: 'Meat', badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20', color: '#e11d48', icon: '🍗' }
};

export default function StoreOperationsDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sound Alert Preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Entities State
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [availableRiders, setAvailableRiders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState(null);

  const [toastMsg, setToastMsg] = useState({ text: '', type: 'success' });

  // Modals
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [showAssignRiderModal, setShowAssignRiderModal] = useState(false);
  const [targetOrderForRider, setTargetOrderForRider] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: 'success' }), 3500);
  };

  // Socket setup for live alerts
  useEffect(() => {
    if (!token) return;
    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join', 'store_operator_room');
      if (user?._id) socket.emit('join', `user_${user._id}`);
    });

    socket.on('newStoreOrder', (data) => {
      showToast(`🔔 New Store Order: ${data.order?.displayId || 'NEW'}`, 'info');
      fetchAnalytics();
      fetchOrders();
      if (soundEnabled) {
        try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
      }
    });

    socket.on('notification:new', (notif) => {
      if (['STORE_NEW_ORDER', 'STORE_LOW_STOCK', 'STORE_ORDER_PLACED'].includes(notif.type)) {
        showToast(`${notif.title}: ${notif.message}`, 'info');
        fetchAnalytics();
        fetchOrders();
        if (soundEnabled) {
          try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
        }
      }
    });

    socket.on('orderStatusChanged', () => {
      fetchAnalytics();
      fetchOrders();
    });

    return () => socket.disconnect();
  }, [token, soundEnabled, user?._id]);

  // Initial Data Fetching
  useEffect(() => {
    if (activeTab === 'dashboard') fetchAnalytics();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'categories') fetchCategories();
    else if (activeTab === 'inventory') fetchInventory();
    else if (activeTab === 'advertisements') fetchAdvertisements();
    else if (activeTab === 'dispatch') { fetchOrders(); fetchRiders(); }
    else if (activeTab === 'reports') fetchReports();
  }, [activeTab, selectedService, selectedOrderStatus]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/store/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedService !== 'ALL') params.set('serviceType', selectedService);
      if (selectedOrderStatus !== 'all') params.set('status', selectedOrderStatus);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE}/store/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedService !== 'ALL') params.set('serviceType', selectedService);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE}/store/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedService !== 'ALL') params.set('serviceType', selectedService);

      const res = await fetch(`${API_BASE}/store/categories?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedService !== 'ALL') params.set('serviceType', selectedService);

      const res = await fetch(`${API_BASE}/store/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/store/advertisements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdvertisements(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch(`${API_BASE}/store/riders/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRiders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedService !== 'ALL') params.set('service', selectedService);

      const res = await fetch(`${API_BASE}/store/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Order Actions
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/store/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order');

      showToast(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
      if (selectedOrderDetails?._id === orderId) {
        setSelectedOrderDetails(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Assign Rider
  const handleAssignRider = async (riderId) => {
    if (!targetOrderForRider) return;
    try {
      const res = await fetch(`${API_BASE}/store/orders/${targetOrderForRider._id}/assign-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ riderId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign rider');

      showToast('Rider assigned successfully!');
      setShowAssignRiderModal(false);
      setTargetOrderForRider(null);
      fetchOrders();
      if (selectedOrderDetails?._id === targetOrderForRider._id) {
        setSelectedOrderDetails(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Quick Stock Updater
  const handleUpdateStock = async (productId, newStock) => {
    try {
      const res = await fetch(`${API_BASE}/store/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stock: parseInt(newStock, 10), isAvailable: parseInt(newStock, 10) > 0 })
      });
      if (res.ok) {
        showToast('Stock updated');
        fetchInventory();
        fetchProducts();
      }
    } catch (err) {
      showToast('Failed to update stock', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Toast Notification */}
      {toastMsg.text && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2.5 animate-bounce-in ${
          toastMsg.type === 'error'
            ? 'bg-rose-500 text-white border-rose-600'
            : toastMsg.type === 'info'
            ? 'bg-indigo-600 text-white border-indigo-700'
            : 'bg-emerald-600 text-white border-emerald-700'
        }`}>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Operations Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                JINKZO STORE OPERATIONS
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Operations Panel
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Grocery • Bakery & Beverages • Veg & Fruits • Meat
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          <NotificationCenter userId={user?._id} role="store_operator" />

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={() => {
              if (activeTab === 'dashboard') fetchAnalytics();
              else if (activeTab === 'orders') fetchOrders();
              else if (activeTab === 'products') fetchProducts();
              else if (activeTab === 'inventory') fetchInventory();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin-dashboard')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Super Admin
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-3 sm:p-6 gap-6">

        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-1.5 bg-white dark:bg-[#141926] p-2.5 sm:p-3 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-xs h-fit">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: analytics?.statusCounts?.new || 0 },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'categories', label: 'Categories', icon: Layers },
            { id: 'inventory', label: 'Inventory', icon: Boxes, badge: analytics?.inventoryAlerts?.lowStockCount || 0 },
            { id: 'advertisements', label: 'Advertisements', icon: Megaphone },
            { id: 'dispatch', label: 'Rider Dispatch', icon: Bike, badge: analytics?.statusCounts?.readyForPickup || 0 },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 md:flex-shrink ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-amber-600' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">

          {/* ══════════════════════════════════════════════
              TAB 1: DASHBOARD OVERVIEW
             ══════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 animate-fade-in">

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { label: "Today's Orders", val: analytics?.statusCounts?.total ?? 0, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: "New (Placed)", val: analytics?.statusCounts?.new ?? 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: "Packing", val: analytics?.statusCounts?.packing ?? 0, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: "Ready for Pickup", val: analytics?.statusCounts?.readyForPickup ?? 0, icon: Bike, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: "Rider Assigned", val: analytics?.statusCounts?.riderAssigned ?? 0, icon: Truck, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                  { label: "Out for Delivery", val: analytics?.statusCounts?.outForDelivery ?? 0, icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { label: "Delivered", val: analytics?.statusCounts?.delivered ?? 0, icon: CheckCircle2, color: 'text-teal-500', bg: 'bg-teal-500/10' },
                  { label: "Cancelled", val: analytics?.statusCounts?.cancelled ?? 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{kpi.label}</span>
                        <div className={`w-7 h-7 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="font-display font-black text-2xl text-slate-900 dark:text-white leading-none">
                        {kpi.val}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Service Breakdown Cards */}
              <section className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs flex flex-col gap-4">
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Service-Wise Daily Orders
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {[
                    { key: 'grocery', name: 'Grocery', icon: '🛒', count: analytics?.serviceCounts?.grocery ?? 0, bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
                    { key: 'bakery', name: 'Bakery & Beverages', icon: '🥐', count: analytics?.serviceCounts?.bakery ?? 0, bg: 'from-pink-500/15 to-pink-500/5', border: 'border-pink-500/30', text: 'text-pink-700 dark:text-pink-300' },
                    { key: 'vegFruits', name: 'Veg & Fruits', icon: '🥦', count: analytics?.serviceCounts?.vegFruits ?? 0, bg: 'from-teal-500/15 to-teal-500/5', border: 'border-teal-500/30', text: 'text-teal-700 dark:text-teal-300' },
                    { key: 'meat', name: 'Meat', icon: '🍗', count: analytics?.serviceCounts?.meat ?? 0, bg: 'from-rose-500/15 to-rose-500/5', border: 'border-rose-500/30', text: 'text-rose-700 dark:text-rose-300' }
                  ].map((s) => (
                    <div
                      key={s.key}
                      onClick={() => {
                        setSelectedService(s.key === 'vegFruits' ? 'VEG_FRUITS' : s.name.toUpperCase().split(' ')[0]);
                        setActiveTab('orders');
                      }}
                      className={`bg-gradient-to-br ${s.bg} border ${s.border} p-4 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer hover:scale-[1.02] transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{s.icon}</span>
                        <span className={`font-display font-black text-xl ${s.text}`}>{s.count}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{s.name}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Actions & Recent Orders Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-3xl shadow-lg shadow-orange-500/20 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold opacity-90">Today's Store Sales</span>
                    <h2 className="font-display font-black text-3xl mt-1">₹{analytics?.todaySales ?? 0}</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="self-start bg-white text-slate-950 px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-50 transition-colors shadow-xs cursor-pointer"
                  >
                    View All Store Orders →
                  </button>
                </div>

                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Inventory Status</span>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      {analytics?.inventoryAlerts?.lowStockCount || 0} Low Stock Alerts
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-slate-400">Total SKUs:</span>
                      <p className="font-black text-xl text-slate-800 dark:text-white">{analytics?.inventoryAlerts?.totalProducts || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <div>
                      <span className="text-xs text-slate-400">Out of Stock:</span>
                      <p className="font-black text-xl text-rose-600">{analytics?.inventoryAlerts?.outOfStockCount || 0}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="self-start text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Manage Inventory Stock →
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 2: ORDERS MANAGEMENT
             ══════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              
              {/* Service Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {['ALL', 'GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].map((srv) => (
                  <button
                    key={srv}
                    onClick={() => setSelectedService(srv)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      selectedService === srv
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {srv === 'ALL' ? '🌟 All Services' : `${SERVICE_CONFIG[srv]?.icon} ${SERVICE_CONFIG[srv]?.label}`}
                  </button>
                ))}
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'new', label: 'New' },
                  { id: 'accepted', label: 'Accepted' },
                  { id: 'packing', label: 'Packing' },
                  { id: 'ready', label: 'Ready for Pickup' },
                  { id: 'rider_assigned', label: 'Rider Assigned' },
                  { id: 'out_for_delivery', label: 'Out for Delivery' },
                  { id: 'delivered', label: 'Delivered' },
                  { id: 'cancelled', label: 'Cancelled' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedOrderStatus(st.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex-shrink-0 ${
                      selectedOrderStatus === st.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-500/50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Orders List / Cards */}
              {orders.length === 0 ? (
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Orders Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm">No orders matching the selected service or status filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.map((order) => {
                    const srvConf = SERVICE_CONFIG[order.serviceType] || SERVICE_CONFIG.GROCERY;
                    const items = order.items || [];
                    return (
                      <div
                        key={order._id}
                        className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3.5 hover:border-amber-500/40 transition-colors"
                      >
                        {/* Card Header: Service Badge + Status */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider ${srvConf.badgeBg}`}>
                              {srvConf.icon} {srvConf.label}
                            </span>
                            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {order.displayId || `#${order._id.substr(-6).toUpperCase()}`}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            order.status === 'Placed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                            order.status === 'Accepted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                            order.status === 'Packing' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' :
                            order.status === 'Ready_for_Pickup' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                            order.status === 'Delivered' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Customer & Address */}
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                            <span className="font-bold">{order.customerName || order.customer?.name || 'Customer'}</span>
                            <span className="text-slate-500">{order.customerPhone || order.customer?.phone || ''}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            📍 {order.address?.street || order.customerLocation?.formattedAddress || 'Customer Address'}
                          </p>
                        </div>

                        {/* Items summary */}
                        <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-2xl flex flex-col gap-1 text-xs">
                          {items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="line-clamp-1 text-slate-700 dark:text-slate-300">{it.quantity}x {it.name}</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-400">₹{(it.price || 0) * (it.quantity || 1)}</span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold">+{items.length - 3} more items...</span>
                          )}
                        </div>

                        {/* Financials & Delivery Agent */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-400">Total Amount:</span>
                            <p className="font-display font-black text-sm text-slate-900 dark:text-white">₹{order.total} <span className="text-[10px] text-slate-400 font-medium">({order.paymentDetails?.method || 'COD'})</span></p>
                          </div>
                          {order.deliveryAgent?.name && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400">Assigned Rider:</span>
                              <p className="font-bold text-xs text-emerald-600">{order.deliveryAgent.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons based on order lifecycle */}
                        <div className="flex items-center gap-2 pt-2">
                          {order.status === 'Placed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order._id, 'Accepted')}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Accept Order
                            </button>
                          )}

                          {order.status === 'Accepted' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order._id, 'Packing')}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Start Packing
                            </button>
                          )}

                          {order.status === 'Packing' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order._id, 'Ready_for_Pickup')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Mark Ready for Pickup
                            </button>
                          )}

                          {['Placed', 'Accepted', 'Packing', 'Ready_for_Pickup'].includes(order.status) && (
                            <button
                              onClick={() => {
                                setTargetOrderForRider(order);
                                fetchRiders();
                                setShowAssignRiderModal(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                              title="Assign Rider Now"
                            >
                              Assign Rider
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 3: PRODUCT CATALOG MANAGEMENT
             ══════════════════════════════════════════════ */}
          {activeTab === 'products' && (
            <div className="flex flex-col gap-4 animate-fade-in">

              {/* Service Selector & Add Product Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['ALL', 'GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].map((srv) => (
                    <button
                      key={srv}
                      onClick={() => setSelectedService(srv)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                        selectedService === srv
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {srv === 'ALL' ? 'All Services' : SERVICE_CONFIG[srv]?.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Product</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name, SKU, category..."
                  className="w-full bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {products.map((p) => {
                  const srvConf = SERVICE_CONFIG[p.serviceType] || SERVICE_CONFIG.GROCERY;
                  return (
                    <div
                      key={p._id}
                      className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex gap-3">
                        <div className="w-18 h-18 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                          <img
                            src={getImageUrl(p.image, 'product')}
                            alt={p.name}
                            onError={(e) => handleImageError(e, 'product')}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border w-fit ${srvConf.badgeBg}`}>
                            {srvConf.label}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 mt-0.5">{p.name}</h4>
                          {p.nameTelugu && (
                            <span className="text-[10px] text-slate-400 line-clamp-1">{p.nameTelugu}</span>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium">Category: {p.category}</span>
                        </div>
                      </div>

                      {/* Pricing & Stock */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs">
                        <div>
                          <span className="font-display font-black text-sm text-slate-900 dark:text-white">₹{p.price}</span>
                          {p.mrp > p.price && (
                            <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{p.mrp}</span>
                          )}
                          <span className="text-[10px] text-slate-500 block">{p.weight || p.packSize || p.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            p.stock <= 0
                              ? 'bg-rose-500/10 text-rose-600'
                              : p.stock <= (p.lowStockAlert || 5)
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            Stock: {p.stock}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setShowProductModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete product "${p.name}"?`)) {
                              try {
                                const res = await fetch(`${API_BASE}/store/products/${p._id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  showToast('Product deleted');
                                  fetchProducts();
                                }
                              } catch (e) {
                                showToast('Delete failed', 'error');
                              }
                            }
                          }}
                          className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 4: INVENTORY MANAGEMENT
             ══════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">Total Products</span>
                  <h3 className="font-display font-black text-2xl mt-1">{inventory?.summary?.total || 0}</h3>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">Low Stock Warning</span>
                  <h3 className="font-display font-black text-2xl text-amber-600 mt-1">{inventory?.summary?.lowStockCount || 0}</h3>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 rounded-2xl">
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold">Out of Stock</span>
                  <h3 className="font-display font-black text-2xl text-rose-600 mt-1">{inventory?.summary?.outOfStockCount || 0}</h3>
                </div>
              </div>

              {/* Stock Table */}
              <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500">
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Service</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Current Stock</th>
                      <th className="p-3.5">Low Stock Alert</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Quick Stock Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(inventory?.products || []).map((prod) => (
                      <tr key={prod._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 flex items-center gap-2.5 font-bold">
                          <img
                            src={getImageUrl(prod.image, 'product')}
                            alt=""
                            onError={(e) => handleImageError(e, 'product')}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <span className="line-clamp-1">{prod.name}</span>
                        </td>
                        <td className="p-3.5 font-medium">{SERVICE_CONFIG[prod.serviceType]?.label || prod.serviceType}</td>
                        <td className="p-3.5 font-medium">{prod.category}</td>
                        <td className="p-3.5 font-black text-sm">{prod.stock}</td>
                        <td className="p-3.5 font-medium text-slate-500">{prod.lowStockAlert || 5}</td>
                        <td className="p-3.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            prod.stock <= 0
                              ? 'bg-rose-500/10 text-rose-600'
                              : prod.stock <= (prod.lowStockAlert || 5)
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {prod.stock <= 0 ? 'OUT OF STOCK' : prod.stock <= (prod.lowStockAlert || 5) ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStock(prod._id, Math.max(0, prod.stock - 5))}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-black hover:bg-slate-200 cursor-pointer"
                            >
                              -5
                            </button>
                            <input
                              type="number"
                              defaultValue={prod.stock}
                              onBlur={(e) => handleUpdateStock(prod._id, e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 font-black text-xs"
                            />
                            <button
                              onClick={() => handleUpdateStock(prod._id, prod.stock + 10)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-black hover:bg-slate-200 cursor-pointer"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 5: CATEGORIES MANAGEMENT
             ══════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-sm uppercase">Manage Store Categories</h3>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  + Add Category
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {categories.map((cat) => (
                  <div
                    key={cat._id || cat.name}
                    className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getImageUrl(cat.image, 'category')}
                        alt={cat.name}
                        onError={(e) => handleImageError(e, 'category')}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs line-clamp-1">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{cat.dashboardType || cat.serviceType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 6: ADVERTISEMENTS MANAGEMENT
             ══════════════════════════════════════════════ */}
          {activeTab === 'advertisements' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-sm uppercase">Store Offer & Ad Banners</h3>
                  <p className="text-xs text-slate-400">Manage carousel banners shown to customers in Grocery, Bakery, Veg, and Meat sections.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingAd(null);
                    setShowAdModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  + Create Advertisement
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advertisements.map((ad) => (
                  <div
                    key={ad._id}
                    className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div className="h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      <img
                        src={getImageUrl(ad.imageUrl, 'banner')}
                        alt={ad.title}
                        onError={(e) => handleImageError(e, 'banner')}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          (ad.isActive ?? ad.active ?? true) ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'
                        }`}>
                          {(ad.isActive ?? ad.active ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      <h4 className="font-bold text-xs">{ad.title}</h4>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {(ad.displayIn || ['food']).map((d, i) => (
                          <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold uppercase">
                            {d}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Target: {ad.targetType || 'None'} {ad.targetName ? `(${ad.targetName})` : ''}</span>
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/store/advertisements/${ad._id}/toggle`, {
                              method: 'PUT',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            fetchAdvertisements();
                          }}
                          className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                        >
                          {(ad.isActive ?? ad.active ?? true) ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 7: RIDER DISPATCH
             ══════════════════════════════════════════════ */}
          {activeTab === 'dispatch' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h3 className="font-display font-black text-sm uppercase">Active Orders Awaiting Pickup Dispatch</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => o.status === 'Ready_for_Pickup').map((order) => (
                  <div
                    key={order._id}
                    className="bg-white dark:bg-[#141926] border border-emerald-500/30 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-emerald-600">{order.displayId || order._id}</span>
                      <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                        READY FOR PICKUP
                      </span>
                    </div>
                    <div className="text-xs flex flex-col gap-1">
                      <p className="font-bold text-slate-800 dark:text-white">Customer: {order.customerName}</p>
                      <p className="text-slate-400">Destination: {order.address?.street || 'Customer Address'}</p>
                      <p className="font-black text-sm text-slate-900 dark:text-white mt-1">₹{order.total}</p>
                    </div>

                    <button
                      onClick={() => {
                        setTargetOrderForRider(order);
                        fetchRiders();
                        setShowAssignRiderModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Assign Rider Now
                    </button>
                  </div>
                ))}
              </div>

              {orders.filter(o => o.status === 'Ready_for_Pickup').length === 0 && (
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center text-xs text-slate-400 font-bold">
                  No orders currently waiting for pickup dispatch.
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 8: REPORTS & SALES
             ══════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">Total Sales</span>
                  <h3 className="font-display font-black text-2xl text-emerald-600 mt-1">₹{reports?.metrics?.totalSales || 0}</h3>
                </div>
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">Total Orders</span>
                  <h3 className="font-display font-black text-2xl mt-1">{reports?.metrics?.totalOrders || 0}</h3>
                </div>
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">Delivered Orders</span>
                  <h3 className="font-display font-black text-2xl text-teal-600 mt-1">{reports?.metrics?.deliveredOrders || 0}</h3>
                </div>
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold">Cancelled Orders</span>
                  <h3 className="font-display font-black text-2xl text-rose-600 mt-1">{reports?.metrics?.cancelledOrders || 0}</h3>
                </div>
              </div>

              {/* Service Sales Breakdown */}
              <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
                <h4 className="font-display font-black text-xs uppercase mb-3">Revenue by Service</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(reports?.salesByService || {}).map(([srv, rev]) => (
                    <div key={srv} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold">{SERVICE_CONFIG[srv]?.label || srv}</span>
                      <p className="font-display font-black text-lg text-slate-800 dark:text-white">₹{rev}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 9: SETTINGS
             ══════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex flex-col gap-4 animate-fade-in text-xs">
              <h3 className="font-display font-black text-sm uppercase">Store Operations Configuration</h3>
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                  <span className="font-bold">Sound Alert for New Orders</span>
                  <p className="text-slate-400 text-[11px]">Play chime when customer places a store order</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  {soundEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: ADD / EDIT PRODUCT
         ══════════════════════════════════════════════ */}
      {showProductModal && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          token={token}
          onClose={() => setShowProductModal(false)}
          onSuccess={() => {
            setShowProductModal(false);
            fetchProducts();
            showToast(editingProduct ? 'Product updated' : 'Product created');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ASSIGN RIDER
         ══════════════════════════════════════════════ */}
      {showAssignRiderModal && targetOrderForRider && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display font-black text-sm">Assign Delivery Rider</h3>
              <button onClick={() => setShowAssignRiderModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select an available approved delivery partner to dispatch for Order <strong>{targetOrderForRider.displayId || targetOrderForRider._id}</strong>.
            </p>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {availableRiders.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold">
                  No active online delivery riders available right now.
                </div>
              ) : (
                availableRiders.map((rider) => (
                  <div
                    key={rider._id}
                    onClick={() => handleAssignRider(rider._id)}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-amber-500 hover:bg-amber-50/20 cursor-pointer transition-all"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white">{rider.name}</h5>
                      <span className="text-[11px] text-slate-400">{rider.phone} • {rider.vehicleType}</span>
                    </div>
                    <span className="text-xs font-black text-amber-500">Assign →</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ORDER DETAILS
         ══════════════════════════════════════════════ */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400">Order Details</span>
                <h3 className="font-display font-black text-sm">{selectedOrderDetails.displayId || selectedOrderDetails._id}</h3>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Information</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedOrderDetails.customerName || selectedOrderDetails.customer?.name}</p>
                <p className="text-slate-500">{selectedOrderDetails.customerPhone || selectedOrderDetails.customer?.phone}</p>
                <p className="text-slate-500 mt-1">📍 {selectedOrderDetails.address?.street || selectedOrderDetails.customerLocation?.formattedAddress}</p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Ordered Items ({selectedOrderDetails.items?.length})</span>
                {(selectedOrderDetails.items || []).map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-600">{it.quantity}x</span>
                      <span>{it.name}</span>
                    </div>
                    <span className="font-bold">₹{(it.price || 0) * (it.quantity || 1)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{selectedOrderDetails.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery Fee</span>
                  <span>₹{selectedOrderDetails.deliveryFee}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1">
                  <span>Total</span>
                  <span>₹{selectedOrderDetails.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ══════════════════════════════════════════════
//  ADD / EDIT PRODUCT FORM MODAL
// ══════════════════════════════════════════════
function ProductFormModal({ product, categories, token, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState(product?.serviceType || 'GROCERY');
  const [category, setCategory] = useState(product?.category || '');
  const [name, setName] = useState(product?.name || '');
  const [nameTelugu, setNameTelugu] = useState(product?.nameTelugu || '');
  const [price, setPrice] = useState(product?.price || '');
  const [mrp, setMrp] = useState(product?.mrp || '');
  const [unit, setUnit] = useState(product?.unit || 'pack');
  const [weight, setWeight] = useState(product?.weight || '');
  const [packSize, setPackSize] = useState(product?.packSize || '');
  const [stock, setStock] = useState(product?.stock !== undefined ? product.stock : 20);
  const [lowStockAlert, setLowStockAlert] = useState(product?.lowStockAlert || 5);
  const [description, setDescription] = useState(product?.description || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [image, setImage] = useState(product?.image || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Service Specific Detail states
  const [meatType, setMeatType] = useState(product?.details?.meatType || '');
  const [cutType, setCutType] = useState(product?.details?.cutType || '');
  const [boneType, setBoneType] = useState(product?.details?.boneType || 'Bone-in');
  const [soldBy, setSoldBy] = useState(product?.details?.soldBy || 'kg');
  const [grade, setGrade] = useState(product?.details?.grade || '');
  const [flavour, setFlavour] = useState(product?.details?.flavour || '');
  const [bestBefore, setBestBefore] = useState(product?.details?.bestBefore || '');
  const [netQuantity, setNetQuantity] = useState(product?.details?.netQuantity || '');

  // Filter categories matching selected service
  const filteredCategories = categories.filter(c => 
    (c.serviceType && c.serviceType === serviceType) || 
    (c.dashboardType && c.dashboardType.toLowerCase() === serviceType.toLowerCase())
  );

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadFileToBackend(file);
      setImage(url);
    } catch (err) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Product Name (English) is required.');
    if (!category.trim()) return setErrorMsg('Category is required.');
    if (!price || isNaN(parseFloat(price))) return setErrorMsg('Valid Price is required.');
    if (!image.trim()) return setErrorMsg('Product Image is required.');

    setIsSaving(true);
    try {
      const payload = {
        serviceType,
        category,
        name: name.trim(),
        nameTelugu: nameTelugu.trim(),
        price: parseFloat(price),
        mrp: mrp ? parseFloat(mrp) : parseFloat(price),
        unit,
        weight,
        packSize,
        stock: parseInt(stock, 10),
        lowStockAlert: parseInt(lowStockAlert, 10),
        description,
        brand,
        image,
        details: {
          meatType,
          cutType,
          boneType,
          soldBy,
          grade,
          flavour,
          bestBefore,
          netQuantity
        }
      };

      const url = product?._id
        ? `${API_BASE}/store/products/${product._id}`
        : `${API_BASE}/store/products`;

      const method = product?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-display font-black text-base">{product ? 'Edit Store Product' : '+ Add New Store Product'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          
          {/* 1. REQUIRED: SERVICE SELECTION */}
          <div>
            <label className="font-black text-slate-700 dark:text-slate-300 block mb-1.5">
              SERVICE * <span className="text-[10px] text-slate-400 font-normal">(Primary Service Category)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].map((srv) => (
                <button
                  type="button"
                  key={srv}
                  onClick={() => setServiceType(srv)}
                  className={`p-2.5 rounded-xl font-black text-xs border text-center transition-all cursor-pointer ${
                    serviceType === srv
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {SERVICE_CONFIG[srv]?.icon} {SERVICE_CONFIG[srv]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. CATEGORY SELECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                required
              >
                <option value="">Select Category</option>
                {filteredCategories.map(c => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Aashirvaad, Amul, Farm Fresh"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>

          {/* 3. PRODUCT NAMES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Name (English) *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fresh Chicken Curry Cut"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Name (Telugu)</label>
              <input
                type="text"
                value={nameTelugu}
                onChange={(e) => setNameTelugu(e.target.value)}
                placeholder="e.g. తాజా చికెన్ కర్రీ కట్"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>

          {/* 4. PRICING & STOCK */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Selling Price *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="₹ Price"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-black"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">MRP</label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="₹ MRP"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Stock Quantity</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit / Weight</label>
              <input
                type="text"
                value={weight || unit}
                onChange={(e) => { setWeight(e.target.value); setUnit(e.target.value); }}
                placeholder="e.g. 500g, 1kg"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>

          {/* 5. SERVICE-SPECIFIC EXTRA FIELDS */}
          {serviceType === 'MEAT' && (
            <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-2xl grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-rose-800 dark:text-rose-300 block mb-1">Cut Type</label>
                <input
                  type="text"
                  value={cutType}
                  onChange={(e) => setCutType(e.target.value)}
                  placeholder="Curry Cut, Biryani Cut, Fillet"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-rose-800 dark:text-rose-300 block mb-1">Bone Type</label>
                <select
                  value={boneType}
                  onChange={(e) => setBoneType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                >
                  <option value="Bone-in">Bone-in</option>
                  <option value="Boneless">Boneless</option>
                </select>
              </div>
            </div>
          )}

          {serviceType === 'VEG_FRUITS' && (
            <div className="bg-teal-500/5 border border-teal-500/20 p-3 rounded-2xl grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-teal-800 dark:text-teal-300 block mb-1">Sold By</label>
                <input
                  type="text"
                  value={soldBy}
                  onChange={(e) => setSoldBy(e.target.value)}
                  placeholder="kg, 500g, piece, bunch"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-teal-800 dark:text-teal-300 block mb-1">Quality Grade</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Grade A, Organic"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
            </div>
          )}

          {serviceType === 'BAKERY' && (
            <div className="bg-pink-500/5 border border-pink-500/20 p-3 rounded-2xl grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-pink-800 dark:text-pink-300 block mb-1">Flavour</label>
                <input
                  type="text"
                  value={flavour}
                  onChange={(e) => setFlavour(e.target.value)}
                  placeholder="Chocolate, Vanilla, Mango"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-pink-800 dark:text-pink-300 block mb-1">Best Before</label>
                <input
                  type="text"
                  value={bestBefore}
                  onChange={(e) => setBestBefore(e.target.value)}
                  placeholder="2 Days, 3 Days"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* 6. IMAGE URL / UPLOAD */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Image *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Paste Image URL or upload file below"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                required
              />
              <label className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving Product...' : (product ? 'Save Changes' : '+ Create Product')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
