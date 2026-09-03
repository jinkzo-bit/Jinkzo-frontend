import { API_BASE } from '../config/api';
import { io } from 'socket.io-client';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, DollarSign, ShoppingBag, Users, Store, Bike, CheckCircle, Check,
  XCircle, Settings, Tag, ShieldCheck, UserX, UserCheck, MessageSquare,
  AlertCircle, ChevronLeft, ChevronRight, Ban, Unlock, Clock, Percent, MapPin, Calendar, X, ImagePlus, Trash2,
  Pencil, Plus, UserCircle, Activity, FileText, Star, TrendingUp, Search, Menu, Filter, Info, Shield, RefreshCw,
  Layers, MoveUp, MoveDown, Eye, EyeOff, SlidersHorizontal, GripVertical, Save, Sparkles, Utensils, Boxes, ExternalLink, Palette
} from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';
import SuppliersAndItemsTab from '../components/admin/SuppliersAndItemsTab';
import CategoryCardsTab from '../components/admin/CategoryCardsTab';
import CategoryDesigner from '../components/admin/CategoryDesigner';
import BannerDesignsTab from '../components/admin/BannerDesignsTab';
import BannerDesigner from '../components/admin/BannerDesigner';
import HomeHeroBannersTab from '../components/admin/HomeHeroBannersTab';
import HomeHeroBannerDesigner from '../components/admin/HomeHeroBannerDesigner';
import HomeBackgroundTab from '../components/admin/HomeBackgroundTab';
import HomeDesignDashboard from '../components/admin/HomeDesignDashboard';
import EarningsAndSettlementsTab from '../components/admin/EarningsAndSettlementsTab';
import RiderRejectionsTab from '../components/admin/RiderRejectionsTab';
import AssignRiderModal from '../components/admin/AssignRiderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { DEFAULT_CATEGORY_DESIGNS } from '../utils/categoryDesignDefaults';
import { useAuthStore } from '../store/authStore';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../utils/uploadUtil';
import { formatAppDate, formatAppDateOnly, formatAppDateTime } from '../utils/dateUtils';
import { getOrderFinancialBreakdown, formatCurrency, formatDistance, formatRating, getOrderPlacedAt, getOrderDeliveredAt } from '../utils/orderUtils';
import ImageUploadInput from '../components/common/ImageUploadInput';
import {
  DEFAULT_OPENING_HOURS,
  normalizeOpeningHours,
  formatTime12,
  formatTime24,
  parseTimeToMinutes,
  DAYS_OF_WEEK
} from '../utils/timingUtils';
import {
  useHistoryFilter,
  HistoryFilterToolbar,
  HistoryCalendarModal,
  ClearHistoryModal,
  HistoryEmptyState
} from '../components/history';

const defaultPlatformSettings = {
  restaurantCommissionEnabled: true,
  restaurantCommissionPercentage: 15,
  allSectionsMaxItems: 10,
  sectionChangeFee: 15,
  foodBaseItemLimit: 4,
  foodExtraItemLimit: 3,
  foodExtraItemCharge: 15,
  foodMaxHotels: 3,
  foodHotelChangeFee: 15,
  groceryMaxItems: 10,
  vegetableFruitMaxItems: 5,
  vegetableFruitMaxWeightKg: 5,
  meatMaxItems: 5,
  meatMaxWeightKg: 5,
  hotCoolMaxItems: 5,
  commissionPercent: 15,
  deliveryBaseFee: 40,
  platformFee: 5,
  taxPercent: 5,
  isOpen: true,
  globalServiceRadiusKm: 5,
  riderAssignmentMode: 'manual',
  foodDeliveryPricing: {
    tier1: { maxDistanceKm: 2, fee: 20 },
    tier2: { maxDistanceKm: 3.5, fee: 25 },
    tier3: { maxDistanceKm: 6, fee: 40 },
    tier4: { maxDistanceKm: 12, fee: 80 },
    tier5: { maxDistanceKm: 20, fee: 120 }
  },
  rideBikePricing: {
    tier1: { maxDistanceKm: 2, fee: 20 },
    tier2: { maxDistanceKm: 3.5, fee: 25 },
    tier3: { maxDistanceKm: 6, fee: 40 },
    tier4: { maxDistanceKm: 12, fee: 80 },
    tier5: { maxDistanceKm: 20, fee: 120 }
  },
  rideAutoPricing: {
    tier1: { maxDistanceKm: 2, fee: 30 },
    tier2: { maxDistanceKm: 3.5, fee: 40 },
    tier3: { maxDistanceKm: 6, fee: 70 },
    tier4: { maxDistanceKm: 12, fee: 120 },
    tier5: { maxDistanceKm: 20, fee: 200 },
    tier6: { maxDistanceKm: 40, fee: 400 }
  },
  rideServices: {
    bikeEnabled: true,
    autoEnabled: true,
    parcelEnabled: true
  },
  sameAddressMultiOrder: {
    enabled: true,
    maxOrders: 3,
    eligibleTiers: ["tier4", "tier5"]
  },
  surcharges: {
    rain: { enabled: false, fee: 10 },
    lateNight: { enabled: false, fee: 20 },
    festival: { enabled: false, fee: 15 }
  },
  serviceTypeLimits: {
    food:       { enabled: true, maxItemsPerOrder: 20, minOrderAmount: 0,   deliveryFeeMultiplier: 1.0 },
    grocery:    { enabled: true, maxItemsPerOrder: 10, minOrderAmount: 99,  deliveryFeeMultiplier: 1.0 },
    vegetables: { enabled: true, maxItemsPerOrder: 5,  minOrderAmount: 49,  deliveryFeeMultiplier: 1.0, maxWeightKg: 5 },
    meat:       { enabled: true, maxItemsPerOrder: 5,  minOrderAmount: 149, deliveryFeeMultiplier: 1.2, maxWeightKg: 5 },
    cool_hot:   { enabled: true, maxItemsPerOrder: 5,  minOrderAmount: 49,  deliveryFeeMultiplier: 1.1 }
  }
};

const normalizeSettings = (incoming) => {
  if (!incoming) return { ...defaultPlatformSettings };

  const enabled = incoming.restaurantCommissionEnabled !== undefined 
    ? Boolean(incoming.restaurantCommissionEnabled) 
    : (defaultPlatformSettings.restaurantCommissionEnabled ?? true);

  const rawPercentage = incoming.restaurantCommissionPercentage !== undefined 
    ? incoming.restaurantCommissionPercentage 
    : incoming.commissionPercent;

  const parsedPercentage = Number.isFinite(Number(rawPercentage))
    ? Number(rawPercentage)
    : (defaultPlatformSettings.restaurantCommissionPercentage ?? 15);

  return {
    ...defaultPlatformSettings,
    ...incoming,
    restaurantCommissionEnabled: enabled,
    restaurantCommissionPercentage: parsedPercentage,
    commissionPercent: parsedPercentage,
    foodDeliveryPricing: {
      ...defaultPlatformSettings.foodDeliveryPricing,
      ...(incoming.foodDeliveryPricing || {})
    },
    rideBikePricing: {
      ...defaultPlatformSettings.rideBikePricing,
      ...(incoming.rideBikePricing || {})
    },
    rideAutoPricing: {
      ...defaultPlatformSettings.rideAutoPricing,
      ...(incoming.rideAutoPricing || {})
    },
    rideServices: {
      ...defaultPlatformSettings.rideServices,
      ...(incoming.rideServices || {})
    },
    sameAddressMultiOrder: {
      ...defaultPlatformSettings.sameAddressMultiOrder,
      ...(incoming.sameAddressMultiOrder || {})
    },
    surcharges: {
      ...defaultPlatformSettings.surcharges,
      ...(incoming.surcharges || {})
    },
    serviceTypeLimits: {
      food:       { ...defaultPlatformSettings.serviceTypeLimits.food,       ...(incoming.serviceTypeLimits?.food || {}) },
      grocery:    { ...defaultPlatformSettings.serviceTypeLimits.grocery,    ...(incoming.serviceTypeLimits?.grocery || {}) },
      vegetables: { ...defaultPlatformSettings.serviceTypeLimits.vegetables, ...(incoming.serviceTypeLimits?.vegetables || {}) },
      meat:       { ...defaultPlatformSettings.serviceTypeLimits.meat,       ...(incoming.serviceTypeLimits?.meat || {}) },
      cool_hot:   { ...defaultPlatformSettings.serviceTypeLimits.cool_hot,   ...(incoming.serviceTypeLimits?.cool_hot || {}) }
    }
  };
};

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics', 'kyc', 'users', 'withdrawals', 'complaints', 'coupons', 'settings'
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  // States
  const [metrics, setMetrics] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(defaultPlatformSettings);
  const [settingsForm, setSettingsForm] = useState(defaultPlatformSettings);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const settingsInitializedRef = useRef(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [restaurantsList, setRestaurantsList] = useState([]);

  // Date filter for Restaurant Payments Breakdown table
  const [analyticsDateFilterType, setAnalyticsDateFilterType] = useState('all');
  const [analyticsCustomStartDate, setAnalyticsCustomStartDate] = useState('');
  const [analyticsCustomEndDate, setAnalyticsCustomEndDate] = useState('');
  const [analyticsShowDatePicker, setAnalyticsShowDatePicker] = useState(false);
  const [analyticsAppliedDateFilter, setAnalyticsAppliedDateFilter] = useState({ type: 'all', start: '', end: '' });

  // KYC Center
  const [pendingKyc, setPendingKyc] = useState([]);
  const [isKycLoading, setIsKycLoading] = useState(true);
  const [kycRemarks, setKycRemarks] = useState({});
  const [liveRiderLocations, setLiveRiderLocations] = useState({});

  // User Manager
  const [allUsers, setAllUsers] = useState([]);
  const availableFoodRiders = allUsers.filter(u => u.role === 'delivery' && u.kycStatus === 'Approved' && !u.isBlocked && u.deliveryDetails?.isAvailable && u.deliveryDetails?.activeFoodDelivery !== false);
  const availableRideCaptains = allUsers.filter(u => u.role === 'delivery' && u.kycStatus === 'Approved' && !u.isBlocked && u.deliveryDetails?.isAvailable && u.deliveryDetails?.activeRide !== false);
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all', 'customer', 'restaurant', 'delivery'
  const [riderAvailabilityFilter, setRiderAvailabilityFilter] = useState('all'); // 'all', 'food', 'ride'
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [blockingUserId, setBlockingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  // Add/Edit User modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ _id: '', name: '', email: '', phone: '' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserError, setEditUserError] = useState('');

  // Admin Edit Profile modal
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', email: '', phone: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');

  // Admin Restaurant Opening Hours Modal State
  const [showRestaurantHoursModal, setShowRestaurantHoursModal] = useState(false);
  const [selectedRestaurantForHours, setSelectedRestaurantForHours] = useState(null);
  const [adminOpeningHours, setAdminOpeningHours] = useState(DEFAULT_OPENING_HOURS);
  const [isAdminHoursSaving, setIsAdminHoursSaving] = useState(false);
  const [adminBulkOpenTime, setAdminBulkOpenTime] = useState('09:00');
  const [adminBulkCloseTime, setAdminBulkCloseTime] = useState('23:00');
  const [adminHoursSuccess, setAdminHoursSuccess] = useState('');
  const [adminHoursError, setAdminHoursError] = useState('');

  // Rider Rejections State
  const [pendingRejectionsCount, setPendingRejectionsCount] = useState(0);

  const fetchRejectionsCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/rider-rejections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRejectionsCount(Number(data.pendingCount || 0));
      }
    } catch (err) {
      console.error('Error fetching rider rejections count:', err);
    }
  };

  // Payout Approvals
  const [withdrawals, setWithdrawals] = useState([]);
  const [isWithdrawalsLoading, setIsWithdrawalsLoading] = useState(true);
  const [approvingWithdrawalId, setApprovingWithdrawalId] = useState(null);

  // Complaints Desk
  const [complaints, setComplaints] = useState([]);
  const [isComplaintsLoading, setIsComplaintsLoading] = useState(true);
  const [resolvingComplaintId, setResolvingComplaintId] = useState(null);

  // Coupon Desk (Mocked in memory)
  const [coupons, setCoupons] = useState([
    { _id: 'cp1', code: 'WELCOME50', discount: 50, minAmount: 199, isPlatform: true },
    { _id: 'cp2', code: 'SUPER75', discount: 75, minAmount: 299, isPlatform: true },
    { _id: 'cp3', code: 'FREEDEL', discount: 40, minAmount: 149, isPlatform: true }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponMin, setNewCouponMin] = useState('199');

  // Orders history
  const [allOrders, setAllOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [riderAssignmentFilter, setRiderAssignmentFilter] = useState('all'); // 'all', 'assigned', 'waiting', 'rejected'
  const [assignRiderOrder, setAssignRiderOrder] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // Banners Management
  const [banners, setBanners] = useState([]);
  const [isBannersLoading, setIsBannersLoading] = useState(true);

  // Add Banner Modal & Form State
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [addBannerForm, setAddBannerForm] = useState({
    title: '',
    subtitle: '',
    buttonText: 'Order Now',
    link: '/restaurants',
    displayOrder: 1,
    isActive: true,
    imageUrl: ''
  });
  const [addBannerFile, setAddBannerFile] = useState(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [addBannerError, setAddBannerError] = useState('');

  // Edit Banner Modal & Form State
  const [showEditBannerModal, setShowEditBannerModal] = useState(false);
  const [editBannerForm, setEditBannerForm] = useState({
    _id: '',
    title: '',
    subtitle: '',
    buttonText: 'Order Now',
    link: '/restaurants',
    displayOrder: 1,
    isActive: true,
    imageUrl: ''
  });
  const [editBannerFile, setEditBannerFile] = useState(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editBannerError, setEditBannerError] = useState('');

  // Delete Banner Confirmation Modal
  const [deleteBannerModal, setDeleteBannerModal] = useState({
    isOpen: false,
    banner: null
  });
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);

  // Orders Pipeline sub-tabs and Date filtering
  const [orderPipelineTab, setOrderPipelineTab] = useState('new'); // 'new', 'ongoing', 'completed'

  // Global History Filter for Admin Order History
  const historyFilter = useHistoryFilter(allOrders, {
    dateKey: 'createdAt',
    typeKey: 'orderType',
    statusKey: 'status'
  });
  const [showOrderCalendarModal, setShowOrderCalendarModal] = useState(false);
  const [showClearAllOrdersModal, setShowClearAllOrdersModal] = useState(false);

  const handleClearAllOrderHistory = async () => {
    const res = await fetch(`${API_BASE}/admin/orders/history`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to clear order history');
    }
    setAllOrders(prev => prev.filter(o => !['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(o.status)));
  };

  // Category Management
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryService, setSelectedCategoryService] = useState('food');
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryForm, setAddCategoryForm] = useState({ name: '', image: '', dashboardType: 'food', displayOrder: '', isActive: true });
  const [addCategoryFile, setAddCategoryFile] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState('');

  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryForm, setEditCategoryForm] = useState({ _id: '', name: '', image: '', dashboardType: 'food', displayOrder: 1, isActive: true });
  const [editCategoryFile, setEditCategoryFile] = useState(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState('');

  const [deleteCategoryModal, setDeleteCategoryModal] = useState({ isOpen: false, category: null, warningMessage: '', hasProducts: false, count: 0 });
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Category Service Availability (6 Primary Platform Services)
  const [categoryServices, setCategoryServices] = useState([
    { id: 'food', name: 'Food', isEnabled: true, image: '/assets/cat_food.jpg' },
    { id: 'ride', name: 'Ride & Courier', isEnabled: true, image: '/assets/cat_ride.jpg' },
    { id: 'grocery', name: 'Grocery', isEnabled: true, image: '/assets/cat_grocery.jpg' },
    { id: 'bakery_beverages', name: 'Bakery & Beverages', isEnabled: true, image: '/assets/cat_hot_cool.jpg' },
    { id: 'veg_fruits', name: 'Veg & Fruits', isEnabled: true, image: '/assets/cat_veg_fruits.jpg' },
    { id: 'meat', name: 'Meat', isEnabled: true, image: '/assets/cat_meat.jpg' }
  ]);
  const [isCategoryServicesLoading, setIsCategoryServicesLoading] = useState(false);
  const [categoryServiceToggleLoading, setCategoryServiceToggleLoading] = useState({});

  // Category Design State (Home Category Designer)
  const [adminCategoryDesigns, setAdminCategoryDesigns] = useState(DEFAULT_CATEGORY_DESIGNS);
  const [isAdminCategoryDesignsLoading, setIsAdminCategoryDesignsLoading] = useState(false);
  const [selectedDesignCategory, setSelectedDesignCategory] = useState('food');

  const fetchCategoryDesigns = async () => {
    try {
      setIsAdminCategoryDesignsLoading(true);
      const res = await fetch(`${API_BASE}/admin/category-designs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setAdminCategoryDesigns(data);
        }
      }
    } catch (err) {
      console.error('Error fetching admin category designs:', err);
    } finally {
      setIsAdminCategoryDesignsLoading(false);
    }
  };

  // Promo Banner Design State
  const [bannerDesigns, setBannerDesigns] = useState({});
  const [isBannerDesignsLoading, setIsBannerDesignsLoading] = useState(false);
  const [selectedDesignBannerId, setSelectedDesignBannerId] = useState(null);

  // Home Hero Banner State
  const [selectedHeroBannerId, setSelectedHeroBannerId] = useState(null);

  const fetchBannerDesigns = async () => {
    try {
      setIsBannerDesignsLoading(true);
      const res = await fetch(`${API_BASE}/admin/banner-designs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setBannerDesigns(data);
        }
      }
    } catch (err) {
      console.error('Error fetching admin banner designs:', err);
    } finally {
      setIsBannerDesignsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAnalytics();
    fetchPendingKyc();
    fetchUsers();
    fetchWithdrawals();
    fetchComplaints();
    fetchAllOrders();
    fetchRestaurants();
    fetchBanners();
    fetchCategories();
    fetchCategoryServices();
    fetchCategoryDesigns();
    fetchBannerDesigns();
    fetchRejectionsCount();

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join', 'admin_room');
      socket.emit('join', 'admin');
    });

    socket.on('riderRejectionCreated', () => {
      fetchRejectionsCount();
    });

    socket.on('riderRejectionUpdated', () => {
      fetchRejectionsCount();
    });

    socket.on('orderStatusChanged', (data) => {
      if (data && data.order) {
        setAllOrders(prev => {
          const exists = prev.find(o => o._id === data.orderId);
          if (exists) {
            return prev.map(o => o._id === data.orderId ? { ...o, ...data.order } : o);
          }
          // If not in our list, it might be a newly created order or we don't have its full payload.
          // Fetch all to guarantee we have all populated customer/restaurant references.
          fetchAllOrders();
          return prev;
        });
      } else {
        fetchAllOrders();
      }
      fetchAnalytics();
    });

    socket.on('locationUpdated', ({ orderId, lat, lng }) => {
      setLiveRiderLocations(prev => ({
        ...prev,
        [orderId]: { lat, lng }
      }));
    });

    const interval = setInterval(() => {
      fetchAllOrders();
      fetchAnalytics();
    }, 10000);
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [token, user, navigate]);


  const fetchAllOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching all orders:', err);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const [selectedRiders, setSelectedRiders] = useState({});

  const handleAssignRider = async (orderId, riderId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/assign-rider`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ riderId })
      });
      if (res.ok) {
        const updated = await res.json();
        setAllOrders(prev => prev.map(o => o._id === orderId ? updated : o));
        alert('Rider manually assigned successfully');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to assign rider');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning rider');
    }
  };

  const [selectedCaptains, setSelectedCaptains] = useState({});

  const handleAssignCaptain = async (orderId, captainId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/assign-captain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ captainId })
      });
      if (res.ok) {
        const updated = await res.json();
        setAllOrders(prev => prev.map(o => o._id === orderId ? updated : o));
        alert('Captain manually assigned successfully');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to assign captain');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning captain');
    }
  };

  const handleOpenAssignRiderModal = (order) => {
    setAssignRiderOrder(order);
    setReassignError('');
  };

  const handleConfirmReassignRider = async (targetRider) => {
    if (!assignRiderOrder || !targetRider) return;
    setIsReassigning(true);
    setReassignError('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${assignRiderOrder._id}/rejection-action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reassign',
          targetRiderId: targetRider._id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reassign rider.');
      }

      setAllOrders(prev => prev.map(o => o._id === assignRiderOrder._id ? data.order : o));
      if (selectedDetailsOrder && selectedDetailsOrder._id === assignRiderOrder._id) {
        setSelectedDetailsOrder(data.order);
      }
      setAssignRiderOrder(null);
      fetchRejectionsCount();
    } catch (err) {
      console.error('Error reassigning rider:', err);
      setReassignError(err.message || 'Error reassigning rider.');
    } finally {
      setIsReassigning(false);
    }
  };

  const handleMarkRejectionHandled = async (order) => {
    if (!order) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${order._id}/rejection-action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'mark_handled'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAllOrders(prev => prev.map(o => o._id === order._id ? data.order : o));
        if (selectedDetailsOrder && selectedDetailsOrder._id === order._id) {
          setSelectedDetailsOrder(data.order);
        }
        fetchRejectionsCount();
      }
    } catch (err) {
      console.error('Error marking rejection handled:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchAllOrders();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/banners`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBanners(await res.json());
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setIsBannersLoading(false);
    }
  };

  const fetchCategoryServices = async () => {
    try {
      setIsCategoryServicesLoading(true);
      const res = await fetch(`${API_BASE}/admin/category-services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategoryServices(data);
        }
      }
    } catch (err) {
      console.error('Error fetching category services:', err);
    } finally {
      setIsCategoryServicesLoading(false);
    }
  };

  const handleUpdateCategoryService = async (serviceId, updateFields) => {
    setCategoryServiceToggleLoading(prev => ({ ...prev, [serviceId]: true }));
    // Optimistic UI update
    setCategoryServices(prev => prev.map(c => c.id === serviceId ? { ...c, ...updateFields } : c));
    try {
      const res = await fetch(`${API_BASE}/admin/category-services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateFields)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to update category service');
        fetchCategoryServices();
      } else {
        setCategoryServices(prev => prev.map(c => c.id === serviceId ? data : c));
      }
    } catch (err) {
      console.error('Update category service error:', err);
      fetchCategoryServices();
    } finally {
      setCategoryServiceToggleLoading(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleToggleCategoryService = async (serviceId, newStatus) => {
    return handleUpdateCategoryService(serviceId, { isEnabled: newStatus });
  };

  const fetchCategories = async (service = selectedCategoryService) => {
    try {
      setIsCategoriesLoading(true);
      const queryParam = service && service !== 'all' ? `?service=${service}` : '';
      const res = await fetch(`${API_BASE}/admin/categories${queryParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsAddingCategory(true);
    setAddCategoryError('');
    try {
      let imageUrl = (addCategoryForm.image || '').trim();
      if (addCategoryFile) {
        imageUrl = await uploadFileToBackend(addCategoryFile);
      }
      if (!imageUrl) {
        setAddCategoryError('Please choose an image file or provide an Image URL.');
        setIsAddingCategory(false);
        return;
      }

      const res = await fetch(`${API_BASE}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addCategoryForm.name.trim(),
          image: imageUrl,
          dashboardType: addCategoryForm.dashboardType,
          displayOrder: addCategoryForm.displayOrder ? Number(addCategoryForm.displayOrder) : undefined,
          isActive: addCategoryForm.isActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAddCategoryError(data.message || 'Failed to add category');
      } else {
        setShowAddCategoryModal(false);
        setAddCategoryForm({ name: '', image: '', dashboardType: selectedCategoryService !== 'all' ? selectedCategoryService : 'food', displayOrder: '', isActive: true });
        setAddCategoryFile(null);
        fetchCategories(selectedCategoryService);
      }
    } catch (err) {
      setAddCategoryError(err.message || 'Failed to add category');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    setIsEditingCategory(true);
    setEditCategoryError('');
    try {
      let imageUrl = (editCategoryForm.image || '').trim();
      if (editCategoryFile) {
        imageUrl = await uploadFileToBackend(editCategoryFile);
      }
      if (!imageUrl) {
        setEditCategoryError('Please choose an image file or provide an Image URL.');
        setIsEditingCategory(false);
        return;
      }

      const res = await fetch(`${API_BASE}/admin/categories/${editCategoryForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editCategoryForm.name.trim(),
          image: imageUrl,
          dashboardType: editCategoryForm.dashboardType,
          displayOrder: Number(editCategoryForm.displayOrder),
          isActive: editCategoryForm.isActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditCategoryError(data.message || 'Failed to update category');
      } else {
        setShowEditCategoryModal(false);
        setEditCategoryFile(null);
        fetchCategories(selectedCategoryService);
      }
    } catch (err) {
      setEditCategoryError(err.message || 'Failed to update category');
    } finally {
      setIsEditingCategory(false);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${cat._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !cat.isActive })
      });
      if (res.ok) {
        fetchCategories(selectedCategoryService);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleMoveCategory = async (cat, direction) => {
    const filtered = categoriesList.filter(c => selectedCategoryService === 'all' || c.dashboardType === selectedCategoryService);
    const idx = filtered.findIndex(c => c._id === cat._id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const newOrdered = [...filtered];
    const temp = newOrdered[idx];
    newOrdered[idx] = newOrdered[targetIdx];
    newOrdered[targetIdx] = temp;

    const orderedIds = newOrdered.map(c => c._id);
    try {
      await fetch(`${API_BASE}/admin/categories/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderedIds })
      });
      fetchCategories(selectedCategoryService);
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleDeleteCategory = async (cat, force = false) => {
    setIsDeletingCategory(true);
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${cat._id}?force=${force}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.hasProducts) {
          setDeleteCategoryModal({
            isOpen: true,
            category: cat,
            hasProducts: true,
            count: data.count,
            warningMessage: data.message
          });
        } else {
          alert(data.message || 'Failed to delete category');
        }
      } else {
        setDeleteCategoryModal({ isOpen: false, category: null, warningMessage: '', hasProducts: false, count: 0 });
        fetchCategories(selectedCategoryService);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurants`);
      if (res.ok) {
        const data = await res.json();
        setRestaurantsList(data);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  };

  const getOrdersByDateForAnalytics = (ordersList) => {
    let list = [...ordersList];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (analyticsAppliedDateFilter.type === 'today') {
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= todayStart;
      });
    } else if (analyticsAppliedDateFilter.type === 'yesterday') {
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
      const yesterdayEnd = todayStart - 1;
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= yesterdayStart && t <= yesterdayEnd;
      });
    } else if (analyticsAppliedDateFilter.type === '7days') {
      const start = todayStart - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(o => new Date(o.createdAt).getTime() >= start);
    } else if (analyticsAppliedDateFilter.type === '30days') {
      const start = todayStart - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(o => new Date(o.createdAt).getTime() >= start);
    } else if (analyticsAppliedDateFilter.type === 'custom') {
      const start = analyticsAppliedDateFilter.start ? new Date(analyticsAppliedDateFilter.start).setHours(0,0,0,0) : 0;
      const end = analyticsAppliedDateFilter.end ? new Date(analyticsAppliedDateFilter.end).setHours(23,59,59,999) : Infinity;
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= start && t <= end;
      });
    }
    return list;
  };

  const getAnalyticsDateLabel = () => {
    const now = new Date();
    const todayStr = formatAppDateOnly(now);
    if (analyticsAppliedDateFilter.type === 'all') return 'All Time';
    if (analyticsAppliedDateFilter.type === 'today') return `${todayStr} / Today`;
    if (analyticsAppliedDateFilter.type === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(yesterday)} / Yesterday`;
    }
    if (analyticsAppliedDateFilter.type === '7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(start)} - ${todayStr} / Last 7 Days`;
    }
    if (analyticsAppliedDateFilter.type === '30days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(start)} - ${todayStr} / Last 30 Days`;
    }
    if (analyticsAppliedDateFilter.type === 'custom') {
      const startLabel = analyticsAppliedDateFilter.start ? formatAppDateOnly(analyticsAppliedDateFilter.start) : 'Start';
      const endLabel = analyticsAppliedDateFilter.end ? formatAppDateOnly(analyticsAppliedDateFilter.end) : 'End';
      return `${startLabel} - ${endLabel} / Custom Date`;
    }
    return 'Select Date Range';
  };

  const getRestaurantIncomeBreakdown = (restaurantId) => {
    let upi = 0;
    let card = 0;
    let cod = 0;
    const restaurantOrders = allOrders.filter(o => String(o.restaurantId) === String(restaurantId) || (o.items && o.items.some(i => String(i.restaurantId) === String(restaurantId))));
    const dateFilteredOrders = getOrdersByDateForAnalytics(restaurantOrders);

    dateFilteredOrders.forEach(order => {
      const fin = getOrderFinancialBreakdown(order);
      const rItem = fin.restaurant.byRestaurant.find(r => String(r.restaurantId) === String(restaurantId));
      const amount = rItem ? rItem.restaurantPayable : fin.restaurant.restaurantPayable;
      const method = order.paymentDetails?.method || 'COD';
      if (method === 'UPI') upi += amount;
      else if (method === 'Card') card += amount;
      else if (method === 'COD') cod += amount;
    });

    return { upi, card, cod, total: upi + card + cod };
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        const normalized = normalizeSettings(data.settings);
        setPlatformSettings(normalized);
        if (!settingsInitializedRef.current && data.settings) {
          settingsInitializedRef.current = true;
          setSettingsForm(normalized);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const fetchPendingKyc = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/kyc/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingKyc(data);
      }
    } catch (err) {
      console.error('Error fetching pending KYC:', err);
    } finally {
      setIsKycLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setIsWithdrawalsLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setIsComplaintsLoading(false);
    }
  };

  // KYC Approval / Rejection
  const handleKycStatus = async (userId, status) => {
    const remarks = kycRemarks[userId] || `Reviewed and ${status} by Super Admin`;
    try {
      const res = await fetch(`${API_BASE}/admin/kyc/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, remarks })
      });
      if (res.ok) {
        setPendingKyc(prev => prev.filter(u => u._id !== userId));
        fetchUsers(); // Refresh users list
        fetchAnalytics(); // Update active partner counts
        alert(`Partner KYC successfully ${status}!`);
      }
    } catch (err) {
      console.error('Error updating KYC:', err);
    }
  };

  // Block / Unblock User
  const handleToggleBlockUser = async (userId) => {
    setBlockingUserId(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setAllUsers(prev => prev.map(u => u._id === userId ? updated : u));
      }
    } catch (err) {
      console.error('Error blocking user:', err);
    } finally {
      setBlockingUserId(null);
    }
  };

  // Add new user (admin)
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    setIsAddingUser(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(addUserForm)
      });
      const data = await res.json();
      if (!res.ok) { setAddUserError(data.message || 'Failed to create user.'); return; }
      setAllUsers(prev => [data, ...prev]);
      setShowAddUserModal(false);
      setAddUserForm({ name: '', email: '', phone: '', password: '', role: 'customer' });
      fetchAnalytics();
    } catch (err) { setAddUserError('Server error.'); }
    finally { setIsAddingUser(false); }
  };

  // Edit user (admin)
  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditUserError('');
    setIsEditingUser(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editUserForm._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editUserForm.name, email: editUserForm.email, phone: editUserForm.phone })
      });
      const data = await res.json();
      if (!res.ok) { setEditUserError(data.message || 'Failed to update user.'); return; }
      setAllUsers(prev => prev.map(u => u._id === data._id ? data : u));
      setShowEditUserModal(false);
    } catch (err) { setEditUserError('Server error.'); }
    finally { setIsEditingUser(false); }
  };

  // Admin edit own profile
  const handleEditAdminProfile = async (e) => {
    e.preventDefault();
    setEditProfileError(''); setEditProfileSuccess('');
    setIsEditingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editProfileForm.name, phone: editProfileForm.phone })
      });
      const data = await res.json();
      if (!res.ok) { setEditProfileError(data.message || 'Failed to update profile.'); return; }
      setEditProfileSuccess('Profile updated successfully!');
      setTimeout(() => { setShowEditProfileModal(false); setEditProfileSuccess(''); }, 1200);
    } catch (err) { setEditProfileError('Server error.'); }
    finally { setIsEditingProfile(false); }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This will also delete any associated restaurant and menu listings.')) {
      return;
    }
    setDeletingUserId(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllUsers(prev => prev.filter(u => u._id !== userId));
        fetchAnalytics(); // Refresh analytics as counts will change
        alert('User deleted successfully.');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error deleting user.');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Update Rider delivery details (Availability or Vehicle type)
  const handleUpdateRiderDetails = async (userId, fields) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/delivery-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        const updated = await res.json();
        setAllUsers(prev => prev.map(u => u._id === userId ? updated : u));
      }
    } catch (err) {
      console.error('Error updating rider details:', err);
    }
  };

  // Approve withdrawal request
  const handleApproveWithdrawal = async (requestId) => {
    setApprovingWithdrawalId(requestId);
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setWithdrawals(prev => prev.map(w => w._id === requestId ? { ...w, status: 'Completed' } : w));
        alert('Withdrawal request approved and processed successfully!');
        fetchAnalytics(); // Update wallet metrics
      }
    } catch (err) {
      console.error('Error approving withdrawal:', err);
    } finally {
      setApprovingWithdrawalId(null);
    }
  };

  // Resolve complaint
  const handleResolveComplaint = async (complaintId) => {
    setResolvingComplaintId(complaintId);
    try {
      const res = await fetch(`${API_BASE}/admin/complaints/${complaintId}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setComplaints(prev => prev.map(c => c._id === complaintId ? { ...c, status: 'Resolved' } : c));
        alert('Complaint ticket marked as resolved.');
      }
    } catch (err) {
      console.error('Error resolving complaint:', err);
    } finally {
      setResolvingComplaintId(null);
    }
  };

  // Create platform coupon code
  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponDiscount) return;

    const newCode = {
      _id: Math.random().toString(36).substr(2, 9),
      code: newCouponCode.toUpperCase().trim(),
      discount: parseFloat(newCouponDiscount),
      minAmount: parseFloat(newCouponMin) || 199,
      isPlatform: true
    };

    setCoupons(prev => [newCode, ...prev]);
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponMin('199');
    alert(`Platform Promo Code ${newCode.code} has been created!`);
  };

  // Delete platform coupon code
  const handleDeleteCoupon = (couponId) => {
    setCoupons(prev => prev.filter(c => c._id !== couponId));
  };

  // Save platform settings parameters
  const handleSaveSettings = async (e, customData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const dataToSave = customData || settingsForm;
    if (!dataToSave) return;

    const radius = parseFloat(dataToSave.globalServiceRadiusKm);
    if (!Number.isFinite(radius) || radius < 0.1 || radius > 500) {
      alert('Please enter a valid Service Radius between 0.1 KM and 500 KM.');
      return;
    }
    setIsSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) {
        const updated = await res.json();
        const normalized = normalizeSettings(updated);
        setPlatformSettings(normalized);
        setSettingsForm(normalized);
        alert('Platform settings updated successfully!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to connect to server while saving settings.');
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    setAddBannerError('');

    let finalImageUrl = (addBannerForm.imageUrl || '').trim();
    if (addBannerFile) {
      // New file selected, will upload below
    } else if (!finalImageUrl) {
      setAddBannerError('Please choose an image file or provide an Image URL.');
      return;
    }
    if (!addBannerForm.title.trim()) {
      setAddBannerError('Please enter a banner title.');
      return;
    }

    setIsAddingBanner(true);
    try {
      if (addBannerFile) {
        finalImageUrl = await uploadFileToBackend(addBannerFile);
      }

      const res = await fetch(`${API_BASE}/admin/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          title: addBannerForm.title.trim(),
          subtitle: addBannerForm.subtitle.trim(),
          buttonText: addBannerForm.buttonText.trim() || 'Order Now',
          link: addBannerForm.link.trim() || '/restaurants',
          displayOrder: Number(addBannerForm.displayOrder) || (banners.length + 1),
          isActive: addBannerForm.isActive,
          active: addBannerForm.isActive
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create banner');
      }

      setShowAddBannerModal(false);
      setAddBannerForm({
        title: '',
        subtitle: '',
        buttonText: 'Order Now',
        link: '/restaurants',
        displayOrder: banners.length + 2,
        isActive: true,
        imageUrl: ''
      });
      setAddBannerFile(null);
      fetchBanners();
    } catch (err) {
      console.error(err);
      setAddBannerError(err.message || 'Failed to create banner');
    } finally {
      setIsAddingBanner(false);
    }
  };

  const handleOpenEditBanner = (banner) => {
    setEditBannerForm({
      _id: banner._id,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      buttonText: banner.buttonText || 'Order Now',
      link: banner.link || '/restaurants',
      displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 1,
      isActive: banner.isActive !== false && banner.active !== false,
      imageUrl: banner.imageUrl || ''
    });
    setEditBannerFile(null);
    setEditBannerError('');
    setShowEditBannerModal(true);
  };

  const handleEditBanner = async (e) => {
    e.preventDefault();
    setEditBannerError('');

    let finalImageUrl = (editBannerForm.imageUrl || '').trim();
    if (editBannerFile) {
      // New file selected, will upload below
    } else if (!finalImageUrl) {
      setEditBannerError('Please choose an image file or provide an Image URL.');
      return;
    }
    if (!editBannerForm.title.trim()) {
      setEditBannerError('Please enter a banner title.');
      return;
    }

    setIsEditingBanner(true);
    try {
      if (editBannerFile) {
        finalImageUrl = await uploadFileToBackend(editBannerFile);
      }

      const res = await fetch(`${API_BASE}/admin/banners/${editBannerForm._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          title: editBannerForm.title.trim(),
          subtitle: editBannerForm.subtitle.trim(),
          buttonText: editBannerForm.buttonText.trim() || 'Order Now',
          link: editBannerForm.link.trim() || '/restaurants',
          displayOrder: Number(editBannerForm.displayOrder) || 1,
          isActive: editBannerForm.isActive,
          active: editBannerForm.isActive
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update banner');
      }

      setShowEditBannerModal(false);
      setEditBannerFile(null);
      fetchBanners();
    } catch (err) {
      console.error(err);
      setEditBannerError(err.message || 'Failed to update banner');
    } finally {
      setIsEditingBanner(false);
    }
  };

  const handleToggleBanner = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBanner = async (banner) => {
    setIsDeletingBanner(true);
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${banner._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteBannerModal({ isOpen: false, banner: null });
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingBanner(false);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userRoleFilter === 'delivery' && riderAvailabilityFilter !== 'all') {
      const isOnline = u.deliveryDetails?.isAvailable === true;
      if (riderAvailabilityFilter === 'food') return isOnline && u.deliveryDetails?.activeFoodDelivery !== false;
      if (riderAvailabilityFilter === 'ride') return isOnline && u.deliveryDetails?.activeRide !== false;
    }
    return true;
  });

  const adminRiders = allUsers.filter(u => u.role === 'delivery');
  const adminFoodAvailable = adminRiders.some(r => r.deliveryDetails?.isAvailable === true && r.deliveryDetails?.activeFoodDelivery !== false);
  const adminRideAvailable = adminRiders.some(r => r.deliveryDetails?.isAvailable === true && r.deliveryDetails?.activeRide !== false);

  const getDateLabel = () => {
    const now = new Date();
    const todayStr = formatAppDateOnly(now);
    if (appliedDateFilter.type === 'all') return 'All Time';
    if (appliedDateFilter.type === 'today') return `${todayStr} / Today`;
    if (appliedDateFilter.type === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(yesterday)} / Yesterday`;
    }
    if (appliedDateFilter.type === '7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(start)} - ${todayStr} / Last 7 Days`;
    }
    if (appliedDateFilter.type === '30days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `${formatAppDateOnly(start)} - ${todayStr} / Last 30 Days`;
    }
    if (appliedDateFilter.type === 'custom') {
      const startLabel = appliedDateFilter.start ? formatAppDateOnly(appliedDateFilter.start) : 'Start';
      const endLabel = appliedDateFilter.end ? formatAppDateOnly(appliedDateFilter.end) : 'End';
      return `${startLabel} - ${endLabel} / Custom Date Range`;
    }
    return 'Select Date Range';
  };

  const renderCalendar = (onDateSelect) => {
    const { year, month } = calendarViewDate;
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

    const goToPrevMonth = () => {
      setCalendarViewDate(prev => {
        if (prev.month === 0) return { year: prev.year - 1, month: 11 };
        return { year: prev.year, month: prev.month - 1 };
      });
    };

    const goToNextMonth = () => {
      setCalendarViewDate(prev => {
        if (prev.month === 11) return { year: prev.year + 1, month: 0 };
        return { year: prev.year, month: prev.month + 1 };
      });
    };

    const dayCells = [];
    for (let i = 0; i < firstDay; i++) {
      dayCells.push(<div key={`empty-${i}`} className="w-6 h-6" />);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dayCells.push(
        <button
          key={d}
          type="button"
          onClick={() => onDateSelect && onDateSelect(dateStr)}
          className="w-6 h-6 rounded-full text-[10px] font-bold hover:bg-violet-50 hover:text-primary transition-all flex items-center justify-center cursor-pointer"
        >
          {d}
        </button>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 border border-line p-2.5 rounded-2xl bg-base/50">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-violet-100 hover:text-primary text-muted transition-all cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <h4 className="font-display font-black text-xs text-primary">{monthName} {year}</h4>
          <button
            type="button"
            onClick={goToNextMonth}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-violet-100 hover:text-primary text-muted transition-all cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-[9px] font-bold text-muted text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-gray-650 text-center">
          {dayCells}
        </div>
      </div>
    );
  };

  const dateFilteredOrders = historyFilter.filteredItems;

  const newOrdersCount = dateFilteredOrders.filter(o => o.status === 'Placed').length;
  const ongoingOrdersCount = dateFilteredOrders.filter(o => ['Accepted', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer', 'Confirmed', 'Out for Delivery'].includes(o.status)).length;
  const completedOrdersCount = dateFilteredOrders.filter(o => ['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(o.status)).length;

  const pendingRejectionOrdersCount = allOrders.filter(o => o.hasRiderRejection && (o.riderRejections || []).some(r => r.status === 'Pending_Admin_Review')).length;

  const filteredOrders = dateFilteredOrders.filter(o => {
    // 1. Pipeline subtab filter
    if (orderPipelineTab === 'new' && o.status !== 'Placed') return false;
    if (orderPipelineTab === 'ongoing' && !['Accepted', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer', 'Confirmed', 'Out for Delivery'].includes(o.status)) return false;
    if (orderPipelineTab === 'completed' && !['Delivered', 'Completed', 'Rejected', 'Cancelled'].includes(o.status)) return false;

    // 2. Rider Assignment filter
    if (riderAssignmentFilter === 'assigned') {
      return Boolean(o.deliveryAgent && (o.deliveryAgent.id || o.deliveryAgent.phone));
    }
    if (riderAssignmentFilter === 'waiting') {
      return (!o.deliveryAgent || !o.deliveryAgent.phone) && !['Delivered', 'Completed', 'Cancelled'].includes(o.status);
    }
    if (riderAssignmentFilter === 'rejected') {
      return Boolean(o.hasRiderRejection && (o.riderRejections || []).some(r => r.status === 'Pending_Admin_Review'));
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full mt-4">

      {/* Super Admin Control Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-155">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-main leading-tight">
              Super Admin Control Center
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">Control platform settings, approve partners, track finances</p>
          </div>
        </div>

        {/* Global Operational Status Badge + Edit Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditProfileForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }); setShowEditProfileModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line-strong text-xs font-bold text-muted hover:bg-base hover:text-primary hover:border-primary transition-all cursor-pointer"
          >
            <UserCircle className="w-4 h-4" /> Edit Profile
          </button>
          <span className={`text-[10px] font-extrabold px-3.5 py-1 rounded-full border flex items-center gap-1.5 ${
            platformSettings.isOpen
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700 animate-pulse'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${platformSettings.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            {platformSettings.isOpen ? 'ONLINE & TRADING' : 'SYSTEM DOWN / CLOSED'}
          </span>
        </div>
      </div>

      {/* Global Analytics Info Widgets */}
      {!isAnalyticsLoading && metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-scale-up">
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Gross Platform Sales</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{formatCurrency(metrics.totalSales)}</span>
              <span className="p-1 bg-green-50 text-green-600 rounded-md text-[9px] font-bold">
                100% Volume
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Platform Net Commission</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-primary">{formatCurrency(metrics.platformRevenue)}</span>
              <span className="p-1 bg-violet-50 text-primary rounded-md text-[9px] font-bold">
                {platformSettings.commissionPercent}% Fee
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Operational Orders</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{metrics.ordersCount} Total</span>
              <span className="text-[10px] font-bold text-emerald-600">
                {metrics.completedOrders} Delivered
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Partner Ecosystem</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{(metrics.restaurantCount || 0) + (metrics.driverCount || 0)} Accounts</span>
              <span className="text-[10px] font-bold text-muted">
                {metrics.userCount} Foodies
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab System Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

        {/* Left Side: Navigation Tabs Menu */}
        <div className="lg:col-span-1 bg-surface border border-line shadow-2xs p-2 rounded-3xl flex flex-col gap-1">
          {[
            { id: 'analytics', label: 'Ecosystem Analytics', icon: DollarSign },
            { id: 'earnings_settlements', label: 'Earnings & Settlements', icon: Sparkles },
            { id: 'suppliers_items', label: 'Suppliers & Items', icon: Boxes },
            { id: 'home_design', label: 'Home Design', icon: Sparkles },
            { id: 'categories', label: 'Categories & Hours', icon: Layers, badge: categoriesList.length },
            { id: 'kyc', label: 'KYC Document Approvals', icon: ShieldCheck, badge: pendingKyc.length },
            { id: 'users', label: 'User Directory Manager', icon: Users, badge: allUsers.length },
            { id: 'orders', label: 'All Orders History', icon: ShoppingBag, badge: allOrders.length, rejectionBadge: pendingRejectionOrdersCount },
            { id: 'rider_rejections', label: 'Rider Rejections', icon: XCircle, badge: pendingRejectionsCount },
            { id: 'withdrawals', label: 'Wallet Cashouts', icon: CheckCircle, badge: withdrawals.filter(w => w.status === 'Pending').length },
            { id: 'complaints', label: 'Complaints Resolution', icon: MessageSquare, badge: complaints.filter(c => c.status === 'Open').length },
            { id: 'coupons', label: 'Platform Coupons', icon: Tag, badge: coupons.length },
            { id: 'banners', label: 'Promo Banners (Legacy)', icon: ImagePlus, badge: banners.length },
            { id: 'settings', label: 'Operational Parameters', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id || (tab.id === 'home_design' && ['home_design', 'home_hero_banners', 'home_background', 'category_cards'].includes(activeSubTab));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left font-bold text-xs transition-all cursor-pointer ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:bg-base hover:text-main'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {tab.id === 'orders' && tab.rejectionBadge > 0 && (
                    <span className="text-[9px] px-1.8 py-0.5 rounded-full font-black bg-red-500 text-white animate-pulse">
                      ⚠ {tab.rejectionBadge}
                    </span>
                  )}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`text-[9px] px-1.8 py-0.5 rounded-full font-black ${
                      active ? 'bg-surface text-primary' : 'bg-primary text-white animate-pulse'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Contents Body */}
        <div className="lg:col-span-3">

          {/* RIDER REJECTIONS TAB */}
          {activeSubTab === 'rider_rejections' && (
            <RiderRejectionsTab token={token} onViewOrder={setSelectedDetailsOrder} />
          )}

          {/* EARNINGS & SETTLEMENTS TAB */}
          {activeSubTab === 'earnings_settlements' && (
            <EarningsAndSettlementsTab token={token} />
          )}

          {/* SUPPLIERS & ITEMS TAB */}
          {activeSubTab === 'suppliers_items' && (
            <SuppliersAndItemsTab token={token} />
          )}

          {/* UNIFIED HOME DESIGN DASHBOARD TAB */}
          {activeSubTab === 'home_design' && (
            <HomeDesignDashboard
              token={token}
              categoryDesigns={adminCategoryDesigns}
              isCategoryDesignsLoading={isAdminCategoryDesignsLoading}
              onRefreshCategoryDesigns={fetchCategoryDesigns}
              initialSubTab="overview"
              onOpenHeroDesigner={(heroId) => {
                setSelectedHeroBannerId(heroId);
                setActiveSubTab('home_hero_banner_designer');
              }}
              onOpenCategoryDesigner={(catKey) => {
                setSelectedDesignCategory(catKey);
                setActiveSubTab('category_designer');
              }}
            />
          )}

          {/* HOME HERO BANNERS TAB (Backwards Compatibility Route Target) */}
          {activeSubTab === 'home_hero_banners' && (
            <HomeDesignDashboard
              token={token}
              categoryDesigns={adminCategoryDesigns}
              isCategoryDesignsLoading={isAdminCategoryDesignsLoading}
              onRefreshCategoryDesigns={fetchCategoryDesigns}
              initialSubTab="hero_banners"
              onOpenHeroDesigner={(heroId) => {
                setSelectedHeroBannerId(heroId);
                setActiveSubTab('home_hero_banner_designer');
              }}
              onOpenCategoryDesigner={(catKey) => {
                setSelectedDesignCategory(catKey);
                setActiveSubTab('category_designer');
              }}
            />
          )}

          {/* HOME HERO BANNER DESIGNER STUDIO TAB */}
          {activeSubTab === 'home_hero_banner_designer' && selectedHeroBannerId && (
            <HomeHeroBannerDesigner
              bannerId={selectedHeroBannerId}
              token={token}
              onBackToList={() => setActiveSubTab('home_design')}
              onSwitchBanner={(heroId) => setSelectedHeroBannerId(heroId)}
            />
          )}

          {/* HOME BACKGROUND MANAGEMENT TAB (Backwards Compatibility Route Target) */}
          {activeSubTab === 'home_background' && (
            <HomeDesignDashboard
              token={token}
              categoryDesigns={adminCategoryDesigns}
              isCategoryDesignsLoading={isAdminCategoryDesignsLoading}
              onRefreshCategoryDesigns={fetchCategoryDesigns}
              initialSubTab="home_background"
            />
          )}

          {/* HOME CATEGORY CARDS LIST TAB (Backwards Compatibility Route Target) */}
          {activeSubTab === 'category_cards' && (
            <HomeDesignDashboard
              token={token}
              categoryDesigns={adminCategoryDesigns}
              isCategoryDesignsLoading={isAdminCategoryDesignsLoading}
              onRefreshCategoryDesigns={fetchCategoryDesigns}
              initialSubTab="category_cards"
              onOpenCategoryDesigner={(catKey) => {
                setSelectedDesignCategory(catKey);
                setActiveSubTab('category_designer');
              }}
            />
          )}

          {/* HOME CATEGORY DESIGNER TAB */}
          {activeSubTab === 'category_designer' && (
            <CategoryDesigner
              categoryKey={selectedDesignCategory}
              token={token}
              initialDesigns={adminCategoryDesigns}
              onBackToList={() => setActiveSubTab('category_cards')}
              onDesignUpdated={(catKey, updatedDoc) => {
                setAdminCategoryDesigns((prev) => ({
                  ...prev,
                  [catKey]: updatedDoc
                }));
              }}
            />
          )}

          {/* ECOSYSTEM ANALYTICS TAB */}
          {activeSubTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Ecosystem Analytics</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customers summary */}
                <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs text-muted font-bold uppercase">Customer Base</h4>
                    <span className="text-lg font-black text-main">{metrics?.userCount || 0} Registered</span>
                  </div>
                </div>

                {/* Restaurants summary */}
                <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-violet-50 text-primary rounded-2xl">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs text-muted font-bold uppercase">Active Restaurants</h4>
                    <span className="text-lg font-black text-main">{metrics?.restaurantCount || 0} Stores</span>
                  </div>
                </div>

                {/* Riders summary */}
                <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs text-muted font-bold uppercase">Active Riders</h4>
                    <span className="text-lg font-black text-main">{metrics?.driverCount || 0} Partners</span>
                  </div>
                </div>
              </div>

              {/* Global Dispatch Availability Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base/50 p-4.5 rounded-3xl border border-line/70">
                {/* Food Delivery Dispatch */}
                <div className="flex items-center justify-between bg-surface px-5 py-3 rounded-2xl border border-line shadow-3xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🍔</span>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-muted">Food Delivery Dispatch</h4>
                      <p className="text-xs font-bold text-main">Customer Availability Status</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${
                    adminFoodAvailable
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                  }`}>
                    {adminFoodAvailable ? '🟢 Active (Riders Online)' : '🔴 Offline (No available riders)'}
                  </span>
                </div>

                {/* Ride Dispatch */}
                <div className="flex items-center justify-between bg-surface px-5 py-3 rounded-2xl border border-line shadow-3xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🏍️</span>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-muted">Ride Dispatch</h4>
                      <p className="text-xs font-bold text-main">Customer Availability Status</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${
                    adminRideAvailable
                      ? 'bg-yellow-50 border-yellow-250 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                  }`}>
                    {adminRideAvailable ? '🟢 Active (Motorized Riders)' : '🔴 Offline (No motorized riders)'}
                  </span>
                </div>
              </div>

              {/* Graphical Layout & Metrics Explanation */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
                <h4 className="font-display font-extrabold text-sm text-main">Revenue Distribution Model</h4>
                {(() => {
                  const effectiveRate = platformSettings?.restaurantCommissionEnabled !== false
                    ? Number(platformSettings?.restaurantCommissionPercentage ?? platformSettings?.commissionPercent ?? 15)
                    : 0;
                  const restSplitPct = Math.max(0, 100 - effectiveRate);
                  return (
                    <div className="flex flex-col gap-3.5 mt-2">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-muted mb-1">
                          <span>Restaurants Payout ({Number(restSplitPct).toFixed(0)}%)</span>
                          <span>{formatCurrency((Number(metrics?.totalSales) || 0) * (restSplitPct / 100))}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${restSplitPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-muted mb-1">
                          <span>Platform Commission Earned ({Number(effectiveRate).toFixed(0)}%)</span>
                          <span>{formatCurrency((Number(metrics?.totalSales) || 0) * (effectiveRate / 100))}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${effectiveRate}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-violet-50/20 border border-violet-100 p-4 rounded-2xl text-xs font-semibold text-muted mt-2 leading-relaxed">
                  <span className="text-primary font-bold">Billing Architecture: </span>
                  Restaurant commission is calculated according to the configured platform commission rate. Set the rate to 0% when no restaurant commission applies.
                </div>
              </div>

              {/* Restaurant-wise financial settlements */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-3">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-display font-extrabold text-sm text-main">Restaurant Payments Breakdown</h4>
                    <p className="text-[10px] text-muted font-semibold font-bold">Separate payment methods (UPI, Card, COD) and net payout totals for all registered restaurant kitchens.</p>
                  </div>

                  {/* Date range picker selector */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setAnalyticsShowDatePicker(prev => !prev)}
                      className="bg-surface border border-line-strong px-4 py-2.5 rounded-xl text-xs font-bold text-muted hover:bg-base flex items-center gap-2 cursor-pointer shadow-3xs"
                    >
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{getAnalyticsDateLabel()}</span>
                    </button>

                    {analyticsShowDatePicker && (
                      <div className="absolute right-0 mt-2 z-50 bg-surface border border-gray-155 rounded-3xl shadow-xl p-5 flex flex-col gap-4 w-[290px] sm:w-[480px]">
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">Select Date Range</span>
                          <button onClick={() => setAnalyticsShowDatePicker(false)} className="text-muted hover:text-muted cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                          {/* Preset Toggles */}
                          <div className="flex flex-col gap-1.5">
                            {[
                              { type: 'all', label: 'All Time' },
                              { type: 'today', label: 'Today' },
                              { type: 'yesterday', label: 'Yesterday' },
                              { type: '7days', label: 'Last 7 Days' },
                              { type: '30days', label: 'Last 30 Days' },
                              { type: 'custom', label: 'Custom Date Range' }
                            ].map(opt => (
                              <label key={opt.type} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-base cursor-pointer text-xs font-bold text-muted">
                                <input
                                  type="radio"
                                  name="analyticsDateFilter"
                                  checked={analyticsDateFilterType === opt.type}
                                  onChange={() => setAnalyticsDateFilterType(opt.type)}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Calendar & Custom dates */}
                          <div className="flex flex-col gap-3">
                            {renderCalendar((dateStr) => {
                              setAnalyticsDateFilterType('custom');
                              setAnalyticsCustomStartDate(dateStr);
                              setAnalyticsCustomEndDate(dateStr);
                              setAnalyticsAppliedDateFilter({ type: 'custom', start: dateStr, end: dateStr });
                              setAnalyticsShowDatePicker(false);
                            })}

                            {analyticsDateFilterType === 'custom' && (
                              <div className="flex gap-2">
                                <div className="flex flex-col gap-0.5 flex-grow">
                                  <span className="text-[9px] uppercase font-extrabold text-muted pl-1">From</span>
                                  <input
                                    type="date"
                                    value={analyticsCustomStartDate}
                                    onChange={(e) => setAnalyticsCustomStartDate(e.target.value)}
                                    className="bg-base border border-gray-250 rounded-xl px-2 py-1 text-xs text-main font-bold outline-none"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5 flex-grow">
                                  <span className="text-[9px] uppercase font-extrabold text-muted pl-1">To</span>
                                  <input
                                    type="date"
                                    value={analyticsCustomEndDate}
                                    onChange={(e) => setAnalyticsCustomEndDate(e.target.value)}
                                    className="bg-base border border-gray-250 rounded-xl px-2 py-1 text-xs text-main font-bold outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-line pt-3 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAnalyticsDateFilterType(analyticsAppliedDateFilter.type);
                              setAnalyticsCustomStartDate(analyticsAppliedDateFilter.start);
                              setAnalyticsCustomEndDate(analyticsAppliedDateFilter.end);
                              setAnalyticsShowDatePicker(false);
                            }}
                            className="px-4 py-2 border border-gray-250 text-muted rounded-xl text-xs font-bold hover:bg-base cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnalyticsAppliedDateFilter({
                                type: analyticsDateFilterType,
                                start: analyticsCustomStartDate,
                                end: analyticsCustomEndDate
                              });
                              setAnalyticsShowDatePicker(false);
                            }}
                            className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-xs cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-line text-muted font-extrabold uppercase text-[9px] tracking-wider">
                        <th className="py-3 px-2">Restaurant</th>
                        <th className="py-3 px-2">UPI (Net)</th>
                        <th className="py-3 px-2">Card (Net)</th>
                        <th className="py-3 px-2">COD (Net)</th>
                        <th className="py-3 px-2 text-right">Total Net Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-650 font-bold">
                      {restaurantsList.length > 0 ? (
                        restaurantsList.map((rest) => {
                          const earnings = getRestaurantIncomeBreakdown(rest._id);
                          return (
                            <tr key={rest._id} className="hover:bg-base/50 transition-colors">
                              <td className="py-3.5 px-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">🏪</span>
                                  <div>
                                    <p className="font-bold text-main line-clamp-1">{rest.name}</p>
                                    <span className="text-[9px] text-muted font-semibold">{rest.address}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-2">{formatCurrency(earnings.upi)}</td>
                              <td className="py-3.5 px-2">{formatCurrency(earnings.card)}</td>
                              <td className="py-3.5 px-2">{formatCurrency(earnings.cod)}</td>
                              <td className="py-3.5 px-2 text-right text-primary font-black">{formatCurrency(earnings.total)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-muted italic font-semibold">
                            No restaurants found in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* KYC DOCUMENT APPROVALS TAB */}
          {activeSubTab === 'kyc' && (
            <div className="flex flex-col gap-4 animate-scale-up">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">KYC Validation Center</h3>

              {isKycLoading ? (
                <div className="h-48 bg-surface border border-line rounded-3xl animate-pulse" />
              ) : pendingKyc.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {pendingKyc.map(user => {
                    const isDriver = user.role === 'delivery';
                    const drivingLicenceNumber =
                      user.kycDetails?.documentNumber ||
                      user.drivingLicense ||
                      user.drivingLicence ||
                      user.licenseNumber ||
                      user.licenceNumber ||
                      user.deliveryDetails?.licenseNumber ||
                      user.deliveryDetails?.drivingLicense ||
                      null;

                    const licenceDoc =
                      user.kycDetails?.documentImage ||
                      user.kycDetails?.documentUrl ||
                      (isDriver ? user.profileImage : (user.restaurantImage || user.restaurant?.image)) ||
                      null;

                    return (
                      <div key={user._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-4 justify-between">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-line">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl text-xs font-bold ${
                              user.role === 'restaurant' ? 'bg-violet-50 text-primary dark:bg-violet-950/40 dark:text-violet-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {user.role === 'restaurant' ? 'Restaurant Owner' : 'Delivery Driver'}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-main">{user.name}</h4>
                              <span className="text-[10px] font-bold text-muted uppercase">
                                {isDriver ? 'Driver KYC Verification' : 'Restaurant KYC Verification'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                              Pending Verification
                            </span>
                            <span className="text-xs text-muted font-mono">Registered on {formatAppDateOnly(user.createdAt)}</span>
                          </div>
                        </div>

                        {isDriver ? (
                          /* DRIVER KYC DETAILS */
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Rider Name</span>
                              <span className="font-bold text-main truncate">{user.name}</span>
                            </div>

                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Phone Number</span>
                              <span className="font-bold text-main">{user.phone || 'Not Provided'}</span>
                            </div>

                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Vehicle Type</span>
                              <span className="font-bold text-main">{user.deliveryDetails?.vehicleType || 'Motorcycle'}</span>
                            </div>

                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Vehicle Number</span>
                              <span className="font-bold text-main uppercase font-mono">{user.deliveryDetails?.vehicleNumber || 'Not Provided'}</span>
                            </div>

                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-primary/20 bg-primary/5">
                              <span className="text-[9px] uppercase font-extrabold text-primary">Driving Licence Number</span>
                              <span className="font-extrabold text-primary uppercase font-mono text-xs truncate">
                                {drivingLicenceNumber || 'Not Provided'}
                              </span>
                            </div>

                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Licence Document</span>
                              {licenceDoc ? (
                                <a
                                  href={getImageUrl(licenceDoc, 'default')}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-bold text-xs mt-0.5 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Document</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              ) : (
                                <span className="font-semibold text-muted text-xs">Not Provided</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* RESTAURANT KYC DETAILS */
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Restaurant / Owner</span>
                              <span className="font-bold text-main truncate">{user.restaurant?.name || user.name}</span>
                            </div>
                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Email Address</span>
                              <span className="font-bold text-main truncate">{user.email}</span>
                            </div>
                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-extrabold text-muted">Mobile Phone</span>
                              <span className="font-bold text-main">{user.phone || 'Not Provided'}</span>
                            </div>
                            <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-primary/20 bg-primary/5">
                              <span className="text-[9px] uppercase font-extrabold text-primary">
                                {user.kycDetails?.documentType || 'Tax / GSTIN ID'}
                              </span>
                              <span className="font-extrabold text-primary uppercase font-mono text-xs truncate">
                                {user.kycDetails?.documentNumber || 'Not Provided'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Remarks block and approval buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center mt-1">
                          <input
                            type="text"
                            placeholder="Provide approval / rejection notes..."
                            value={kycRemarks[user._id] || ''}
                            onChange={(e) => setKycRemarks({ ...kycRemarks, [user._id]: e.target.value })}
                            className="bg-base border border-line-strong rounded-xl px-4 py-2.5 text-xs text-main outline-none flex-grow w-full"
                          />

                          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                            <button
                              onClick={() => handleKycStatus(user._id, 'Approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 flex-grow sm:flex-grow-0 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleKycStatus(user._id, 'Rejected')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-4 py-2.5 rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-1 flex-grow sm:flex-grow-0 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                  <ShieldCheck className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">KYC verification queue is empty</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">New restaurant or delivery partner registrations awaiting credentials validation will render here.</p>
                </div>
              )}
            </div>
          )}

          {/* USER DIRECTORY MANAGER TAB */}
          {activeSubTab === 'users' && (
            <div className="flex flex-col gap-4 animate-scale-up">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-line pb-3 gap-3">
                <h3 className="font-display font-extrabold text-base text-main">User Directory Manager</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* User Type Filters */}
                  <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'All Accounts' },
                    { id: 'customer', label: 'Customers' },
                    { id: 'restaurant', label: 'Restaurants' },
                    { id: 'delivery', label: 'Riders' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setUserRoleFilter(filter.id);
                        setRiderAvailabilityFilter('all');
                      }}
                      className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        userRoleFilter === filter.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface text-muted border-line-strong hover:bg-base'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  </div>
                  {/* Add User Button */}
                  <button
                    onClick={() => { setAddUserError(''); setShowAddUserModal(true); }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-[10px] font-bold rounded-xl shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5"/> Add User
                  </button>
                </div>
              </div>

              {/* Rider specific sub-filters */}
              {userRoleFilter === 'delivery' && (
                <div className="bg-base border border-gray-150 p-3.5 rounded-2xl flex flex-wrap gap-2 items-center -mt-1 animate-fade-in">
                  <span className="text-[10px] text-muted font-extrabold uppercase mr-1.5">Dispatch Capabilities:</span>
                  {[
                    { id: 'all', label: 'All Registered Riders' },
                    { id: 'food', label: '🍔 Available for Food Delivery' },
                    { id: 'ride', label: '🏍️ Available for Rides' }
                  ].map(subFilter => (
                    <button
                      key={subFilter.id}
                      onClick={() => setRiderAvailabilityFilter(subFilter.id)}
                      className={`text-[9px] font-extrabold px-3 py-1.8 rounded-lg border transition-all cursor-pointer ${
                        riderAvailabilityFilter === subFilter.id
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-3xs'
                          : 'bg-surface text-muted border-gray-250 hover:bg-base'
                      }`}
                    >
                      {subFilter.label}
                    </button>
                  ))}
                </div>
              )}

              {isUsersLoading ? (
                <div className="h-48 bg-surface border border-line rounded-3xl animate-pulse" />
              ) : filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers.map(u => {
                    const isRider = u.role === 'delivery';
                    const isOnline = u.deliveryDetails?.isAvailable === true;
                    const isFoodActive = isOnline && u.deliveryDetails?.activeFoodDelivery !== false;
                    const isRideActive = isOnline && u.deliveryDetails?.activeRide !== false;
                    const vehicleType = u.deliveryDetails?.vehicleType || 'Bicycle';

                    return (
                      <div
                        key={u._id}
                        className={`bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-4 relative group hover:shadow-xs transition-all duration-300 ${
                          isRider ? 'md:col-span-2' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1 pr-12">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-extrabold px-1.8 py-0.5 rounded uppercase ${
                                u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' :
                                u.role === 'restaurant' ? 'bg-violet-50 text-primary border border-violet-100' :
                                u.role === 'delivery' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-gray-100 text-muted border border-line-strong'
                              }`}>
                                {u.role}
                              </span>
                              <h4 className="text-xs font-bold text-main line-clamp-1">{u.name}</h4>
                              {isRider && (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  u.kycStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                  u.kycStatus === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' :
                                  'bg-base text-muted border-line'
                                }`}>
                                  KYC: {u.kycStatus || 'Not Submitted'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted font-semibold">{u.email}</span>
                            <span className="text-[9px] text-muted font-mono mt-0.5">{u.phone}</span>
                            {isRider && (
                              <div className="flex items-center gap-3 text-[10px] text-muted font-medium mt-1 flex-wrap">
                                <span>Vehicle: <strong className="text-main uppercase font-mono">{u.deliveryDetails?.vehicleNumber || 'N/A'}</strong></span>
                                <span>DL: <strong className="text-primary uppercase font-mono">{u.kycDetails?.documentNumber || u.drivingLicense || u.licenseNumber || 'N/A'}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Block / Edit / Delete Controls */}
                          {u.role !== 'admin' && (
                            <div className="flex items-center gap-1.5">
                              {u.role === 'restaurant' && (
                                <button
                                  onClick={() => handleOpenRestaurantHoursModal(u)}
                                  className="p-2 rounded-xl border border-line-strong bg-base text-muted hover:text-primary hover:bg-violet-50 hover:border-violet-200 flex items-center justify-center transition-all cursor-pointer"
                                  title="Edit Restaurant Opening Hours"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => { setEditUserForm({ _id: u._id, name: u.name, email: u.email, phone: u.phone || '' }); setEditUserError(''); setShowEditUserModal(true); }}
                                className="p-2 rounded-xl border border-line-strong bg-base text-muted hover:text-primary hover:bg-violet-50 hover:border-violet-200 flex items-center justify-center transition-all cursor-pointer"
                                title="Edit Account"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleBlockUser(u._id)}
                                disabled={blockingUserId === u._id || deletingUserId === u._id}
                                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                  u.isBlocked
                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                    : 'bg-base text-muted border-line-strong hover:text-red-500 hover:border-red-200'
                                }`}
                                title={u.isBlocked ? "Unblock Account" : "Block Account"}
                              >
                                {u.isBlocked ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={blockingUserId === u._id || deletingUserId === u._id}
                                className="p-2 rounded-xl border border-line-strong bg-base text-muted hover:text-red-600 hover:bg-red-50 hover:border-red-250 flex items-center justify-center transition-all cursor-pointer"
                                title="Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Extra Rider operational status controls */}
                        {isRider && (
                          <div className="border-t border-line pt-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
                            <div className="flex flex-wrap gap-3">
                              {/* Duty Status Switch */}
                              <div className="flex items-center gap-1.5 bg-base border border-gray-150 px-2.5 py-1.2 rounded-xl">
                                <span className="text-[9px] text-muted font-extrabold uppercase">Duty</span>
                                <button
                                  onClick={() => handleUpdateRiderDetails(u._id, { isAvailable: !isOnline })}
                                  className={`text-[9px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isOnline
                                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-3xs'
                                      : 'bg-surface border-gray-250 text-muted hover:bg-base'
                                  }`}
                                >
                                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                                </button>
                              </div>

                              {/* Vehicle Type Select */}
                              <div className="flex items-center gap-1.5 bg-base border border-gray-150 px-2.5 py-1.2 rounded-xl">
                                <span className="text-[9px] text-muted font-extrabold uppercase">Vehicle</span>
                                <select
                                  value={vehicleType}
                                  onChange={(e) => handleUpdateRiderDetails(u._id, { vehicleType: e.target.value })}
                                  className="bg-transparent outline-none border-none text-[9px] font-black text-main cursor-pointer pr-1"
                                >
                                  <option value="Motorcycle">Motorcycle</option>
                                  <option value="Scooty">Scooty</option>
                                </select>
                              </div>
                            </div>

                            {/* Rider Capabilities Badges */}
                            <div className="flex items-center gap-1.5">
                              {/* Food Delivery badge */}
                              <button
                                onClick={() => handleUpdateRiderDetails(u._id, { activeFoodDelivery: !(u.deliveryDetails?.activeFoodDelivery !== false) })}
                                className={`text-[8px] font-extrabold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                  isFoodActive
                                    ? 'bg-green-50 border-green-200 text-green-700 font-black hover:bg-green-100 shadow-3xs'
                                    : 'bg-base border-line-strong text-muted font-bold hover:bg-surface'
                                }`}
                              >
                                <span>🍔 Food:</span>
                                <span>{isFoodActive ? 'Available' : 'Offline'}</span>
                              </button>

                              {/* Rides badge */}
                              <button
                                onClick={() => handleUpdateRiderDetails(u._id, { activeRide: !(u.deliveryDetails?.activeRide !== false) })}
                                className={`text-[8px] font-extrabold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                  isRideActive
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-850 font-black hover:bg-yellow-100 shadow-3xs'
                                    : 'bg-base border-line-strong text-muted font-bold hover:bg-surface'
                                }`}
                              >
                                <span>🏍️ Rides:</span>
                                <span>{isRideActive ? 'Available' : 'Offline'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {u.role === 'restaurant' && (
                          <div className="border-t border-line pt-3.5 flex flex-col gap-2">
                            <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider">Restaurant Earnings Breakdown</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-main bg-base p-3 rounded-2xl border border-line/30">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted font-extrabold">UPI</span>
                                <span className="text-main">{formatCurrency(getRestaurantIncomeBreakdown(u.restaurantId).upi)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted font-extrabold">Card</span>
                                <span className="text-main">{formatCurrency(getRestaurantIncomeBreakdown(u.restaurantId).card)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted font-extrabold">COD</span>
                                <span className="text-main">{formatCurrency(getRestaurantIncomeBreakdown(u.restaurantId).cod)}</span>
                              </div>
                              <div className="flex flex-col border-l border-line-strong/60 pl-2 text-primary">
                                <span className="text-[9px] uppercase font-extrabold">Total Added</span>
                                <span className="font-extrabold">{formatCurrency(getRestaurantIncomeBreakdown(u.restaurantId).total)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center border border-line flex flex-col items-center justify-center gap-2">
                  <Users className="w-12 h-12 text-gray-300" />
                  <h4 className="text-xs font-bold text-main">No users found</h4>
                  <p className="text-[10px] text-muted">No registered credentials matched this role filter.</p>
                </div>
              )}
            </div>
          )}

          {/* ALL ORDERS HISTORY TAB */}
          {activeSubTab === 'orders' && (
            <div className="flex flex-col gap-4 animate-scale-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-2">
                <h3 className="font-display font-extrabold text-base text-main">All Platform Orders History</h3>
              </div>

              {/* Global History Filter Toolbar */}
              <HistoryFilterToolbar
                dateLabel={historyFilter.dateLabel}
                isFiltered={historyFilter.isFiltered}
                onOpenCalendar={() => setShowOrderCalendarModal(true)}
                onReset={historyFilter.resetFilters}
                onClearHistory={() => setShowClearAllOrdersModal(true)}
                clearHistoryLabel="Clear All Order History"
                availableYears={historyFilter.availableYears}
                selectedYear={historyFilter.dateFilter.type === 'year' ? historyFilter.dateFilter.year : null}
                onSelectYear={(yr) => (yr ? historyFilter.selectYear(yr) : historyFilter.resetFilters())}
                typeFilter={historyFilter.typeFilter}
                typeOptions={[
                  { id: 'all', label: 'All Orders & Rides' },
                  { id: 'food', label: 'Food Deliveries' },
                  { id: 'ride', label: 'Bike Rides' },
                ]}
                onTypeChange={historyFilter.setTypeFilter}
                totalCount={allOrders.length}
                filteredCount={historyFilter.filteredItems.length}
              />

              {/* Order pipeline sub-tabs */}
              <div className="flex gap-2 border-b border-line pb-3 overflow-x-auto no-scrollbar scroll-smooth">
                {[
                  { id: 'new', label: 'New Orders', count: newOrdersCount, color: 'bg-violet-500' },
                  { id: 'ongoing', label: 'Ongoing Orders', count: ongoingOrdersCount, color: 'bg-primary' },
                  { id: 'completed', label: 'Completed Orders', count: completedOrdersCount, color: 'bg-green-600' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderPipelineTab(tab.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border flex-shrink-0 whitespace-nowrap ${
                      orderPipelineTab === tab.id
                        ? 'bg-surface border-primary text-primary shadow-xs'
                        : 'bg-base border-line text-muted hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[9px] text-white px-2 py-0.5 rounded-full font-black ${tab.color}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Rider Assignment Filter Toolbar */}
              <div className="flex items-center gap-2 flex-wrap text-xs pb-1">
                <span className="text-[10px] uppercase font-extrabold text-muted">Rider Assignment:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'waiting', label: 'Waiting for Rider' },
                  { id: 'rejected', label: 'Rider Rejected / Action Required', badge: pendingRejectionOrdersCount, alert: true }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setRiderAssignmentFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      riderAssignmentFilter === f.id
                        ? f.alert
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-primary text-white border-primary shadow-xs'
                        : f.alert && f.badge > 0
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-black'
                        : 'bg-base border-line text-muted hover:bg-surface hover:text-main'
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.badge !== undefined && f.badge > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                        riderAssignmentFilter === f.id ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                      }`}>
                        {f.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {isOrdersLoading ? (
                <div className="h-48 bg-surface border border-line rounded-3xl animate-pulse" />
              ) : (
                <div className="flex flex-col gap-8">
                  {/* RIDER ASSIGNMENT REQUIRED SECTION */}
                  {allOrders.filter(o => o.orderType !== 'ride' && o.status === 'Ready_for_Pickup' && !o.deliveryAgent?.phone).length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
                          <div>
                            <h4 className="font-display font-black text-sm text-red-700">RIDER ASSIGNMENT REQUIRED</h4>
                            <p className="text-[10px] font-bold text-red-600/80">These orders are ready for pickup but no rider has accepted them yet.</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allOrders.filter(o => o.orderType !== 'ride' && o.status === 'Ready_for_Pickup' && !o.deliveryAgent?.phone).map(order => (
                          <div key={`assign-${order._id}`} className="bg-surface border-2 border-red-100 p-5 rounded-3xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start pb-2 border-b border-red-100/50">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-red-600 uppercase">#{String(order._id || '').slice(-8)}</span>
                                <span className="text-[10px] font-bold text-muted ml-2">Total: {formatCurrency(order.total)}</span>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase border bg-red-50 border-red-200 text-red-700">Ready for Pickup</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-muted">
                              <div className="flex flex-col gap-0.5">
                                <span className="uppercase font-extrabold text-red-400">Restaurant</span>
                                <span className="text-main">{order.restaurant?.name || 'Unknown'}</span>
                                <span className="truncate">{order.restaurant?.address || ''}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="uppercase font-extrabold text-red-400">Customer</span>
                                <span className="text-main">{order.customerName}</span>
                                <span>{order.customerPhone || order.customerEmail}</span>
                              </div>
                            </div>

                            {/* Items details */}
                            {Array.isArray(order.items) && order.items.length > 0 && (
                              <div className="flex flex-col gap-1 py-1 px-1 bg-base/50 rounded-lg">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-[10px] font-bold text-main pl-1">
                                    <span>x{item.quantity} {item.name}</span>
                                    <span className="text-muted font-medium">{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1))}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 flex gap-2">
                              <select
                                value={selectedRiders[order._id] || ''}
                                onChange={(e) => setSelectedRiders(prev => ({...prev, [order._id]: e.target.value}))}
                                className="flex-1 bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-400"
                              >
                                <option value="">Select Rider to Assign</option>
                                {availableFoodRiders.map(rider => (
                                  <option key={rider._id} value={rider._id}>{rider.name} ({rider.phone})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => selectedRiders[order._id] && handleAssignRider(order._id, selectedRiders[order._id])}
                                disabled={!selectedRiders[order._id]}
                                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 hover:bg-red-700"
                              >
                                ASSIGN RIDER
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RIDE ASSIGNMENT SECTION */}
                  {allOrders.filter(o => o.orderType === 'ride' && o.status === 'Placed' && !o.deliveryAgent?.phone).length > 0 && (
                    <div className="flex flex-col gap-4 mt-2">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-6 h-6 text-yellow-600 animate-pulse" />
                          <div>
                            <h4 className="font-display font-black text-sm text-yellow-700">RIDE ASSIGNMENT REQUIRED</h4>
                            <p className="text-[10px] font-bold text-yellow-600/80">These ride orders are waiting for a captain to be assigned.</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allOrders.filter(o => o.orderType === 'ride' && o.status === 'Placed' && !o.deliveryAgent?.phone).map(order => (
                          <div key={`assign-ride-${order._id}`} className="bg-surface border-2 border-yellow-100 p-5 rounded-3xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start pb-2 border-b border-yellow-100/50">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-yellow-600 uppercase">#{String(order._id || '').slice(-8)}</span>
                                <span className="text-[10px] font-bold text-muted ml-2">Total: {formatCurrency(order.total ?? order.fare)}</span>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase border bg-yellow-50 border-yellow-200 text-yellow-700">Needs Captain</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-[10px] font-semibold text-muted">
                              <div className="flex flex-col gap-0.5">
                                <span className="uppercase font-extrabold text-yellow-500">Customer Details</span>
                                <span className="text-main">{order.customerName}</span>
                                <span>{order.customerPhone || order.customerEmail}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 mt-1">
                                <span className="uppercase font-extrabold text-yellow-500">Route</span>
                                <span className="text-main truncate">
                                  From: {order.pickupLocation?.formattedAddress || order.pickupAddress?.street || order.customerLocation?.formattedAddress || 'Pickup'}
                                </span>
                                <span className="text-main truncate">
                                  To: {order.dropLocation?.formattedAddress || order.address?.street || order.restaurantLocation?.formattedAddress || 'Destination'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                              <select
                                value={selectedCaptains[order._id] || ''}
                                onChange={(e) => setSelectedCaptains(prev => ({...prev, [order._id]: e.target.value}))}
                                className="flex-1 bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-yellow-400"
                              >
                                <option value="">Select Captain</option>
                                {availableRideCaptains.map(captain => (
                                  <option key={captain._id} value={captain._id}>{captain.name} ({captain.phone})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => selectedCaptains[order._id] && handleAssignCaptain(order._id, selectedCaptains[order._id])}
                                disabled={!selectedCaptains[order._id]}
                                className="px-4 py-2 bg-yellow-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 hover:bg-yellow-600"
                              >
                                DISPATCH
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 mt-2 border-t border-line pt-4">
                    <h4 className="font-display font-extrabold text-sm text-main">All Orders Log</h4>
                    {filteredOrders.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {filteredOrders.map(order => (
                          <div key={order._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-3.5 animate-fade-in">
                      {/* Top Header Row */}
                      <div className="flex justify-between items-start sm:items-center pb-3 border-b border-line flex-wrap gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-black px-1.8 py-0.5 rounded uppercase border ${
                            order.orderType === 'ride' ? 'bg-yellow-50 border-yellow-200 text-yellow-850' : 'bg-violet-50 border-violet-100 text-primary'
                          }`}>
                            {order.orderType === 'ride' ? 'Ride' : 'Food'}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-muted">#{String(order._id || '').slice(-8).toUpperCase()}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-muted font-semibold">Placed: {formatAppDate(getOrderPlacedAt(order))}</span>
                          {['Delivered', 'Completed'].includes(order.status) && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="font-bold text-green-700">
                                Delivered: {getOrderDeliveredAt(order) ? formatAppDate(getOrderDeliveredAt(order)) : 'Delivery time unavailable'}
                              </span>
                            </>
                          )}
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          ['Delivered', 'Completed'].includes(order.status) ? 'bg-green-50 border-green-200 text-green-700' :
                          order.status === 'Placed' ? 'bg-violet-50 border-violet-200 text-violet-700 animate-pulse' :
                          'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* PROMINENT RIDER REJECTION BANNER */}
                      {order.hasRiderRejection && (() => {
                        const pendingRej = (order.riderRejections || []).slice().reverse().find(r => r.status === 'Pending_Admin_Review') || (order.riderRejections || []).slice().reverse()[0];
                        if (!pendingRej) return null;
                        const isPending = pendingRej.status === 'Pending_Admin_Review';

                        return (
                          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isPending ? 'bg-red-50/90 border-red-200 text-red-900 shadow-2xs' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}>
                            <div className="flex items-start gap-3">
                              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPending ? 'text-red-600 animate-pulse' : 'text-gray-500'}`} />
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    isPending ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
                                  }`}>
                                    {isPending ? '⚠ Rider Rejected — Admin Action Required' : `Rider Rejection (${pendingRej.status})`}
                                  </span>
                                  <span className="text-[10px] text-muted font-bold">
                                    Rejected: {formatAppDateTime(pendingRej.rejectedAt)}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold mt-0.5">
                                  <span className="font-extrabold text-main">Rejected By:</span> {pendingRej.riderName || 'Rider'}
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="font-extrabold text-main">Reason:</span> <span className="text-red-700 font-bold">{pendingRej.reasonText || pendingRej.reasonCode}</span>
                                  {pendingRej.note && (
                                    <span className="italic text-muted block text-[11px] mt-0.5">Note: "{pendingRej.note}"</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isPending && (
                              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignRiderModal(order)}
                                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>Assign Rider</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Customer, Restaurant, and Delivery Partner Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-muted">
                        <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-line/30">
                          <span className="text-[9px] uppercase font-extrabold text-muted">Customer Details</span>
                          <span className="font-bold text-main">{order.customerName}</span>
                          <span className="text-[10px] text-muted font-medium">{order.customerEmail}</span>
                        </div>
                        {order.orderType !== 'ride' && order.restaurant && (
                          <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-line/30">
                            <span className="text-[9px] uppercase font-extrabold text-muted">Seller Restaurant</span>
                            <span className="font-bold text-main">{order.restaurant.name}</span>
                            <span className="text-[10px] text-gray-450 font-medium">{order.restaurant.address}</span>
                          </div>
                        )}
                        {order.orderType === 'ride' && (
                          <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-line/30">
                            <span className="text-[9px] uppercase font-extrabold text-muted">Route details</span>
                            <span className="font-bold text-main truncate">
                              From: {order.pickupLocation?.formattedAddress || order.pickupAddress?.street || order.customerLocation?.formattedAddress || 'Pickup'}
                            </span>
                            <span className="text-[10px] text-gray-450 font-medium truncate">
                              To: {order.dropLocation?.formattedAddress || order.address?.street || order.restaurantLocation?.formattedAddress || 'Destination'}
                            </span>
                          </div>
                        )}
                        <div className="bg-base p-3 rounded-2xl flex flex-col gap-0.5 border border-line/30">
                          <span className="text-[9px] uppercase font-extrabold text-muted">
                            {order.orderType === 'ride' ? 'Ride Captain' : 'Delivery Partner'}
                          </span>
                          {order.deliveryAgent && order.deliveryAgent.name ? (
                            <>
                              <span className="font-bold text-main">{order.deliveryAgent.name}</span>
                              <span className="text-[10px] text-muted font-medium">{order.deliveryAgent.phone}</span>
                              {order.deliveryAgent.rating != null && (
                                <span className="text-[9px] text-yellow-500 font-bold">★ {formatRating(order.deliveryAgent.rating)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted italic font-medium">Not Assigned Yet</span>
                          )}
                        </div>
                      </div>

                      {/* Map Tracking for Active Rides */}
                      {order.orderType === 'ride' && ['Rider_Assigned', 'Rider_Accepted', 'Rider_At_Pickup', 'Picked_Up', 'Out for Delivery', 'Out_for_Delivery'].includes(order.status) && (
                        <div className="rounded-2xl overflow-hidden border border-line mt-2">
                          <InteractiveMap
                            status={order.status}
                            isRide={true}
                            orderId={order._id}
                            ridePickupLat={order.pickupLocation?.lat ?? order.customerLocation?.lat}
                            ridePickupLng={order.pickupLocation?.lng ?? order.customerLocation?.lng}
                            rideDropLat={order.dropLocation?.lat ?? order.restaurantLocation?.lat}
                            rideDropLng={order.dropLocation?.lng ?? order.restaurantLocation?.lng}
                            riderLat={liveRiderLocations?.[order._id]?.lat}
                            riderLng={liveRiderLocations?.[order._id]?.lng}
                          />
                        </div>
                      )}

                      {/* Items details */}
                      {order.orderType !== 'ride' && Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="flex flex-col gap-1.5 py-1 px-1">
                          <span className="text-[9px] uppercase font-extrabold text-muted tracking-wider">Ordered Menu Items</span>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs font-bold text-main pl-1">
                              <span>x{item.quantity} {item.name}</span>
                              <span className="text-muted font-medium">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Customer Ratings / Feedback details for Admin */}
                      {((order.riderReview && Number(order.riderReview.rating) > 0) || (Array.isArray(order.restaurantReviews) && order.restaurantReviews.length > 0) || (Array.isArray(order.storeReviews) && order.storeReviews.length > 0) || (Number(order.review?.rating) > 0)) && (
                        <div className="flex flex-col gap-2 my-1">
                          {/* Rider Review */}
                          {order.riderReview && Number(order.riderReview.rating) > 0 && (
                            <div className="bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 text-xs flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-black uppercase text-blue-700 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                                    Rider Review
                                  </span>
                                  {order.deliveryAgent?.name && (
                                    <span className="text-[11px] font-bold text-main">
                                      {order.deliveryAgent.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-xs ${star <= order.riderReview.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                  {order.riderReview.tipAmount > 0 && (
                                    <span className="text-[10px] font-bold text-green-600 ml-1">
                                      (Tip: ₹{order.riderReview.tipAmount})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {order.riderReview.comment && (
                                <p className="text-[11px] text-muted italic bg-surface/70 p-2 rounded-lg border border-line/40">
                                  "{order.riderReview.comment}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Restaurant Review(s) */}
                          {(Array.isArray(order.restaurantReviews) && order.restaurantReviews.length > 0 ? order.restaurantReviews : (Number(order.review?.rating) > 0 ? [{ ...order.review, restaurantName: order.restaurant?.name || 'Restaurant' }] : [])).map((rRev, rIdx) => (
                            <div key={rIdx} className="bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-xs flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                                    Restaurant Review
                                  </span>
                                  <span className="text-[11px] font-bold text-main">
                                    {rRev.restaurantName || order.restaurant?.name || 'Restaurant'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-xs ${star <= rRev.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {rRev.comment && (
                                <p className="text-[11px] text-muted italic bg-surface/70 p-2 rounded-lg border border-line/40">
                                  "{rRev.comment}"
                                </p>
                              )}
                            </div>
                          ))}

                          {/* Store / Supplier Review(s) (Grocery, Meat, Veg & Fruits, Bakery) */}
                          {Array.isArray(order.storeReviews) && order.storeReviews.length > 0 && order.storeReviews.map((sRev, sIdx) => {
                            const serviceLabel = sRev.serviceType === 'grocery' ? 'Grocery'
                              : sRev.serviceType === 'meat' ? 'Meat'
                              : sRev.serviceType === 'veg_fruits' ? 'Veg & Fruits'
                              : sRev.serviceType === 'bakery_beverages' ? 'Bakery'
                              : 'Store';

                            return (
                              <div key={sIdx} className="bg-amber-50/30 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3 text-xs flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                      {serviceLabel} Review
                                    </span>
                                    <span className="text-[11px] font-bold text-main">
                                      {sRev.sourceName || 'Store'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span
                                        key={star}
                                        className={`text-xs ${star <= sRev.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {sRev.comment && (
                                  <p className="text-[11px] text-muted italic bg-surface/70 p-2 rounded-lg border border-line/40">
                                    "{sRev.comment}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer Row: Payment & Total price */}
                      <div className="border-t border-line pt-3 flex justify-between items-center text-xs flex-wrap gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-muted font-extrabold uppercase">Payment Details</span>
                          <span className="font-bold text-main">
                            {order.paymentDetails?.method || order.paymentMethod || 'COD'} • <span className={(order.paymentDetails?.status || 'Pending') === 'Paid' ? 'text-green-600' : 'text-violet-500'}>{order.paymentDetails?.status || 'Pending'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-auto flex-wrap">
                          {order.hasRiderRejection && (order.riderRejections || []).some(r => r.status === 'Pending_Admin_Review') && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignRiderModal(order)}
                              className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Assign Rider
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedDetailsOrder(order)}
                            className="px-3.5 py-1.5 bg-base hover:bg-surface text-main font-bold rounded-xl text-[11px] border border-line shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            View Details
                          </button>
                          {!['Delivered', 'Completed', 'Cancelled'].includes(order.status) && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order._id, 'Delivered')}
                              className="px-3.5 py-1.5 bg-green-600 text-white font-bold rounded-xl text-[11px] hover:bg-green-700 shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Mark Completed
                            </button>
                          )}
                          <div className="text-right">
                            <span className="text-[9px] text-muted font-extrabold uppercase">Total Bill</span>
                            <p className="text-base font-black text-gray-805">{formatCurrency(order.total ?? order.fare)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <HistoryEmptyState
                  dateLabel={historyFilter.dateLabel}
                  onReset={historyFilter.resetFilters}
                  message="No orders in this pipeline"
                  description="Orders matching the selected date filters and status pipeline will render here."
                />
              )}
            </div>
          </div>
          )}
        </div>
      )}

          {/* WALLET CASHOUTS TAB */}
          {activeSubTab === 'withdrawals' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Rider Payout Requests</h3>

              {isWithdrawalsLoading ? (
                <div className="h-48 bg-surface border border-line rounded-3xl animate-pulse" />
              ) : withdrawals.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {withdrawals.map(w => (
                    <div key={w._id} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] font-bold text-muted">#{w._id}</span>
                          <span className={`text-[9px] font-bold px-1.8 py-0.5 rounded ${
                            w.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 animate-pulse'
                          }`}>{w.status}</span>
                        </div>
                        <h4 className="font-bold text-main mt-1">Claimant: {w.name}</h4>
                        <p className="text-[9px] text-muted font-semibold mt-0.5">Mobile Phone: {w.phone}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-line pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-sm font-black text-main">₹{w.amount}</span>
                          <p className="text-[9px] text-muted font-semibold">Immediate Cashout</p>
                        </div>

                        {w.status === 'Pending' && (
                          <button
                            onClick={() => handleApproveWithdrawal(w._id)}
                            disabled={approvingWithdrawalId === w._id}
                            className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Approve Payout
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center border border-line flex flex-col items-center justify-center gap-3">
                  <CheckCircle className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">No cashouts pending</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Rider wallet balance withdraw triggers will populate here for platform settlement.</p>
                </div>
              )}
            </div>
          )}

          {/* COMPLAINTS RESOLUTION TAB */}
          {activeSubTab === 'complaints' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Support Tickets Desk</h3>

              {isComplaintsLoading ? (
                <div className="h-48 skeleton rounded-3xl" />
              ) : complaints.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {complaints.map(c => (
                    <div key={c._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-3 justify-between">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted pb-2 border-b border-line">
                        <div className="flex items-center gap-1.5 text-main">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          <span>Category: <strong className="text-main">{c.category}</strong></span>
                        </div>
                        <span className={`px-2 py-0.5 rounded ${
                          c.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-150 text-red-600 animate-pulse'
                        }`}>{c.status}</span>
                      </div>

                      <div className="text-xs leading-relaxed font-semibold text-muted my-1">
                        "{c.message}"
                      </div>

                      <div className="border-t border-line pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <span className="text-[10px] text-muted font-semibold">Submitted by {c.customerName} ({c.email})</span>

                        {c.status === 'Open' && (
                          <button
                            onClick={() => handleResolveComplaint(c._id)}
                            disabled={resolvingComplaintId === c._id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-3 py-1.8 rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center border border-line flex flex-col items-center justify-center gap-3">
                  <MessageSquare className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">Support desk cleared</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">No complaints registered by customers. Perfect platform performance!</p>
                </div>
              )}
            </div>
          )}

          {/* PLATFORM COUPONS TAB */}
          {activeSubTab === 'coupons' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Platform Discounts & Coupons</h3>

              {/* Add Platform Coupon */}
              <form onSubmit={handleCreateCoupon} className="bg-base border border-gray-150 p-4 rounded-3xl flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Promo Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLAT100"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none uppercase font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Flat Discount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 299"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none font-bold"
                  />
                </div>
                <button type="submit" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer shadow-xs">
                  Create Coupon
                </button>
              </form>

              {/* Coupon grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {coupons.map((c) => (
                  <div key={c._id} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex justify-between items-center relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-black">
                        %
                      </div>
                      <div>
                        <h4 className="text-xs font-mono font-black text-main">{c.code}</h4>
                        <p className="text-[10px] text-muted font-semibold mt-0.5">Flat ₹{c.discount} off • Minimum order ₹{c.minAmount}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(c._id)}
                      className="text-muted hover:text-red-500 transition-colors p-1.5 bg-base hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Delete Coupon"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPERATIONAL PARAMETERS TAB */}
          {activeSubTab === 'settings' && (
            <div className="flex flex-col gap-6">
              {/* Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-main">Operational Parameters & Pricing Settings</h3>
                  <p className="text-xs text-muted font-medium mt-0.5">Configure global item limits, section change fees, food pricing, and service parameters</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleSaveSettings(e)}
                  disabled={isSettingsSaving}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSettingsSaving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>

              {/* Main 2-Column Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Left Column: Settings Cards */}
                <form onSubmit={(e) => handleSaveSettings(e)} className="xl:col-span-2 flex flex-col gap-6">

                  {/* 1. GLOBAL ORDER LIMIT */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          GLOBAL ORDER LIMIT
                        </h4>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Maximum total items allowed across all combined sections
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveSettings(e)}
                        disabled={isSettingsSaving}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>

                    <div className="border border-dashed border-primary/30 dark:border-primary/40 bg-purple-50/40 dark:bg-purple-950/20 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          ALL SECTIONS MAX ITEMS / ORDER
                        </label>
                        <div className="relative mt-1.5 flex items-center">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            required
                            value={settingsForm?.allSectionsMaxItems ?? 10}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, allSectionsMaxItems: val === '' ? '' : parseInt(val) || 1 });
                            }}
                            className="bg-surface border border-line-strong rounded-xl px-4 py-3 text-sm text-main font-bold outline-none w-full pr-16 focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                          />
                          <span className="absolute right-3.5 text-xs font-bold text-muted uppercase pointer-events-none">items</span>
                        </div>
                      </div>

                      <div className="bg-purple-100/60 dark:bg-purple-900/30 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-main">Helper Rule</h5>
                          <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                            Maximum total items allowed according to the combined-section rule. This setting is independent from individual section limits.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. SECTION CHANGE PRICING */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                          SECTION CHANGE PRICING
                        </h4>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          When customer changes from one section to another
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveSettings(e)}
                        disabled={isSettingsSaving}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Section Change Fee</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-xs font-bold text-muted pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            required
                            value={settingsForm?.sectionChangeFee ?? 15}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, sectionChangeFee: val === '' ? '' : parseFloat(val) || 0 });
                            }}
                            className="bg-base border border-line-strong rounded-xl pl-8 pr-4 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-muted leading-relaxed bg-base p-3 rounded-xl border border-line">
                        Charged when a customer shifts or adds items across distinct marketplace sections.
                      </div>
                    </div>
                  </div>

                  {/* RESTAURANT COMMISSION CONFIGURATION */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-5">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                          <Percent className="w-5 h-5 text-primary" />
                          RESTAURANT COMMISSION CONFIGURATION
                        </h4>
                        <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                          Configure platform commission charged on eligible restaurant food sales. Set to 0% when no commission applies.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveSettings(e)}
                        disabled={isSettingsSaving}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>

                    {/* Enable / Disable Switch */}
                    <div className="flex items-center justify-between bg-base p-4 rounded-2xl border border-line">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-main">Enable Restaurant Commission</span>
                        <span className="text-[10px] text-muted font-medium">
                          When disabled (OFF), effective commission is 0% and restaurants receive 100% of food sales.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm?.restaurantCommissionEnabled !== false}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            restaurantCommissionEnabled: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Commission Rate Numeric Input & Steppers */}
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                        Commission Percentage (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent ?? 15);
                            const next = Math.max(0, cur - 1);
                            setSettingsForm({
                              ...settingsForm,
                              restaurantCommissionPercentage: next,
                              commissionPercent: next
                            });
                          }}
                          className="w-10 h-10 rounded-xl border border-line-strong bg-base hover:bg-gray-100 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
                        >
                          -
                        </button>

                        <div className="relative flex-1 max-w-xs">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent ?? 15}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = val === '' ? 0 : parseFloat(val);
                              const safeNum = Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
                              setSettingsForm({
                                ...settingsForm,
                                restaurantCommissionPercentage: safeNum,
                                commissionPercent: safeNum
                              });
                            }}
                            className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-sm text-main font-black outline-none w-full pr-10 focus:border-primary text-center"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent ?? 15);
                            const next = Math.min(100, cur + 1);
                            setSettingsForm({
                              ...settingsForm,
                              restaurantCommissionPercentage: next,
                              commissionPercent: next
                            });
                          }}
                          className="w-10 h-10 rounded-xl border border-line-strong bg-base hover:bg-gray-100 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Presets Buttons */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase text-muted mr-1">Quick Presets:</span>
                        {[0, 5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setSettingsForm({
                              ...settingsForm,
                              restaurantCommissionPercentage: pct,
                              commissionPercent: pct
                            })}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              (settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent) === pct
                                ? 'bg-primary text-white border-primary shadow-xs'
                                : 'bg-base text-main border-line hover:border-primary'
                            }`}
                          >
                            {pct}% {pct === 0 ? '(No Commission)' : ''}
                          </button>
                        ))}
                      </div>

                      <p className="text-[11px] text-muted font-medium bg-base/60 p-3 rounded-xl border border-line/60">
                        💡 {settingsForm?.restaurantCommissionEnabled === false ? (
                          <strong className="text-amber-600">Commission Switch is OFF. Effective Commission = 0%. Restaurant gets 100% payout.</strong>
                        ) : (settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent) === 0 ? (
                          <strong className="text-green-600">0% Commission Configured: Restaurant gets 100% of eligible food sales. Jinkzo Commission = ₹0.</strong>
                        ) : (
                          <span>Configured Rate = {settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent}%. Restaurant receives {(100 - (settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent)).toFixed(1)}% of eligible food sales.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 3. FOOD PRICING */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-5">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                          <Utensils className="w-5 h-5 text-primary" />
                          FOOD PRICING
                        </h4>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Base items, extra items, hotel selection cap and food hotel change fee
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveSettings(e)}
                        disabled={isSettingsSaving}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Food Base Item Limit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Food Base Item Limit</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={settingsForm?.foodBaseItemLimit ?? 4}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, foodBaseItemLimit: val === '' ? '' : parseInt(val) || 1 });
                            }}
                            className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full pr-12 focus:border-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">items</span>
                        </div>
                        <span className="text-[9px] text-muted px-1">Number of items included in the normal first-hotel pricing. (Default: 4)</span>
                      </div>

                      {/* Food Extra Item Limit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Food Extra Item Limit</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={settingsForm?.foodExtraItemLimit ?? 3}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, foodExtraItemLimit: val === '' ? '' : parseInt(val) || 0 });
                            }}
                            className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full pr-12 focus:border-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">items</span>
                        </div>
                        <span className="text-[9px] text-muted px-1">Maximum additional food items allowed after the base limit. (Max Food Items = {(settingsForm?.foodBaseItemLimit || 4) + (settingsForm?.foodExtraItemLimit || 3)})</span>
                      </div>

                      {/* Food Extra Item Charge */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Food Extra Item Charge</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={settingsForm?.foodExtraItemCharge ?? 15}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, foodExtraItemCharge: val === '' ? '' : parseFloat(val) || 0 });
                            }}
                            className="bg-base border border-line-strong rounded-xl pl-7 pr-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary"
                          />
                        </div>
                        <span className="text-[9px] text-muted px-1">One additional charge applied when the customer goes beyond the base item limit. (Default: ₹15)</span>
                      </div>

                      {/* Maximum Food Hotel Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Maximum Food Hotel Selection</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={settingsForm?.foodMaxHotels ?? 3}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, foodMaxHotels: val === '' ? '' : parseInt(val) || 1 });
                            }}
                            className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full pr-14 focus:border-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">hotels</span>
                        </div>
                        <span className="text-[9px] text-muted px-1">Maximum number of distinct food hotels allowed in one order. (Default: 3)</span>
                      </div>

                      {/* Food Hotel Change Fee */}
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Food Hotel Change Fee</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={settingsForm?.foodHotelChangeFee ?? 15}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettingsForm({ ...settingsForm, foodHotelChangeFee: val === '' ? '' : parseFloat(val) || 0 });
                            }}
                            className="bg-base border border-line-strong rounded-xl pl-7 pr-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary"
                          />
                        </div>
                        <span className="text-[9px] text-muted px-1">Additional charge for each hotel after the first hotel. (Default: ₹15)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. SECTION SETTINGS (Advanced Service Type Limits) */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                          <SlidersHorizontal className="w-5 h-5 text-primary" />
                          SECTION SETTINGS — Service Type Limits
                        </h4>
                        <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                          Configure independent per-section ordering limits, minimum amounts, maximum weights, and delivery fee adjustments.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveSettings(e)}
                        disabled={isSettingsSaving}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {[
                        { key: 'food',       label: '🍔 Food',               color: 'bg-orange-500', defaults: { maxItemsPerOrder: 20, minOrderAmount: 0,   deliveryFeeMultiplier: 1.0 }, hasWeight: false },
                        { key: 'grocery',    label: '🛒 Grocery',            color: 'bg-blue-500',   defaults: { maxItemsPerOrder: 10, minOrderAmount: 99,  deliveryFeeMultiplier: 1.0 }, hasWeight: false },
                        { key: 'vegetables', label: '🥦 Vegetables & Fruits', color: 'bg-green-500',  defaults: { maxItemsPerOrder: 5,  minOrderAmount: 49,  deliveryFeeMultiplier: 1.0, maxWeightKg: 5 }, hasWeight: true },
                        { key: 'meat',       label: '🥩 Meat',               color: 'bg-red-500',    defaults: { maxItemsPerOrder: 5,  minOrderAmount: 149, deliveryFeeMultiplier: 1.2, maxWeightKg: 5 }, hasWeight: true },
                        { key: 'cool_hot',   label: '🧊 Hot & Cool',         color: 'bg-cyan-500',   defaults: { maxItemsPerOrder: 5,  minOrderAmount: 49,  deliveryFeeMultiplier: 1.1 }, hasWeight: false },
                      ].map(({ key, label, color, defaults, hasWeight }) => {
                        const cur = settingsForm?.serviceTypeLimits?.[key] || { enabled: true, ...defaults };
                        const update = (patch) => {
                          const updatedLimits = {
                            ...settingsForm.serviceTypeLimits,
                            [key]: { ...cur, ...patch }
                          };
                          // Also sync top-level section limits if matching key
                          const topSync = {};
                          if (key === 'grocery' && patch.maxItemsPerOrder !== undefined) topSync.groceryMaxItems = patch.maxItemsPerOrder;
                          if (key === 'vegetables' && patch.maxItemsPerOrder !== undefined) topSync.vegetableFruitMaxItems = patch.maxItemsPerOrder;
                          if (key === 'vegetables' && patch.maxWeightKg !== undefined) topSync.vegetableFruitMaxWeightKg = patch.maxWeightKg;
                          if (key === 'meat' && patch.maxItemsPerOrder !== undefined) topSync.meatMaxItems = patch.maxItemsPerOrder;
                          if (key === 'meat' && patch.maxWeightKg !== undefined) topSync.meatMaxWeightKg = patch.maxWeightKg;
                          if (key === 'cool_hot' && patch.maxItemsPerOrder !== undefined) topSync.hotCoolMaxItems = patch.maxItemsPerOrder;

                          setSettingsForm({
                            ...settingsForm,
                            ...topSync,
                            serviceTypeLimits: updatedLimits
                          });
                        };

                        return (
                          <div key={key} className={`border border-line rounded-2xl overflow-hidden transition-all ${cur.enabled ? 'opacity-100' : 'opacity-50'}`}>
                            {/* Row Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-base border-b border-line">
                              <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                                <span className="text-xs font-extrabold text-main uppercase tracking-wide">{label}</span>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-[10px] font-bold text-muted uppercase">{cur.enabled ? 'Active' : 'Disabled'}</span>
                                <div
                                  onClick={() => update({ enabled: !cur.enabled })}
                                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${cur.enabled ? 'bg-primary' : 'bg-line-strong'}`}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${cur.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                              </label>
                            </div>

                            {/* Row Fields */}
                            <div className={`grid grid-cols-1 ${hasWeight ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 p-4`}>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                                  Max Items / Order
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    disabled={!cur.enabled}
                                    value={cur.maxItemsPerOrder ?? defaults.maxItemsPerOrder}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      update({ maxItemsPerOrder: val === '' ? '' : parseInt(val) || 1 });
                                    }}
                                    className="bg-base border border-line-strong rounded-xl px-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">items</span>
                                </div>
                              </div>

                              {hasWeight && (
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                                    Max Weight (KG)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0.5"
                                      step="0.5"
                                      disabled={!cur.enabled}
                                      value={cur.maxWeightKg ?? defaults.maxWeightKg ?? 5}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        update({ maxWeightKg: val === '' ? '' : parseFloat(val) || 1 });
                                      }}
                                      className="bg-base border border-line-strong rounded-xl px-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">kg</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                                  Min Order Amount (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    disabled={!cur.enabled}
                                    value={cur.minOrderAmount ?? defaults.minOrderAmount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      update({ minOrderAmount: val === '' ? '' : parseInt(val) || 0 });
                                    }}
                                    className="bg-base border border-line-strong rounded-xl pl-7 pr-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </div>
                                <span className="text-[9px] text-muted px-1">0 = no minimum</span>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                                  Delivery Multiplier
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0.1"
                                    max="5"
                                    step="0.05"
                                    disabled={!cur.enabled}
                                    value={cur.deliveryFeeMultiplier ?? defaults.deliveryFeeMultiplier}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      update({ deliveryFeeMultiplier: val === '' ? '' : parseFloat(val) || 1 });
                                    }}
                                    className="bg-base border border-line-strong rounded-xl px-3 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">×</span>
                                </div>
                                <span className="text-[9px] text-muted px-1">1.0 = normal</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. SERVICE RADIUS SETTINGS */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div>
                      <h4 className="font-display font-extrabold text-base text-primary flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Service Radius Settings
                      </h4>
                      <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                        Set the maximum service radius. Orders will only be accepted within this radius from restaurants for food delivery and from pickup locations for rides.
                      </p>
                    </div>

                    <div className="border border-dashed border-primary/30 dark:border-primary/40 bg-purple-50/40 dark:bg-purple-950/20 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Service Radius (KM)
                        </label>
                        <div className="relative mt-1.5 flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="500"
                            required
                            value={settingsForm?.globalServiceRadiusKm ?? 5}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSettingsForm({ ...settingsForm, globalServiceRadiusKm: isNaN(val) ? '' : val });
                            }}
                            className="bg-surface border border-line-strong rounded-xl px-4 py-3 text-sm text-main font-bold outline-none w-full pr-12 focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                          />
                          <span className="absolute right-3.5 text-xs font-bold text-muted uppercase pointer-events-none">km</span>
                        </div>
                      </div>

                      <div className="bg-purple-100/60 dark:bg-purple-900/30 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-main">How it works</h5>
                          <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                            Orders will only be created and shown to users when the distance between the customer and restaurant/pickup location is within this radius.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted px-1">
                      <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Default radius is 5 KM. You can update this value as per your business requirements.</span>
                    </div>
                  </div>

                  {/* 6. PRICING & COMMISSION */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Commission Rate (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            step="0.5"
                            value={settingsForm?.restaurantCommissionPercentage ?? settingsForm?.commissionPercent ?? 15}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = val === '' ? 0 : parseFloat(val);
                              const safeNum = Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
                              setSettingsForm({ ...settingsForm, restaurantCommissionPercentage: safeNum, commissionPercent: safeNum });
                            }}
                            className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Platform Fee (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={settingsForm?.platformFee ?? 5}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettingsForm({ ...settingsForm, platformFee: val === '' ? '' : parseFloat(val) || 0 });
                          }}
                          className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Food Delivery Pricing */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" />Food Delivery Pricing</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].map((tier, idx) => {
                          const defaults = [
                            { max: 2, fee: 20 },
                            { max: 3.5, fee: 25 },
                            { max: 6, fee: 40 },
                            { max: 12, fee: 80 },
                            { max: 20, fee: 120 }
                          ];
                          return (
                            <div key={tier} className="col-span-1 flex flex-col gap-2">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">Tier {idx+1} Max (km)</label>
                                <input type="number" step="0.1"
                                  value={settingsForm?.foodDeliveryPricing?.[tier]?.maxDistanceKm ?? defaults[idx].max}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      foodDeliveryPricing: {
                                        ...settingsForm.foodDeliveryPricing,
                                        [tier]: { ...settingsForm.foodDeliveryPricing?.[tier], maxDistanceKm: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">Tier {idx+1} Fee (₹)</label>
                                <input type="number"
                                  value={settingsForm?.foodDeliveryPricing?.[tier]?.fee ?? defaults[idx].fee}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      foodDeliveryPricing: {
                                        ...settingsForm.foodDeliveryPricing,
                                        [tier]: { ...settingsForm.foodDeliveryPricing?.[tier], fee: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ride Bike Pricing */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" />Ride Bike Pricing</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].map((tier, idx) => {
                          const defaults = [
                            { max: 2, fee: 20 },
                            { max: 3.5, fee: 25 },
                            { max: 6, fee: 40 },
                            { max: 12, fee: 80 },
                            { max: 20, fee: 120 }
                          ];
                          return (
                            <div key={tier} className="col-span-1 flex flex-col gap-2">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">Tier {idx+1} Max (km)</label>
                                <input type="number" step="0.1"
                                  value={settingsForm?.rideBikePricing?.[tier]?.maxDistanceKm ?? defaults[idx].max}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      rideBikePricing: {
                                        ...settingsForm.rideBikePricing,
                                        [tier]: { ...settingsForm.rideBikePricing?.[tier], maxDistanceKm: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">Tier {idx+1} Fee (₹)</label>
                                <input type="number"
                                  value={settingsForm?.rideBikePricing?.[tier]?.fee ?? defaults[idx].fee}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      rideBikePricing: {
                                        ...settingsForm.rideBikePricing,
                                        [tier]: { ...settingsForm.rideBikePricing?.[tier], fee: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ride Auto Pricing */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" />Ride Auto Pricing</h4>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {['tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6'].map((tier, idx) => {
                          const defaults = [
                            { max: 2, fee: 30 },
                            { max: 3.5, fee: 40 },
                            { max: 6, fee: 70 },
                            { max: 12, fee: 120 },
                            { max: 20, fee: 200 },
                            { max: 40, fee: 400 }
                          ];
                          return (
                            <div key={tier} className="col-span-1 flex flex-col gap-2">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Max (km)</label>
                                <input type="number" step="0.1"
                                  value={settingsForm?.rideAutoPricing?.[tier]?.maxDistanceKm ?? defaults[idx].max}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      rideAutoPricing: {
                                        ...settingsForm.rideAutoPricing,
                                        [tier]: { ...settingsForm.rideAutoPricing?.[tier], maxDistanceKm: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-[10px] font-bold w-full"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Fee (₹)</label>
                                <input type="number"
                                  value={settingsForm?.rideAutoPricing?.[tier]?.fee ?? defaults[idx].fee}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSettingsForm({
                                      ...settingsForm,
                                      rideAutoPricing: {
                                        ...settingsForm.rideAutoPricing,
                                        [tier]: { ...settingsForm.rideAutoPricing?.[tier], fee: val }
                                      }
                                    });
                                  }}
                                  className="bg-base border border-line-strong rounded-lg px-2 py-2 text-[10px] font-bold w-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ride Services & Multi-Order Grouping */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />Ride Services & Multi-Order Grouping</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 bg-base border border-line-strong rounded-lg p-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={settingsForm?.rideServices?.bikeEnabled ?? true}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                rideServices: { ...settingsForm.rideServices, bikeEnabled: e.target.checked }
                              })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-[11px] font-bold uppercase">Bike Taxi ON</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-4 bg-base border border-line-strong rounded-lg p-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={settingsForm?.rideServices?.autoEnabled ?? true}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                rideServices: { ...settingsForm.rideServices, autoEnabled: e.target.checked }
                              })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-[11px] font-bold uppercase">Auto Taxi ON</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-4 bg-base border border-line-strong rounded-lg p-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={settingsForm?.rideServices?.parcelEnabled ?? true}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                rideServices: { ...settingsForm.rideServices, parcelEnabled: e.target.checked }
                              })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-[11px] font-bold uppercase">Parcel Delivery ON</span>
                          </label>
                        </div>

                        <div className="flex flex-col gap-2 bg-base border border-line-strong rounded-lg p-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={settingsForm?.sameAddressMultiOrder?.enabled ?? true}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                sameAddressMultiOrder: { ...settingsForm.sameAddressMultiOrder, enabled: e.target.checked }
                              })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-[11px] font-bold uppercase">Multi-Order Discount ON</span>
                          </label>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted uppercase">Max Orders:</span>
                            <input type="number" min="1"
                              value={settingsForm?.sameAddressMultiOrder?.maxOrders || 3}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                sameAddressMultiOrder: { ...settingsForm.sameAddressMultiOrder, maxOrders: parseInt(e.target.value) || 1 }
                              })}
                              className="bg-white border border-line-strong rounded-md px-2 py-1 text-xs font-bold w-16 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Surcharges */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />Optional Surcharges</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['rain', 'lateNight', 'festival'].map((sc) => {
                          const labels = { rain: 'Rain Charge', lateNight: 'Late Night Charge', festival: 'Festival Charge' };
                          const defaultFees = { rain: 10, lateNight: 20, festival: 15 };
                          const cur = settingsForm?.surcharges?.[sc] || { enabled: false, fee: defaultFees[sc] };
                          return (
                            <div key={sc} className="flex items-center gap-4 bg-base border border-line-strong rounded-lg p-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox"
                                  checked={cur.enabled}
                                  onChange={(e) => setSettingsForm({
                                    ...settingsForm,
                                    surcharges: { ...settingsForm.surcharges, [sc]: { ...cur, enabled: e.target.checked } }
                                  })}
                                  className="w-4 h-4 text-primary"
                                />
                                <span className="text-[11px] font-bold uppercase">{labels[sc]}</span>
                              </label>
                              <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs font-bold">₹</span>
                                <input type="number"
                                  value={cur.fee}
                                  onChange={(e) => setSettingsForm({
                                    ...settingsForm,
                                    surcharges: { ...settingsForm.surcharges, [sc]: { ...cur, fee: parseFloat(e.target.value) || 0 } }
                                  })}
                                  className="bg-white border border-line-strong rounded-md px-2 py-1 text-xs font-bold w-16"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 7. PLATFORM OPERATIONAL CONTROLS */}
                  <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-5">
                    {/* Ecosystem Ordering Active */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isOpen"
                        checked={settingsForm?.isOpen ?? true}
                        onChange={(e) => setSettingsForm({ ...settingsForm, isOpen: e.target.checked })}
                        className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="isOpen" className="text-xs text-muted font-bold cursor-pointer uppercase">
                        Ecosystem Ordering Active (Toggles platform shutdown / open)
                      </label>
                    </div>

                    {/* Rider Assignment Mode */}
                    <div className="border border-line p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-main flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Rider Assignment Mode
                      </h4>
                      <p className="text-[11px] text-muted">Controls how riders are assigned to new orders and rides. Default is MANUAL.</p>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="riderAssignmentMode"
                            value="manual"
                            checked={(settingsForm?.riderAssignmentMode || 'manual') === 'manual'}
                            onChange={() => setSettingsForm({ ...settingsForm, riderAssignmentMode: 'manual' })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-xs font-bold uppercase">Manual</span>
                          <span className="text-[10px] text-muted font-medium">(Admin picks rider)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="riderAssignmentMode"
                            value="auto"
                            checked={(settingsForm?.riderAssignmentMode || 'manual') === 'auto'}
                            onChange={() => setSettingsForm({ ...settingsForm, riderAssignmentMode: 'auto' })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-xs font-bold uppercase">Auto</span>
                          <span className="text-[10px] text-muted font-medium">(System offers to all eligible, first accept wins)</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSettingsSaving}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer shadow-md transition-all disabled:opacity-50 w-full"
                    >
                      {isSettingsSaving ? 'Saving parameters...' : 'Update Platform Parameters'}
                    </button>
                  </div>
                </form>

                {/* Right Column: About Radius Card */}
                <div className="xl:col-span-1 bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4 sticky top-6">
                  <div>
                    <h4 className="font-display font-extrabold text-sm text-main flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      About Radius
                    </h4>
                    <p className="text-xs text-muted leading-relaxed mt-1">
                      This radius helps you control the service area of your platform.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-line pt-4">
                    {[
                      'Affects both Food & Ride services',
                      'Customers outside this radius cannot place orders',
                      'Helps in better delivery management',
                      'Reduces operational issues and delays'
                    ].map((text, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs text-main font-medium leading-tight">{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-base border border-line rounded-2xl p-4 text-[11px] text-muted leading-relaxed mt-1">
                    <p className="font-bold text-main mb-1">Pricing Independence</p>
                    The Global Service Radius only decides booking eligibility. Existing pricing distance tiers and calculations remain 100% active and independent.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROMO BANNERS LIST TAB */}
          {activeSubTab === 'banners' && (
            <BannerDesignsTab
              banners={banners}
              bannerDesigns={bannerDesigns}
              isLoading={isBannersLoading || isBannerDesignsLoading}
              onRefresh={() => {
                fetchBanners();
                fetchBannerDesigns();
              }}
              onEditDesign={(bannerId) => {
                setSelectedDesignBannerId(bannerId);
                setActiveSubTab('banner_designer');
              }}
              onToggle={handleToggleBanner}
              onDelete={(b) => setDeleteBannerModal({ isOpen: true, banner: b })}
              onAdd={() => {
                setAddBannerForm({
                  title: '',
                  subtitle: '',
                  buttonText: 'Order Now',
                  link: '/restaurants',
                  displayOrder: banners.length + 1,
                  isActive: true,
                  imageUrl: ''
                });
                setAddBannerFile(null);
                setAddBannerError('');
                setShowAddBannerModal(true);
              }}
            />
          )}

          {/* PROMO BANNER DESIGNER STUDIO TAB */}
          {activeSubTab === 'banner_designer' && selectedDesignBannerId && (
            <BannerDesigner
              bannerId={selectedDesignBannerId}
              banner={banners.find(b => b._id === selectedDesignBannerId)}
              token={token}
              allBanners={banners}
              allBannerDesigns={bannerDesigns}
              onBackToList={() => setActiveSubTab('banners')}
              onDesignUpdated={(bannerId, updatedDoc) => {
                setBannerDesigns((prev) => ({
                  ...prev,
                  [bannerId]: updatedDoc
                }));
              }}
              onBannerUpdated={(bannerId, updatedBanner) => {
                setBanners((prev) => prev.map(b => b._id === bannerId ? updatedBanner : b));
              }}
              onSwitchBanner={(bannerId) => {
                setSelectedDesignBannerId(bannerId);
              }}
            />
          )}

          {/* ── CATEGORY MANAGEMENT TAB ──────────────────────────────────── */}
          {activeSubTab === 'categories' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* ── 1. 6 CORE CATEGORY SERVICES AVAILABILITY (ON/OFF & HOURS CONTROL) ── */}
              <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-display font-extrabold text-sm sm:text-base text-main flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Category Services Availability & Service Hours (ON/OFF Control)
                    </h4>
                    <p className="text-xs text-muted font-medium">
                      Configure live availability and opening/closing hours in IST (<span className="font-semibold text-main">Asia/Kolkata</span>) for all 6 customer categories. When turned OFF or closed, categories remain visible on Home and ordering is safely blocked.
                    </p>
                  </div>
                  {isCategoryServicesLoading && (
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {categoryServices.map((service) => {
                    const isToggling = categoryServiceToggleLoading[service.id];
                    const isEnabled = service.isEnabled !== false;
                    const is24Hours = service.is24Hours === true;
                    const status = service.status || (isEnabled ? 'OPEN' : 'DISABLED');
                    const isClosed = status === 'CLOSED';
                    const isDisabled = status === 'DISABLED' || !isEnabled;

                    return (
                      <div
                        key={service.id}
                        className={`border rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 ${
                          isDisabled
                            ? 'bg-base/60 border-line-strong'
                            : isClosed
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-surface border-line hover:border-emerald-500/40 hover:shadow-xs'
                        }`}
                      >
                        {/* Top: Thumbnail, Name, Status Badge, and Switch */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-base border border-line shrink-0 flex items-center justify-center">
                              <img
                                src={getImageUrl(service.image || `/assets/cat_${service.id}.jpg`, 'category')}
                                alt={service.name}
                                onError={(e) => handleImageError(e, 'category')}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-display font-extrabold text-xs sm:text-sm text-main truncate">
                                {service.name}
                              </span>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {isDisabled ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    SERVICE DISABLED
                                  </span>
                                ) : isClosed ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    CLOSED NOW ({service.message || 'Outside hours'})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    OPEN NOW
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Switch Button */}
                          <div className="shrink-0 pt-0.5">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleUpdateCategoryService(service.id, { isEnabled: !isEnabled })}
                              aria-label={`Toggle ${service.name}`}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${
                                isToggling ? 'opacity-50 cursor-wait' : ''
                              } ${
                                isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  isEnabled ? 'translate-x-5.5' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Bottom: Service Hours Config */}
                        <div className="pt-2.5 border-t border-line flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Hours:</span>
                            <div className="inline-flex rounded-lg p-0.5 bg-base border border-line text-[10px] font-bold">
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleUpdateCategoryService(service.id, { is24Hours: false })}
                                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                  !is24Hours ? 'bg-surface text-main shadow-2xs font-extrabold' : 'text-muted hover:text-main'
                                }`}
                              >
                                Custom Hours
                              </button>
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleUpdateCategoryService(service.id, { is24Hours: true })}
                                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                  is24Hours ? 'bg-primary text-white shadow-2xs font-extrabold' : 'text-muted hover:text-main'
                                }`}
                              >
                                24 Hours
                              </button>
                            </div>
                          </div>

                          {!is24Hours && (
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-extrabold text-muted uppercase">Opens</label>
                                <input
                                  type="time"
                                  disabled={isToggling}
                                  value={service.openingTime || '06:00'}
                                  onChange={(e) => handleUpdateCategoryService(service.id, { openingTime: e.target.value })}
                                  className="bg-base border border-line rounded-lg px-2 py-1 text-[11px] font-bold text-main outline-none focus:border-primary cursor-pointer"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-extrabold text-muted uppercase">Closes</label>
                                <input
                                  type="time"
                                  disabled={isToggling}
                                  value={service.closingTime || '22:00'}
                                  onChange={(e) => handleUpdateCategoryService(service.id, { closingTime: e.target.value })}
                                  className="bg-base border border-line rounded-lg px-2 py-1 text-[11px] font-bold text-main outline-none focus:border-primary cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. SUB-CATEGORIES CRUD TABLE ───────────────────────────── */}
              {/* Header with Dashboard Service Selector & Add Category Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Category Management
                  </h3>
                  <p className="text-xs text-muted font-medium">
                    Manage circular categories, display orders, images, and live visibility for each service.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Dashboard / Service Selector */}
                  <div className="flex items-center gap-2 bg-base border border-line-strong rounded-xl px-3 py-2 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Service:</span>
                    <select
                      value={selectedCategoryService}
                      onChange={(e) => {
                        setSelectedCategoryService(e.target.value);
                        fetchCategories(e.target.value);
                      }}
                      className="bg-transparent text-xs font-black text-main outline-none cursor-pointer"
                    >
                      <option value="food">Food</option>
                      <option value="cool_hot">Cool & Hot</option>
                      <option value="grocery">Grocery</option>
                      <option value="veg_fruits">Veg & Fruits</option>
                      <option value="meat">Meat</option>
                      <option value="all">All Services</option>
                    </select>
                  </div>

                  {/* Add Category Button */}
                  <button
                    onClick={() => {
                      setAddCategoryForm({
                        name: '',
                        image: '',
                        dashboardType: selectedCategoryService !== 'all' ? selectedCategoryService : 'food',
                        displayOrder: categoriesList.filter(c => selectedCategoryService === 'all' || c.dashboardType === selectedCategoryService).length + 1,
                        isActive: true
                      });
                      setAddCategoryFile(null);
                      setAddCategoryError('');
                      setShowAddCategoryModal(true);
                    }}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Category</span>
                  </button>
                </div>
              </div>

              {/* Category Table */}
              <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-2xs">
                {isCategoriesLoading ? (
                  <div className="p-12 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : categoriesList.filter(c => selectedCategoryService === 'all' || c.dashboardType === selectedCategoryService).length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <Layers className="w-12 h-12 text-muted/40" />
                    <p className="text-sm font-bold text-main">No categories found for this service.</p>
                    <button
                      onClick={() => {
                        setAddCategoryForm({
                          name: '',
                          image: '',
                          dashboardType: selectedCategoryService !== 'all' ? selectedCategoryService : 'food',
                          displayOrder: 1,
                          isActive: true
                        });
                        setAddCategoryFile(null);
                        setAddCategoryError('');
                        setShowAddCategoryModal(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Click here to add the first category
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line bg-base/50 text-[10px] uppercase font-black tracking-wider text-muted">
                          <th className="py-3.5 px-4 w-12 text-center">Order</th>
                          <th className="py-3.5 px-4 w-16">Image</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Dashboard / Service</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-center w-20">Seq #</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {categoriesList
                          .filter(c => selectedCategoryService === 'all' || c.dashboardType === selectedCategoryService)
                          .map((cat, idx, arr) => (
                            <tr key={cat._id} className="hover:bg-base/30 transition-colors">
                              {/* Reorder Buttons */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleMoveCategory(cat, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-base text-muted hover:text-main disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="Move Up"
                                  >
                                    <MoveUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveCategory(cat, 'down')}
                                    disabled={idx === arr.length - 1}
                                    className="p-1 rounded hover:bg-base text-muted hover:text-main disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="Move Down"
                                  >
                                    <MoveDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              {/* Image */}
                              <td className="py-3 px-4">
                                <div className="w-11 h-11 rounded-full overflow-hidden border border-line-strong shadow-xs flex-shrink-0 bg-base">
                                  <img
                                    src={getImageUrl(cat.image, 'category')}
                                    alt={cat.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => handleImageError(e, 'category')}
                                  />
                                </div>
                              </td>

                              {/* Category Name */}
                              <td className="py-3 px-4">
                                <span className="font-extrabold text-main text-sm">
                                  {cat.name}
                                </span>
                              </td>

                              {/* Dashboard / Service */}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  cat.dashboardType === 'food' ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400' :
                                  cat.dashboardType === 'cool_hot' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400' :
                                  cat.dashboardType === 'grocery' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400' :
                                  cat.dashboardType === 'meat' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400' :
                                  'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:border-green-800 dark:text-green-400'
                                }`}>
                                  {cat.dashboardType === 'food' ? 'Food' :
                                   cat.dashboardType === 'cool_hot' ? 'Cool & Hot' :
                                   cat.dashboardType === 'grocery' ? 'Grocery' :
                                   cat.dashboardType === 'meat' ? 'Meat' :
                                   'Veg & Fruits'}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleToggleCategoryStatus(cat)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer border transition-all ${
                                    cat.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                  }`}
                                  title="Click to toggle Active / Inactive"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                  {cat.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </td>

                              {/* Order */}
                              <td className="py-3 px-4 text-center font-black text-main">
                                #{cat.displayOrder || idx + 1}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditCategoryForm({
                                        _id: cat._id,
                                        name: cat.name,
                                        image: cat.image,
                                        dashboardType: cat.dashboardType,
                                        displayOrder: cat.displayOrder || idx + 1,
                                        isActive: cat.isActive !== false
                                      });
                                      setEditCategoryFile(null);
                                      setEditCategoryError('');
                                      setShowEditCategoryModal(true);
                                    }}
                                    className="p-1.5 rounded-xl border border-line-strong hover:border-primary text-muted hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                    title="Edit Category"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteCategoryModal({
                                        isOpen: true,
                                        category: cat,
                                        warningMessage: '',
                                        hasProducts: false,
                                        count: 0
                                      });
                                    }}
                                    className="p-1.5 rounded-xl border border-line-strong hover:border-red-500 text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── ADD USER MODAL ─────────────────────────────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2"><Plus className="w-4 h-4 text-primary"/>Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-muted hover:text-main cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            {addUserError && <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{addUserError}</p>}
            <form onSubmit={handleAddUser} className="flex flex-col gap-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@example.com' },
                { label: 'Mobile Number', key: 'phone', type: 'tel', placeholder: '9876543210' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">{label}</label>
                  <input type={type} required placeholder={placeholder} value={addUserForm[key]}
                    onChange={e => setAddUserForm({ ...addUserForm, [key]: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"/>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Role</label>
                <select value={addUserForm.role} onChange={e => setAddUserForm({ ...addUserForm, role: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary cursor-pointer">
                  <option value="customer">Customer</option>
                  <option value="delivery">Delivery Rider</option>
                  <option value="restaurant">Restaurant Partner</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isAddingUser}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50">
                  {isAddingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ─────────────────────────────────────────── */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2"><Pencil className="w-4 h-4 text-primary"/>Edit User Profile</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-muted hover:text-main cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            {editUserError && <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{editUserError}</p>}
            <form onSubmit={handleEditUser} className="flex flex-col gap-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Full Name' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'Email' },
                { label: 'Mobile Number', key: 'phone', type: 'tel', placeholder: 'Phone' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">{label}</label>
                  <input type={type} required={key !== 'phone'} placeholder={placeholder} value={editUserForm[key]}
                    onChange={e => setEditUserForm({ ...editUserForm, [key]: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"/>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEditUserModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isEditingUser}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50">
                  {isEditingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADMIN EDIT PROFILE MODAL ────────────────────────────────── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2"><UserCircle className="w-4 h-4 text-primary"/>Edit Admin Profile</h3>
              <button onClick={() => setShowEditProfileModal(false)} className="text-muted hover:text-main cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            {editProfileError && <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{editProfileError}</p>}
            {editProfileSuccess && <p className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">{editProfileSuccess}</p>}
            <form onSubmit={handleEditAdminProfile} className="flex flex-col gap-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                { label: 'Mobile Number', key: 'phone', type: 'tel', placeholder: 'Phone number' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">{label}</label>
                  <input type={type} placeholder={placeholder} value={editProfileForm[key]}
                    onChange={e => setEditProfileForm({ ...editProfileForm, [key]: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"/>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Email Address</label>
                <input type="email" value={user?.email || ''} disabled
                  className="bg-gray-50 border border-line rounded-xl px-3.5 py-2.5 text-xs text-muted font-bold outline-none w-full cursor-not-allowed"/>
                <span className="text-[9px] text-muted px-1">Email cannot be changed for security reasons</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isEditingProfile}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50">
                  {isEditingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD CATEGORY MODAL ────────────────────────────────────────── */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Add New Category
              </h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addCategoryError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl">
                {addCategoryError}
              </p>
            )}

            <form onSubmit={handleAddCategory} className="flex flex-col gap-3.5">
              {/* Dashboard / Service */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Dashboard / Service
                </label>
                <select
                  value={addCategoryForm.dashboardType}
                  onChange={(e) => setAddCategoryForm({ ...addCategoryForm, dashboardType: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                >
                  <option value="food">Food</option>
                  <option value="cool_hot">Cool & Hot</option>
                  <option value="grocery">Grocery</option>
                  <option value="veg_fruits">Veg & Fruits</option>
                  <option value="meat">Meat</option>
                </select>
              </div>

              {/* Category Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ice Creams, Biryani..."
                  value={addCategoryForm.name}
                  onChange={(e) => setAddCategoryForm({ ...addCategoryForm, name: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                />
              </div>

              {/* Category Image */}
              <ImageUploadInput
                label="Category Image *"
                imageType="category"
                value={addCategoryForm.image}
                file={addCategoryFile}
                onFileChange={setAddCategoryFile}
                onUrlChange={(url) => setAddCategoryForm(prev => ({ ...prev, image: url }))}
                previewShape="round"
                required
              />

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={addCategoryForm.displayOrder}
                    onChange={(e) => setAddCategoryForm({ ...addCategoryForm, displayOrder: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Status
                  </label>
                  <select
                    value={addCategoryForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setAddCategoryForm({ ...addCategoryForm, isActive: e.target.value === 'active' })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCategory}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isAddingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CATEGORY MODAL ───────────────────────────────────────── */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                Edit Category
              </h3>
              <button onClick={() => setShowEditCategoryModal(false)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editCategoryError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl">
                {editCategoryError}
              </p>
            )}

            <form onSubmit={handleEditCategory} className="flex flex-col gap-3.5">
              {/* Dashboard / Service */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Dashboard / Service
                </label>
                <select
                  value={editCategoryForm.dashboardType}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, dashboardType: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                >
                  <option value="food">Food</option>
                  <option value="cool_hot">Cool & Hot</option>
                  <option value="grocery">Grocery</option>
                  <option value="veg_fruits">Veg & Fruits</option>
                  <option value="meat">Meat</option>
                </select>
              </div>

              {/* Category Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Biryani"
                  value={editCategoryForm.name}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                />
              </div>

              {/* Category Image */}
              <ImageUploadInput
                label="Category Image"
                imageType="category"
                value={editCategoryForm.image}
                file={editCategoryFile}
                onFileChange={setEditCategoryFile}
                onUrlChange={(url) => setEditCategoryForm(prev => ({ ...prev, image: url }))}
                previewShape="round"
              />

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={editCategoryForm.displayOrder}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, displayOrder: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Status
                  </label>
                  <select
                    value={editCategoryForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, isActive: e.target.value === 'active' })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingCategory}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CATEGORY CONFIRMATION MODAL ───────────────────────── */}
      {deleteCategoryModal.isOpen && deleteCategoryModal.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-extrabold text-base text-main">
                Delete Category?
              </h3>
              <p className="text-xs text-muted">
                Are you sure you want to delete <span className="font-bold text-main">"{deleteCategoryModal.category.name}"</span>?
              </p>
            </div>

            {deleteCategoryModal.hasProducts && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-tight">
                  {deleteCategoryModal.warningMessage || `This category contains ${deleteCategoryModal.count} product(s). Please reassign the products before deleting this category.`}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setDeleteCategoryModal({ isOpen: false, category: null, warningMessage: '', hasProducts: false, count: 0 })}
                className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => handleDeleteCategory(deleteCategoryModal.category, deleteCategoryModal.hasProducts)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingCategory ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PROMO BANNER MODAL ────────────────────────────────────── */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                Add New Promo Banner
              </h3>
              <button onClick={() => setShowAddBannerModal(false)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addBannerError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl">
                {addBannerError}
              </p>
            )}

            <form onSubmit={handleAddBanner} className="flex flex-col gap-3.5">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Banner Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hot Deals On Your Favorite Food"
                  value={addBannerForm.title}
                  onChange={(e) => setAddBannerForm({ ...addBannerForm, title: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                />
              </div>

              {/* Subtitle */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enjoy up to 50% discount from top restaurants"
                  value={addBannerForm.subtitle}
                  onChange={(e) => setAddBannerForm({ ...addBannerForm, subtitle: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-medium outline-none focus:border-primary w-full"
                />
              </div>

              {/* CTA Button Text & Destination Link */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="Order Now"
                    value={addBannerForm.buttonText}
                    onChange={(e) => setAddBannerForm({ ...addBannerForm, buttonText: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Destination Link
                  </label>
                  <input
                    type="text"
                    placeholder="/restaurants"
                    value={addBannerForm.link}
                    onChange={(e) => setAddBannerForm({ ...addBannerForm, link: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-mono outline-none focus:border-primary w-full"
                  />
                </div>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={addBannerForm.displayOrder}
                    onChange={(e) => setAddBannerForm({ ...addBannerForm, displayOrder: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Status
                  </label>
                  <select
                    value={addBannerForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setAddBannerForm({ ...addBannerForm, isActive: e.target.value === 'active' })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full cursor-pointer"
                  >
                    <option value="active">Active (Live on Home)</option>
                    <option value="inactive">Inactive (Hidden/Draft)</option>
                  </select>
                </div>
              </div>

              {/* Banner Artwork Image */}
              <ImageUploadInput
                label="Banner Artwork Image *"
                imageType="banner"
                value={addBannerForm.imageUrl}
                file={addBannerFile}
                onFileChange={setAddBannerFile}
                onUrlChange={(url) => setAddBannerForm(prev => ({ ...prev, imageUrl: url }))}
                previewShape="wide"
                required
              />

              {/* Live Preview Box */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Live Carousel Preview
                </label>
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#6B11A9] via-[#85169E] to-[#F43F5E] text-white flex items-center justify-between shadow-inner">
                  <div className="flex flex-col gap-1 max-w-[65%]">
                    <span className="font-black text-sm text-[#FFD700] leading-tight line-clamp-1">
                      {addBannerForm.title || 'Banner Title Preview'}
                    </span>
                    <span className="text-[10px] text-white/90 font-medium leading-tight line-clamp-2">
                      {addBannerForm.subtitle || 'Fresh, reliable deliveries straight to your doorstep!'}
                    </span>
                    <span className="mt-1 inline-block bg-[#FFD700] text-gray-900 text-[10px] font-black px-3 py-1 rounded-full self-start shadow-xs">
                      {addBannerForm.buttonText || 'Order Now'}
                    </span>
                  </div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {addBannerFile ? (
                      <img src={URL.createObjectURL(addBannerFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : addBannerForm.imageUrl ? (
                      <img src={getImageUrl(addBannerForm.imageUrl, 'banner')} alt="Preview" className="w-full h-full object-cover" onError={(e) => handleImageError(e, 'banner')} />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-white/50" />
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingBanner}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isAddingBanner ? 'Uploading & Saving...' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PROMO BANNER MODAL ─────────────────────────────────────── */}
      {showEditBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                Edit Promo Banner
              </h3>
              <button onClick={() => setShowEditBannerModal(false)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editBannerError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl">
                {editBannerError}
              </p>
            )}

            <form onSubmit={handleEditBanner} className="flex flex-col gap-3.5">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Banner Title *
                </label>
                <input
                  type="text"
                  required
                  value={editBannerForm.title}
                  onChange={(e) => setEditBannerForm({ ...editBannerForm, title: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                />
              </div>

              {/* Subtitle */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={editBannerForm.subtitle}
                  onChange={(e) => setEditBannerForm({ ...editBannerForm, subtitle: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-medium outline-none focus:border-primary w-full"
                />
              </div>

              {/* CTA Button Text & Destination Link */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={editBannerForm.buttonText}
                    onChange={(e) => setEditBannerForm({ ...editBannerForm, buttonText: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Destination Link
                  </label>
                  <input
                    type="text"
                    value={editBannerForm.link}
                    onChange={(e) => setEditBannerForm({ ...editBannerForm, link: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-mono outline-none focus:border-primary w-full"
                  />
                </div>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editBannerForm.displayOrder}
                    onChange={(e) => setEditBannerForm({ ...editBannerForm, displayOrder: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                    Status
                  </label>
                  <select
                    value={editBannerForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditBannerForm({ ...editBannerForm, isActive: e.target.value === 'active' })}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs text-main font-bold outline-none focus:border-primary w-full cursor-pointer"
                  >
                    <option value="active">Active (Live on Home)</option>
                    <option value="inactive">Inactive (Hidden/Draft)</option>
                  </select>
                </div>
              </div>

              {/* Banner Artwork Image */}
              <ImageUploadInput
                label="Banner Artwork Image"
                imageType="banner"
                value={editBannerForm.imageUrl}
                file={editBannerFile}
                onFileChange={setEditBannerFile}
                onUrlChange={(url) => setEditBannerForm(prev => ({ ...prev, imageUrl: url }))}
                previewShape="wide"
              />

              {/* Live Preview Box */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  Live Carousel Preview
                </label>
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#6B11A9] via-[#85169E] to-[#F43F5E] text-white flex items-center justify-between shadow-inner">
                  <div className="flex flex-col gap-1 max-w-[65%]">
                    <span className="font-black text-sm text-[#FFD700] leading-tight line-clamp-1">
                      {editBannerForm.title || 'Banner Title'}
                    </span>
                    <span className="text-[10px] text-white/90 font-medium leading-tight line-clamp-2">
                      {editBannerForm.subtitle || 'Fresh, reliable deliveries straight to your doorstep!'}
                    </span>
                    <span className="mt-1 inline-block bg-[#FFD700] text-gray-900 text-[10px] font-black px-3 py-1 rounded-full self-start shadow-xs">
                      {editBannerForm.buttonText || 'Order Now'}
                    </span>
                  </div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {editBannerFile ? (
                      <img src={URL.createObjectURL(editBannerFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : editBannerForm.imageUrl ? (
                      <img src={getImageUrl(editBannerForm.imageUrl, 'banner')} alt="Preview" className="w-full h-full object-cover" onError={(e) => handleImageError(e, 'banner')} />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-white/50" />
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowEditBannerModal(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingBanner}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditingBanner ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE PROMO BANNER CONFIRMATION MODAL ──────────────────────── */}
      {deleteBannerModal.isOpen && deleteBannerModal.banner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-extrabold text-base text-main">
                Delete Banner?
              </h3>
              <p className="text-xs text-muted">
                Are you sure you want to remove <span className="font-bold text-main">"{deleteBannerModal.banner.title}"</span> from the carousel?
              </p>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setDeleteBannerModal({ isOpen: false, banner: null })}
                className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBanner}
                onClick={() => handleDeleteBanner(deleteBannerModal.banner)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingBanner ? 'Deleting...' : 'Delete Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN RESTAURANT OPENING HOURS MODAL ─── */}
      {showRestaurantHoursModal && selectedRestaurantForHours && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-main">
                  Edit Restaurant Timings
                </h3>
                <p className="text-xs text-muted font-medium">
                  {selectedRestaurantForHours.name} ({selectedRestaurantForHours.restaurant?.name || selectedRestaurantForHours.email})
                </p>
              </div>
              <button
                onClick={() => setShowRestaurantHoursModal(false)}
                className="p-1.5 rounded-xl border border-line-strong bg-base text-muted hover:text-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adminHoursSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" /> {adminHoursSuccess}
              </div>
            )}

            {adminHoursError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {adminHoursError}
              </div>
            )}

            {/* Quick Fill Bar */}
            <div className="bg-base border border-line p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-main">Apply to All Days</span>
                <span className="text-[10px] text-muted">Quickly fill all 7 days with the same hours</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-surface border border-line rounded-lg px-2.5 py-1">
                  <span className="text-[9px] font-bold text-muted uppercase">Open:</span>
                  <input
                    type="time"
                    value={adminBulkOpenTime}
                    onChange={(e) => setAdminBulkOpenTime(e.target.value)}
                    className="bg-transparent text-xs font-bold text-main outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-surface border border-line rounded-lg px-2.5 py-1">
                  <span className="text-[9px] font-bold text-muted uppercase">Close:</span>
                  <input
                    type="time"
                    value={adminBulkCloseTime}
                    onChange={(e) => setAdminBulkCloseTime(e.target.value)}
                    className="bg-transparent text-xs font-bold text-main outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAdminApplyAllDays}
                  className="bg-violet-100 hover:bg-violet-200 text-primary text-xs font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                >
                  Apply All
                </button>
              </div>
            </div>

            {/* Schedule List */}
            <div className="flex flex-col divide-y divide-line">
              {DAYS_OF_WEEK.map(day => {
                const dayConfig = adminOpeningHours[day] || { enabled: true, open: '09:00', close: '23:00' };
                const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                const isOvernight = parseTimeToMinutes(dayConfig.open) > parseTimeToMinutes(dayConfig.close);

                return (
                  <div key={day} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-[130px]">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminOpeningHours(prev => ({
                            ...prev,
                            [day]: { ...dayConfig, enabled: !dayConfig.enabled }
                          }));
                        }}
                        className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                          dayConfig.enabled
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-red-50 border-red-200 text-red-600'
                        }`}
                      >
                        {dayConfig.enabled ? 'ON' : 'OFF'}
                      </button>
                      <span className="font-bold text-xs text-main">{dayLabel}</span>
                    </div>

                    {dayConfig.enabled ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-base border border-line-strong rounded-lg px-2.5 py-1">
                          <span className="text-[9px] font-bold text-muted uppercase">Open:</span>
                          <input
                            type="time"
                            value={dayConfig.open || '09:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdminOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...dayConfig, open: val }
                              }));
                            }}
                            className="bg-transparent text-xs font-bold text-main outline-none"
                          />
                        </div>
                        <span className="text-muted font-bold text-xs">→</span>
                        <div className="flex items-center gap-1 bg-base border border-line-strong rounded-lg px-2.5 py-1">
                          <span className="text-[9px] font-bold text-muted uppercase">Close:</span>
                          <input
                            type="time"
                            value={dayConfig.close || '23:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdminOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...dayConfig, close: val }
                              }));
                            }}
                            className="bg-transparent text-xs font-bold text-main outline-none"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-muted">
                          ({formatTime12(dayConfig.open)} – {formatTime12(dayConfig.close)}{isOvernight ? ' 🌙 Overnight' : ''})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-muted italic">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 border-t border-line pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowRestaurantHoursModal(false)}
                className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAdminHoursSaving}
                onClick={handleSaveAdminRestaurantHours}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isAdminHoursSaving ? 'Saving...' : 'Update Timings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN ORDER HISTORY CALENDAR MODAL ─── */}
      <HistoryCalendarModal
        isOpen={showOrderCalendarModal}
        onClose={() => setShowOrderCalendarModal(false)}
        dateFilter={historyFilter.dateFilter}
        onApply={historyFilter.setDateFilter}
        availableYears={historyFilter.availableYears}
        datesWithRecords={historyFilter.datesWithRecords}
      />

      {/* ── UNIFIED MASTER ORDER DETAILS MODAL ─── */}
      <OrderDetailsModal
        isOpen={Boolean(selectedDetailsOrder)}
        onClose={() => setSelectedDetailsOrder(null)}
        order={selectedDetailsOrder}
        role="admin"
        token={token}
        onAssignRider={handleOpenAssignRiderModal}
        onMarkHandled={handleMarkRejectionHandled}
      />

      {/* ── ADMIN MANUAL ASSIGN RIDER MODAL ─── */}
      <AssignRiderModal
        isOpen={Boolean(assignRiderOrder)}
        onClose={() => setAssignRiderOrder(null)}
        order={assignRiderOrder}
        allUsers={allUsers}
        liveRiderLocations={liveRiderLocations}
        onAssign={handleConfirmReassignRider}
        isAssigning={isReassigning}
        error={reassignError}
      />

      {/* ── CLEAR ALL ORDER HISTORY MODAL ─── */}
      <ClearHistoryModal
        isOpen={showClearAllOrdersModal}
        onClose={() => setShowClearAllOrdersModal(false)}
        onConfirm={handleClearAllOrderHistory}
        title="Clear All Order History?"
        description="This will permanently remove all completed and cancelled orders from the admin history view. Active ongoing orders, claimed runs, and lifetime platform accounting will not be affected."
        confirmButtonText="Yes, Clear All"
      />
    </div>
  );
}
