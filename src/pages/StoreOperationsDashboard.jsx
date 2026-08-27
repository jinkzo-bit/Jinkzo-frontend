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
  ChevronDown,
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
import { useAuthStore, authFetch } from '../store/authStore';
import { uploadFileToBackend, getImageUrl, handleImageError, FALLBACK_IMAGES } from '../utils/uploadUtil';
import { formatAppDate, formatAppTimeOnly } from '../utils/dateUtils';
import { io } from 'socket.io-client';
import NotificationCenter from '../components/NotificationCenter';

const SERVICE_CONFIG = {
  GROCERY: { label: 'Grocery', badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', color: '#059669', icon: '🛒' },
  BAKERY: { label: 'Bakery & Beverages', badgeBg: 'bg-pink-500/10 text-pink-600 border-pink-500/20', color: '#db2777', icon: '🥐' },
  VEG_FRUITS: { label: 'Veg & Fruits', badgeBg: 'bg-teal-500/10 text-teal-600 border-teal-500/20', color: '#0d9488', icon: '🥦' },
  MEAT: { label: 'Meat', badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20', color: '#e11d48', icon: '🍗' }
};

const normalizeStoreCategory = (cat) => {
  if (!cat) return 'GROCERY';
  const c = String(cat).trim().toUpperCase();
  if (['GROCERY', 'GROCERIES'].includes(c)) return 'GROCERY';
  if (['BAKERY', 'BAKERY & BEVERAGES', 'BEVERAGES', 'COOL_HOT', 'HOT_COOL', 'HOT & COOL', 'COOL & HOT'].includes(c)) return 'BAKERY';
  if (['VEG_FRUITS', 'FRUITS-VEGETABLES', 'FRUITS_VEGETABLES', 'VEGETABLES', 'FRUITS & VEGETABLES', 'VEG & FRUITS', 'FRUITS', 'VEG'].includes(c)) return 'VEG_FRUITS';
  if (['MEAT', 'NON-VEG', 'MEAT & SEAFOOD', 'CHICKEN', 'MUTTON', 'FISH'].includes(c)) return 'MEAT';
  return 'GROCERY';
};

const groupOrderItemsByCategory = (items = []) => {
  const groups = {
    GROCERY: [],
    VEG_FRUITS: [],
    BAKERY: [],
    MEAT: []
  };

  items.forEach(it => {
    const norm = normalizeStoreCategory(it.serviceType);
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(it);
  });

  return groups;
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

  // Operations dropdown state
  const [isOperationsDropdownOpen, setIsOperationsDropdownOpen] = useState(false);
  const operationsMenuRef = useRef(null);

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

  // Close operations dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (operationsMenuRef.current && !operationsMenuRef.current.contains(e.target)) {
        setIsOperationsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    else if (activeTab === 'products') { fetchProducts(); fetchCategories(); }
    else if (activeTab === 'categories') fetchCategories();
    else if (activeTab === 'inventory') fetchInventory();
    else if (activeTab === 'advertisements') fetchAdvertisements();
    else if (activeTab === 'dispatch') { fetchOrders(); fetchRiders(); }
    else if (activeTab === 'reports') fetchReports();
  }, [activeTab, selectedService, selectedOrderStatus]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch(`${API_BASE}/store/analytics`);
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

      const res = await authFetch(`${API_BASE}/store/orders?${params.toString()}`);
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

      const res = await authFetch(`${API_BASE}/store/products?${params.toString()}`);
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

      const res = await authFetch(`${API_BASE}/store/categories?${params.toString()}`);
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

      const res = await authFetch(`${API_BASE}/store/inventory?${params.toString()}`);
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
      const res = await authFetch(`${API_BASE}/store/advertisements`);
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
      const res = await authFetch(`${API_BASE}/store/riders/available`);
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

      const res = await authFetch(`${API_BASE}/store/reports?${params.toString()}`);
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
      const res = await authFetch(`${API_BASE}/store/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
      const res = await authFetch(`${API_BASE}/store/orders/${targetOrderForRider._id}/assign-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      const res = await authFetch(`${API_BASE}/store/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
        <div className="flex items-center gap-2.5">
          <NotificationCenter userId={user?._id} role="store_operator" />

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'dashboard') fetchAnalytics();
              else if (activeTab === 'orders') fetchOrders();
              else if (activeTab === 'products') fetchProducts();
              else if (activeTab === 'inventory') fetchInventory();
              else if (activeTab === 'advertisements') fetchAdvertisements();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Operations Dropdown Menu (Secondary Tools) */}
          <div className="relative" ref={operationsMenuRef}>
            <button
              type="button"
              onClick={() => setIsOperationsDropdownOpen(!isOperationsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                ['categories', 'inventory', 'advertisements', 'reports', 'settings'].includes(activeTab)
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25'
                  : 'bg-white dark:bg-[#141926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Operations</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isOperationsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOperationsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1 animate-scale-up">
                <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operations Hub</span>
                </div>
                {[
                  { id: 'categories', label: 'Categories', icon: Layers, desc: 'Manage store categories' },
                  { id: 'inventory', label: 'Inventory', icon: Boxes, desc: 'Stock alerts & inventory', badge: analytics?.inventoryAlerts?.lowStockCount || 0 },
                  { id: 'advertisements', label: 'Promotional Banners', icon: Megaphone, desc: 'Category-specific promo banners' },
                  { id: 'reports', label: 'Reports & Sales', icon: BarChart3, desc: 'Analytics & performance' },
                  { id: 'settings', label: 'Store Settings', icon: SettingsIcon, desc: 'Operations configuration' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOperationsDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{item.label}</span>
                          <span className={`text-[9px] font-normal truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{item.desc}</span>
                        </div>
                      </div>
                      {item.badge > 0 && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white text-amber-600' : 'bg-rose-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {user?.role === 'admin' && (
            <button
              type="button"
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

        {/* Sidebar Navigation: ONLY 4 PRIMARY ITEMS */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-1.5 bg-white dark:bg-[#141926] p-2.5 sm:p-3 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-xs h-fit">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: analytics?.statusCounts?.new || 0 },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'dispatch', label: 'Rider Dispatch', icon: Bike, badge: analytics?.statusCounts?.readyForPickup || 0 }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
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
                    const items = order.items || [];
                    const grouped = groupOrderItemsByCategory(items);
                    const activeCategories = Object.entries(grouped).filter(([_, list]) => list.length > 0);
                    const isRiderAssigned = !!(order.deliveryAgent?.name || order.deliveryAgent?.phone);

                    return (
                      <div
                        key={order._id}
                        className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3.5 hover:border-amber-500/40 transition-colors"
                      >
                        {/* Card Header: Service Badge + Status */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/20">
                              🏬 JINKZO STORE
                            </span>
                            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {order.displayId || `#${order._id.substr(-6).toUpperCase()}`}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                            ['Picked_Up', 'Out_for_Delivery'].includes(order.status) ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' :
                            isRiderAssigned ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {isRiderAssigned && order.status === 'Rider_Assigned' ? 'AUTO ASSIGNED' : order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Customer & Address */}
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                            <span className="font-bold">{order.customerName || order.customer?.name || 'Customer'}</span>
                            <span className="text-slate-500 font-mono">{order.customerPhone || order.customer?.phone || ''}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            📍 {order.address?.street || order.customerLocation?.formattedAddress || 'Customer Address'}
                          </p>
                        </div>

                        {/* Grouped Store Items by Section */}
                        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl flex flex-col gap-2.5 text-xs">
                          {activeCategories.map(([catKey, catItems]) => {
                            const conf = SERVICE_CONFIG[catKey] || SERVICE_CONFIG.GROCERY;
                            return (
                              <div key={catKey} className="flex flex-col gap-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                                <div className="flex items-center gap-1.5 font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  <span>{conf.icon}</span>
                                  <span>{conf.label}</span>
                                </div>
                                <div className="flex flex-col gap-1 pl-4">
                                  {catItems.map((it, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-800 dark:text-slate-200">
                                        • {it.name} <span className="text-slate-400">×{it.quantity}</span>
                                      </span>
                                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                                        ₹{(it.price || 0) * (it.quantity || 1)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Financials & Delivery Agent */}
                        <div className="flex flex-col gap-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Store Subtotal: ₹{order.subtotal || 0}</span>
                            <span>Delivery Fee: ₹{order.deliveryFee || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400">Total Amount:</span>
                              <p className="font-display font-black text-sm text-slate-900 dark:text-white">
                                ₹{order.total} <span className="text-[10px] text-slate-400 font-medium">({order.paymentDetails?.method || 'COD'})</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400">Rider Status:</span>
                              {isRiderAssigned ? (
                                <p className="font-bold text-xs text-emerald-600">
                                  {order.deliveryAgent.name} {order.deliveryAgent.phone ? `(${order.deliveryAgent.phone})` : ''}
                                </p>
                              ) : (
                                <p className="font-bold text-xs text-amber-600 animate-pulse">
                                  Waiting for Active Rider
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
                          >
                            View Order Details
                          </button>
                          {!isRiderAssigned && (
                            <button
                              onClick={() => {
                                setTargetOrderForRider(order);
                                fetchRiders();
                                setShowAssignRiderModal(true);
                              }}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                              title="Assign Rider Manually"
                            >
                              Assign Rider
                            </button>
                          )}
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
                                const res = await authFetch(`${API_BASE}/store/products/${p._id}`, {
                                  method: 'DELETE'
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
              TAB 6: ADVERTISEMENTS (STORE PROMOTIONAL BANNERS)
             ══════════════════════════════════════════════ */}
          {activeTab === 'advertisements' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-black text-base uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-500" />
                    Store Promotional Banners
                  </h3>
                  <p className="text-xs text-slate-400">
                    Manage category-specific carousel banners for Grocery, Meat, Bakery, and Veg & Fruits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAd(null);
                    setShowAdModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add New Banner</span>
                </button>
              </div>

              {/* Category Filter for Banners */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {['ALL', 'GROCERY', 'MEAT', 'BAKERY', 'VEG_FRUITS'].map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      selectedService === srv
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {srv === 'ALL' ? 'All Banners' : srv === 'VEG_FRUITS' ? 'Veg & Fruits' : srv.charAt(0) + srv.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Banners Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advertisements
                  .filter((ad) => {
                    if (selectedService === 'ALL') return true;
                    const displays = (ad.displayIn || []).map(d => String(d).toUpperCase());
                    if (selectedService === 'BAKERY') return displays.includes('BAKERY') || displays.includes('COOL_HOT') || displays.includes('BEVERAGES');
                    if (selectedService === 'VEG_FRUITS') return displays.includes('VEG_FRUITS') || displays.includes('FRUITS-VEGETABLES') || displays.includes('FRUITS_VEGETABLES');
                    return displays.includes(selectedService);
                  })
                  .map((ad) => {
                    const isAct = ad.isActive ?? ad.active ?? true;
                    const targetCat = (ad.displayIn?.[0] || 'grocery').toUpperCase();
                    return (
                      <div
                        key={ad._id}
                        className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md transition-shadow"
                      >
                        <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                          <img
                            src={getImageUrl(ad.imageUrl || ad.image, 'banner')}
                            alt={ad.title}
                            onError={(e) => handleImageError(e, 'banner')}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                          />
                          {/* Target Section Badge */}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white border border-white/20">
                              {targetCat === 'VEG_FRUITS' ? 'Veg & Fruits' : targetCat}
                            </span>
                          </div>
                          {/* Active / Inactive Status */}
                          <div className="absolute top-3 right-3 flex gap-1">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                              isAct ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-700 text-slate-200'
                            }`}>
                              {isAct ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col gap-3">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{ad.title}</h4>
                            {(ad.subtitle || ad.description) && (
                              <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                                {ad.subtitle || ad.description}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons: Edit, Toggle, Delete */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAd(ad);
                                  setShowAdModal(true);
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await authFetch(`${API_BASE}/store/advertisements/${ad._id}/toggle`, {
                                      method: 'PUT'
                                    });
                                    showToast(isAct ? 'Banner deactivated' : 'Banner activated');
                                    fetchAdvertisements();
                                  } catch (e) {
                                    showToast('Failed to toggle banner', 'error');
                                  }
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                                  isAct
                                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800/40 dark:hover:bg-amber-950/30'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/40 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                {isAct ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete promotional banner "${ad.title}"?`)) {
                                  try {
                                    const res = await authFetch(`${API_BASE}/store/advertisements/${ad._id}`, {
                                      method: 'DELETE'
                                    });
                                    if (res.ok) {
                                      showToast('Promotional banner deleted');
                                      fetchAdvertisements();
                                    }
                                  } catch (e) {
                                    showToast('Delete failed', 'error');
                                  }
                                }
                              }}
                              className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors cursor-pointer"
                              title="Delete Banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {advertisements.length === 0 && (
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-10 rounded-3xl text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Megaphone className="w-8 h-8 opacity-40 mb-1" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">No Promotional Banners Yet</h4>
                  <p className="text-xs">Create category-specific banners for Grocery, Meat, Bakery, or Veg & Fruits.</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 7: RIDER DISPATCH
             ══════════════════════════════════════════════ */}
          {/* ══════════════════════════════════════════════
              TAB 7: RIDER DISPATCH
             ══════════════════════════════════════════════ */}
          {activeTab === 'dispatch' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-sm uppercase">Jinkzo Store Rider Dispatch</h3>
                  <p className="text-xs text-slate-500">Orders are automatically assigned to active online riders upon placement.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => ['Placed', 'Ready_for_Pickup', 'Rider_Assigned'].includes(o.status)).map((order) => {
                  const isRiderAssigned = !!(order.deliveryAgent?.name || order.deliveryAgent?.phone);
                  const itemsCount = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

                  return (
                    <div
                      key={order._id}
                      className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-3.5 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            🏬 JINKZO STORE
                          </span>
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                            {order.displayId || `#${order._id.substr(-6).toUpperCase()}`}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isRiderAssigned ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {isRiderAssigned ? 'AUTO ASSIGNED' : 'WAITING FOR ACTIVE RIDER'}
                        </span>
                      </div>

                      <div className="text-xs flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                          <span>Customer: {order.customerName || order.customer?.name || 'Customer'}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{order.customerPhone || order.customer?.phone || ''}</span>
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          📍 {order.address?.street || order.customerLocation?.formattedAddress || 'Customer Address'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                          <span className="text-slate-400 font-medium">{itemsCount} Total Item(s)</span>
                          <span className="font-black text-slate-900 dark:text-white">₹{order.total}</span>
                        </div>
                      </div>

                      {/* Rider Details Section */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium">Assigned Delivery Partner:</span>
                          {isRiderAssigned ? (
                            <p className="font-bold text-xs text-emerald-600 flex items-center gap-1">
                              <span>🚴</span>
                              <span>{order.deliveryAgent.name}</span>
                              <span className="font-mono text-slate-400">({order.deliveryAgent.phone})</span>
                            </p>
                          ) : (
                            <p className="font-bold text-xs text-amber-600 animate-pulse">
                              Pending active rider connection...
                            </p>
                          )}
                        </div>

                        {!isRiderAssigned && (
                          <button
                            onClick={() => {
                              setTargetOrderForRider(order);
                              fetchRiders();
                              setShowAssignRiderModal(true);
                            }}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Assign Manually
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {orders.filter(o => ['Placed', 'Ready_for_Pickup', 'Rider_Assigned'].includes(o.status)).length === 0 && (
                <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center text-xs text-slate-400 font-bold">
                  No active orders currently awaiting pickup dispatch.
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
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            fetchProducts();
            showToast(editingProduct ? 'Product updated' : 'Product created');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ADD / EDIT STORE PROMOTIONAL BANNER
         ══════════════════════════════════════════════ */}
      {showAdModal && (
        <StoreBannerModal
          banner={editingAd}
          onClose={() => {
            setShowAdModal(false);
            setEditingAd(null);
          }}
          onSuccess={() => {
            setShowAdModal(false);
            setEditingAd(null);
            fetchAdvertisements();
            showToast(editingAd ? 'Promotional banner updated' : 'Promotional banner created');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ADD / EDIT STORE CATEGORY
         ══════════════════════════════════════════════ */}
      {showCategoryModal && (
        <CategoryFormModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
            fetchCategories();
            showToast(editingCategory ? 'Category updated' : 'Category created');
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
//  STORE PROMOTIONAL BANNER MODAL
// ══════════════════════════════════════════════
function StoreBannerModal({ banner, onClose, onSuccess }) {
  const [targetSection, setTargetSection] = useState(
    banner?.displayIn?.[0] ? banner.displayIn[0].toUpperCase() : 'GROCERY'
  );
  const [title, setTitle] = useState(banner?.title || '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle || banner?.description || '');
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl || banner?.image || '');
  const [buttonText, setButtonText] = useState(banner?.buttonText || 'Order Now');
  const [isActive, setIsActive] = useState(banner ? (banner.isActive ?? banner.active ?? true) : true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      const url = await uploadFileToBackend(file);
      setImageUrl(url);
    } catch (err) {
      setErrorMsg(err.message || 'Banner image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!title.trim()) return setErrorMsg('Banner Title is required.');

    const trimmedImg = imageUrl ? imageUrl.trim() : '';
    if (!trimmedImg) return setErrorMsg('Banner Image is required.');

    // Reject Google Search/imgres landing URLs
    const isGoogleSearchUrl = (
      trimmedImg.includes('google.com/imgres') ||
      trimmedImg.includes('google.co.in/imgres') ||
      trimmedImg.includes('google.com/search') ||
      trimmedImg.includes('google.com/url') ||
      trimmedImg.includes('images.app.goo.gl')
    );
    if (isGoogleSearchUrl) {
      return setErrorMsg('Please enter a direct image URL or upload an image.');
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: subtitle.trim(),
        imageUrl: trimmedImg,
        buttonText: buttonText.trim() || 'Order Now',
        displayIn: [targetSection.toLowerCase()],
        isActive,
        active: isActive,
        link: `/restaurants?category=${targetSection.toLowerCase()}`
      };

      const url = banner?._id
        ? `${API_BASE}/store/advertisements/${banner._id}`
        : `${API_BASE}/store/advertisements`;

      const method = banner?._id ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save promotional banner');
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
            {banner ? 'Edit Store Promotional Banner' : '+ Add New Store Promotional Banner'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          {/* Target Store Section */}
          <div>
            <label className="font-black text-slate-700 dark:text-slate-300 block mb-1.5">
              TARGET STORE SECTION *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'GROCERY', label: 'Grocery', icon: '🛒' },
                { id: 'MEAT', label: 'Meat', icon: '🍗' },
                { id: 'BAKERY', label: 'Bakery', icon: '🥐' },
                { id: 'VEG_FRUITS', label: 'Veg & Fruits', icon: '🥦' }
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setTargetSection(s.id)}
                  className={`p-2.5 rounded-xl font-black text-xs border text-center transition-all cursor-pointer ${
                    targetSection === s.id
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-base mb-0.5">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Banner Title */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Banner Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fresh Groceries At Your Doorstep"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Banner Subtitle / Description */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Banner Subtitle / Description
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Get daily essentials, farm veggies & fresh cuts in minutes"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* Optional CTA Text */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              CTA Button Text (Optional)
            </label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="e.g. Order Now, Shop Now"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* Banner Image Upload / URL + Live Preview */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Banner Image *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste Image URL or upload a banner file"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white"
                required
              />
              <label className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            {/* Live Image Preview */}
            {imageUrl && (
              <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-28 w-full relative">
                <img
                  src={getImageUrl(imageUrl, 'banner')}
                  alt="Banner Preview"
                  onError={(e) => handleImageError(e, 'banner')}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1 rounded-full text-[10px]"
                  title="Remove Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active / Inactive Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">Banner Status</span>
              <span className="text-[10px] text-slate-400">
                {isActive ? 'Active (Visible to customers)' : 'Inactive (Hidden from customers)'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving Banner...' : (banner ? 'Save Changes' : '+ Add Banner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  ADD / EDIT PRODUCT FORM MODAL
// ══════════════════════════════════════════════
function ProductFormModal({ product, categories, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState(product?.serviceType || 'GROCERY');
  const [category, setCategory] = useState(product?.category || '');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
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
    (c.serviceType && c.serviceType.toUpperCase() === serviceType.toUpperCase()) ||
    (c.dashboardType && c.dashboardType.toLowerCase() === serviceType.toLowerCase())
  );

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
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

    const trimmedImg = image ? image.trim() : '';
    if (!trimmedImg) return setErrorMsg('Product Image is required.');

    // Reject Google Search/imgres landing URLs with clear message
    const isGoogleSearchUrl = (
      trimmedImg.includes('google.com/imgres') ||
      trimmedImg.includes('google.co.in/imgres') ||
      trimmedImg.includes('google.com/search') ||
      trimmedImg.includes('google.com/url') ||
      trimmedImg.includes('images.app.goo.gl')
    );
    if (isGoogleSearchUrl) {
      return setErrorMsg('Please enter a direct image URL or upload an image.');
    }

    setIsSaving(true);
    try {
      const payload = {
        serviceType,
        category: category.trim(),
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
        image: trimmedImg,
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

      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-display font-black text-base">{product ? 'Edit Store Product' : '+ Add New Store Product'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
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
                  onClick={() => {
                    setServiceType(srv);
                    setCategory('');
                  }}
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
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Category *</label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] text-amber-600 hover:underline font-bold"
                >
                  {isCustomCategory ? 'Select from list' : '+ Custom Category'}
                </button>
              </div>

              {isCustomCategory || filteredCategories.length === 0 ? (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Atta & Flours, Fresh Meat, Cakes"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  required
                />
              ) : (
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
              )}
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
                placeholder="e.g. Aashirvaad Superior MP Atta 5kg"
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
                placeholder="e.g. ఆశీర్వాద్ గోధుమ పిండి"
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
                placeholder="e.g. 500g, 1kg, 5kg"
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

          {/* 6. IMAGE URL / UPLOAD + LIVE PREVIEW */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Image *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Paste direct Image URL or upload file below"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                required
              />
              <label className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            {/* Live Image Preview Thumbnail */}
            {image && (
              <div className="mt-2.5 flex items-center gap-3 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <img
                    src={getImageUrl(image, 'product')}
                    alt="Product Preview"
                    onError={(e) => handleImageError(e, 'product')}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-emerald-600 block">✓ Image Ready</span>
                  <span className="text-[10px] text-slate-400 truncate block">{image}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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
              disabled={isSaving || isUploading}
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

// ══════════════════════════════════════════════
//  ADD / EDIT CATEGORY FORM MODAL
// ══════════════════════════════════════════════
function CategoryFormModal({ category, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState(category?.serviceType || 'GROCERY');
  const [name, setName] = useState(category?.name || '');
  const [nameTelugu, setNameTelugu] = useState(category?.nameTelugu || '');
  const [image, setImage] = useState(category?.image || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      const url = await uploadFileToBackend(file);
      setImage(url);
    } catch (err) {
      setErrorMsg(err.message || 'Category image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Category Name is required.');

    const trimmedImg = image ? image.trim() : '';
    if (trimmedImg) {
      const isGoogleSearchUrl = (
        trimmedImg.includes('google.com/imgres') ||
        trimmedImg.includes('google.co.in/imgres') ||
        trimmedImg.includes('google.com/search') ||
        trimmedImg.includes('google.com/url') ||
        trimmedImg.includes('images.app.goo.gl')
      );
      if (isGoogleSearchUrl) {
        return setErrorMsg('Please enter a direct image URL or upload an image.');
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nameTelugu: nameTelugu.trim(),
        serviceType,
        dashboardType: serviceType.toLowerCase(),
        image: trimmedImg || FALLBACK_IMAGES.category
      };

      const url = category?._id
        ? `${API_BASE}/store/categories/${category._id}`
        : `${API_BASE}/store/categories`;

      const method = category?._id ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save category');
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
            {category ? 'Edit Store Category' : '+ Add New Store Category'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-black text-slate-700 dark:text-slate-300 block mb-1.5">SERVICE *</label>
            <div className="grid grid-cols-2 gap-2">
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

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dairy & Eggs, Fresh Vegetables, Cold Drinks"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category Name (Telugu)</label>
            <input
              type="text"
              value={nameTelugu}
              onChange={(e) => setNameTelugu(e.target.value)}
              placeholder="e.g. పాలు & గుడ్లు"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Paste direct Image URL or upload file"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
              />
              <label className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? '...' : 'Upload'}</span>
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
              disabled={isSaving || isUploading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (category ? 'Save Changes' : '+ Add Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
