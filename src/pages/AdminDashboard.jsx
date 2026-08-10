import { API_BASE } from '../config/api';
import { io } from 'socket.io-client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, DollarSign, ShoppingBag, Users, Store, Bike, CheckCircle, Check,
  XCircle, Settings, Tag, ShieldCheck, UserX, UserCheck, MessageSquare, 
  AlertCircle, ChevronLeft, ChevronRight, Ban, Unlock, Clock, Percent, MapPin, Calendar, X, ImagePlus, Trash2,
  Pencil, Plus, UserCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { uploadFileToBackend } from '../utils/uploadUtil';
import { formatAppDate, formatAppDateOnly } from '../utils/dateUtils';

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics', 'kyc', 'users', 'withdrawals', 'complaints', 'coupons', 'settings'
  
  // States
  const [metrics, setMetrics] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({
    commissionPercent: 15,
    deliveryBaseFee: 40,
    taxPercent: 5,
    isOpen: true
  });
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

  // User Manager
  const [allUsers, setAllUsers] = useState([]);
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

  // Banners Management
  const [banners, setBanners] = useState([]);
  const [isBannersLoading, setIsBannersLoading] = useState(true);
  const [newBannerFile, setNewBannerFile] = useState(null);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Orders Pipeline sub-tabs and Date filtering
  const [orderPipelineTab, setOrderPipelineTab] = useState('new'); // 'new', 'ongoing', 'completed'
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all', 'today', 'yesterday', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appliedDateFilter, setAppliedDateFilter] = useState({ type: 'all', start: '', end: '' });
  const [calendarViewDate, setCalendarViewDate] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });

  // Platform Settings updating state
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

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

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socket.on('orderStatusChanged', () => {
      fetchAllOrders();
      fetchAnalytics();
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
      } else {
        setAllOrders([]);
      }
    } catch (err) {
      console.error('Error fetching all orders:', err);
      setAllOrders([]);
    } finally {
      setIsOrdersLoading(false);
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
    const restaurantOrders = allOrders.filter(o => String(o.restaurantId) === String(restaurantId));
    const dateFilteredOrders = getOrdersByDateForAnalytics(restaurantOrders);
    
    dateFilteredOrders.forEach(order => {
      const amount = (order.total || 0) * 0.85; // 85% is net earnings for restaurant
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
        setPlatformSettings(data.settings);
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
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(platformSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        setPlatformSettings(updated);
        alert('Platform settings parameters updated successfully!');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBannerFile) return alert('Please select an image file');
    
    setIsUploadingBanner(true);
    try {
      const uploadedImageUrl = await uploadFileToBackend(newBannerFile);

      const res = await fetch(`${API_BASE}/admin/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: uploadedImageUrl, title: newBannerTitle, link: newBannerLink })
      });
      if (res.ok) {
        setNewBannerFile(null);
        setNewBannerTitle('');
        setNewBannerLink('');
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to upload banner');
    } finally {
      setIsUploadingBanner(false);
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

  const handleDeleteBanner = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchBanners();
    } catch (err) {
      console.error(err);
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

  const getOrdersByDate = (ordersList) => {
    let list = Array.isArray(ordersList) ? [...ordersList] : [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (appliedDateFilter.type === 'today') {
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= todayStart;
      });
    } else if (appliedDateFilter.type === 'yesterday') {
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
      const yesterdayEnd = todayStart - 1;
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= yesterdayStart && t <= yesterdayEnd;
      });
    } else if (appliedDateFilter.type === '7days') {
      const start = todayStart - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(o => new Date(o.createdAt).getTime() >= start);
    } else if (appliedDateFilter.type === '30days') {
      const start = todayStart - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(o => new Date(o.createdAt).getTime() >= start);
    } else if (appliedDateFilter.type === 'custom') {
      const start = appliedDateFilter.start ? new Date(appliedDateFilter.start).setHours(0,0,0,0) : 0;
      const end = appliedDateFilter.end ? new Date(appliedDateFilter.end).setHours(23,59,59,999) : Infinity;
      list = list.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= start && t <= end;
      });
    }
    return list;
  };

  const dateFilteredOrders = getOrdersByDate(allOrders);

  const newOrdersCount = dateFilteredOrders.filter(o => o.status === 'Placed').length;
  const ongoingOrdersCount = dateFilteredOrders.filter(o => ['Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status) && !['Delivered', 'Completed', 'Cancelled'].includes(o.status)).length;
  const completedOrdersCount = dateFilteredOrders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length;

  const filteredOrders = dateFilteredOrders.filter(o => {
    if (orderPipelineTab === 'new') return o.status === 'Placed';
    if (orderPipelineTab === 'ongoing') return ['Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status) && !['Delivered', 'Completed', 'Cancelled'].includes(o.status);
    if (orderPipelineTab === 'completed') return ['Delivered', 'Completed'].includes(o.status);
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
              <span className="text-xl font-black text-main">₹{metrics.totalSales.toFixed(2)}</span>
              <span className="p-1 bg-green-50 text-green-600 rounded-md text-[9px] font-bold">
                100% Volume
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[105px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Platform Net Commission</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-primary">₹{metrics.platformRevenue.toFixed(2)}</span>
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
            { id: 'kyc', label: 'KYC Document Approvals', icon: ShieldCheck, badge: pendingKyc.length },
            { id: 'users', label: 'User Directory Manager', icon: Users, badge: allUsers.length },
            { id: 'orders', label: 'All Orders History', icon: ShoppingBag, badge: allOrders.length },
            { id: 'withdrawals', label: 'Wallet Cashouts', icon: CheckCircle, badge: withdrawals.filter(w => w.status === 'Pending').length },
            { id: 'complaints', label: 'Complaints Resolution', icon: MessageSquare, badge: complaints.filter(c => c.status === 'Open').length },
            { id: 'coupons', label: 'Platform Coupons', icon: Tag, badge: coupons.length },
            { id: 'banners', label: 'Promo Banners', icon: ImagePlus, badge: banners.length },
            { id: 'settings', label: 'Operational Parameters', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
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
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[9px] px-1.8 py-0.5 rounded-full font-black ${
                    active ? 'bg-surface text-primary' : 'bg-primary text-white animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Contents Body */}
        <div className="lg:col-span-3">
          
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
                <div className="flex flex-col gap-3.5 mt-2">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-muted mb-1">
                      <span>Restaurateurs Payout (85% Split)</span>
                      <span>₹{(metrics?.totalSales * (1 - platformSettings.commissionPercent / 100) || 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-muted mb-1">
                      <span>Platform Commission Earned (15% Split)</span>
                      <span>₹{metrics?.platformRevenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-violet-50/20 border border-violet-100 p-4 rounded-2xl text-xs font-semibold text-muted mt-2 leading-relaxed">
                  <span className="text-primary font-bold">Billing Architecture: </span> 
                  Jinkzo processes digital payment collections and disperses funds daily. Platform splits commissions seamlessly across all active food ordering channels based on configured system parameters.
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
                              <td className="py-3.5 px-2">₹{earnings.upi.toFixed(2)}</td>
                              <td className="py-3.5 px-2">₹{earnings.card.toFixed(2)}</td>
                              <td className="py-3.5 px-2">₹{earnings.cod.toFixed(2)}</td>
                              <td className="py-3.5 px-2 text-right text-primary font-black">₹{earnings.total.toFixed(2)}</td>
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
                  {pendingKyc.map(user => (
                    <div key={user._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-4 justify-between">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-line">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl text-xs font-bold ${
                            user.role === 'restaurant' ? 'bg-violet-50 text-primary' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {user.role === 'restaurant' ? 'Restaurant Owner' : 'Delivery Driver'}
                          </div>
                          <h4 className="text-sm font-bold text-main">{user.name}</h4>
                        </div>
                        <span className="text-xs text-muted font-mono">Registered on {formatAppDateOnly(user.createdAt)}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="bg-base p-3.5 rounded-2xl flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted">Email Address</span>
                          <span className="font-bold text-main truncate">{user.email}</span>
                        </div>
                        <div className="bg-base p-3.5 rounded-2xl flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted">Mobile Phone</span>
                          <span className="font-bold text-main">{user.phone}</span>
                        </div>
                        <div className="bg-base p-3.5 rounded-2xl flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted">Credentials Sent</span>
                          <span className="font-bold text-primary uppercase font-mono">{user.kycDetails?.documentType || 'N/A'}: {user.kycDetails?.documentNumber || 'N/A'}</span>
                        </div>
                      </div>

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
                  ))}
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
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold px-1.8 py-0.5 rounded uppercase ${
                                u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' :
                                u.role === 'restaurant' ? 'bg-violet-50 text-primary border border-violet-100' :
                                u.role === 'delivery' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-gray-100 text-muted border border-line-strong'
                              }`}>
                                {u.role}
                              </span>
                              <h4 className="text-xs font-bold text-main line-clamp-1">{u.name}</h4>
                            </div>
                            <span className="text-[10px] text-muted font-semibold">{u.email}</span>
                            <span className="text-[9px] text-muted font-mono mt-0.5">{u.phone}</span>
                          </div>
 
                          {/* Block / Edit / Delete Controls */}
                          {u.role !== 'admin' && (
                            <div className="flex items-center gap-1.5">
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
                                <span className="text-main">₹{getRestaurantIncomeBreakdown(u.restaurantId).upi.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted font-extrabold">Card</span>
                                <span className="text-main">₹{getRestaurantIncomeBreakdown(u.restaurantId).card.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted font-extrabold">COD</span>
                                <span className="text-main">₹{getRestaurantIncomeBreakdown(u.restaurantId).cod.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col border-l border-line-strong/60 pl-2 text-primary">
                                <span className="text-[9px] uppercase font-extrabold">Total Added</span>
                                <span className="font-extrabold">₹{getRestaurantIncomeBreakdown(u.restaurantId).total.toFixed(2)}</span>
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
                
                {/* Date range picker selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(prev => !prev)}
                    className="bg-surface border border-line-strong px-4 py-2.5 rounded-xl text-xs font-bold text-muted hover:bg-base flex items-center gap-2 cursor-pointer shadow-3xs"
                  >
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{getDateLabel()}</span>
                  </button>

                  {showDatePicker && (
                    <div className="absolute right-0 mt-2 z-50 bg-surface border border-gray-155 rounded-3xl shadow-xl p-5 flex flex-col gap-4 w-[290px] sm:w-[480px]">
                      <div className="flex justify-between items-center border-b border-line pb-2">
                        <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">Select Order Date Range</span>
                        <button onClick={() => setShowDatePicker(false)} className="text-muted hover:text-muted cursor-pointer">
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
                                name="dateFilter"
                                checked={dateFilterType === opt.type}
                                onChange={() => setDateFilterType(opt.type)}
                                className="w-4 h-4 accent-primary cursor-pointer"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>

                        {/* Calendar & Custom dates */}
                        <div className="flex flex-col gap-3">
                          {renderCalendar((dateStr) => {
                            setDateFilterType('custom');
                            setCustomStartDate(dateStr);
                            setCustomEndDate(dateStr);
                            setAppliedDateFilter({ type: 'custom', start: dateStr, end: dateStr });
                            setShowDatePicker(false);
                          })}
                          
                          {dateFilterType === 'custom' && (
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-0.5 flex-grow">
                                <span className="text-[9px] uppercase font-extrabold text-muted pl-1">From</span>
                                <input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  className="bg-base border border-gray-250 rounded-xl px-2 py-1 text-xs text-main font-bold outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 flex-grow">
                                <span className="text-[9px] uppercase font-extrabold text-muted pl-1">To</span>
                                <input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) => setCustomEndDate(e.target.value)}
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
                            setDateFilterType(appliedDateFilter.type);
                            setCustomStartDate(appliedDateFilter.start);
                            setCustomEndDate(appliedDateFilter.end);
                            setShowDatePicker(false);
                          }}
                          className="px-4 py-2 border border-gray-250 text-muted rounded-xl text-xs font-bold hover:bg-base cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedDateFilter({
                              type: dateFilterType,
                              start: customStartDate,
                              end: customEndDate
                            });
                            setShowDatePicker(false);
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

              {/* Order pipeline sub-tabs */}
              <div className="flex gap-2 border-b border-line pb-3">
                {[
                  { id: 'new', label: 'New Orders', count: newOrdersCount, color: 'bg-violet-500' },
                  { id: 'ongoing', label: 'Ongoing Orders', count: ongoingOrdersCount, color: 'bg-primary' },
                  { id: 'completed', label: 'Completed Orders', count: completedOrdersCount, color: 'bg-green-600' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderPipelineTab(tab.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
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

              {isOrdersLoading ? (
                <div className="h-48 bg-surface border border-line rounded-3xl animate-pulse" />
              ) : filteredOrders.length > 0 ? (
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
                          <span className="text-muted font-semibold">{order.createdAt ? formatAppDate(order.createdAt) : ''}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          ['Delivered', 'Completed'].includes(order.status) ? 'bg-green-50 border-green-200 text-green-700' :
                          order.status === 'Placed' ? 'bg-violet-50 border-violet-200 text-violet-700 animate-pulse' :
                          'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>

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
                            <span className="font-bold text-main truncate">From: {order.pickupAddress?.street || 'Pickup'}</span>
                            <span className="text-[10px] text-gray-450 font-medium truncate">To: {order.address?.street || 'Destination'}</span>
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
                              {order.deliveryAgent.rating !== undefined && (
                                <span className="text-[9px] text-yellow-500 font-bold">★ {order.deliveryAgent.rating.toFixed(1)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted italic font-medium">Not Assigned Yet</span>
                          )}
                        </div>
                      </div>

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

                      {/* Review details */}
                      {order.review && (
                        <div className="bg-green-50/20 border border-green-100 rounded-2xl p-4 text-xs font-semibold text-green-955 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                className={`text-sm ${
                                  star <= order.review.rating ? 'text-yellow-500' : 'text-gray-300'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="text-[9px] text-green-700 font-bold bg-green-100/50 px-1.5 py-0.5 rounded-md ml-1.5 uppercase">Customer Rated</span>
                          </div>
                          {order.review.comment && (
                            <p className="text-[11px] text-gray-650 italic bg-surface/70 p-2.5 rounded-xl border border-green-100/10">
                              "{order.review.comment}"
                            </p>
                          )}
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
                        <div className="flex items-center gap-4 ml-auto">
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
                            <p className="text-base font-black text-gray-805">₹{Number(order.total || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center border border-line flex flex-col items-center justify-center gap-3">
                  <ShoppingBag className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">No orders in this pipeline</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Orders matching the selected date filters and status pipeline will render here.</p>
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
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Platform Global Parameters</h3>
              
              <form onSubmit={handleSaveSettings} className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Commission Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={platformSettings.commissionPercent}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, commissionPercent: parseFloat(e.target.value) })}
                        className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full"
                      />
                    </div>
                  </div>

                  <div className="col-span-full border border-line p-4 rounded-xl flex flex-col gap-3 mt-2">
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
                                value={platformSettings?.foodDeliveryPricing?.[tier]?.maxDistanceKm || defaults[idx].max}
                                onChange={(e) => setPlatformSettings({ ...platformSettings, foodDeliveryPricing: { ...platformSettings.foodDeliveryPricing, [tier]: { ...platformSettings.foodDeliveryPricing?.[tier], maxDistanceKm: parseFloat(e.target.value) } } })}
                                className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-muted">Tier {idx+1} Fee (₹)</label>
                              <input type="number" 
                                value={platformSettings?.foodDeliveryPricing?.[tier]?.fee || defaults[idx].fee}
                                onChange={(e) => setPlatformSettings({ ...platformSettings, foodDeliveryPricing: { ...platformSettings.foodDeliveryPricing, [tier]: { ...platformSettings.foodDeliveryPricing?.[tier], fee: parseFloat(e.target.value) } } })}
                                className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="col-span-full border border-line p-4 rounded-xl flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" />Ride Bike Pricing</h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {['tier1', 'tier2', 'tier3'].map((tier, idx) => (
                        <React.Fragment key={tier}>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Max (km)</label>
                            <input type="number" step="0.1"
                              value={platformSettings?.rideBikePricing?.[tier]?.maxDistanceKm || (idx===0?1.5:idx===1?2.5:9999)}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, rideBikePricing: { ...platformSettings.rideBikePricing, [tier]: { ...platformSettings.rideBikePricing?.[tier], maxDistanceKm: parseFloat(e.target.value) } } })}
                              className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Fee (₹)</label>
                            <input type="number" 
                              value={platformSettings?.rideBikePricing?.[tier]?.fee || (idx===0?20:idx===1?30:40)}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, rideBikePricing: { ...platformSettings.rideBikePricing, [tier]: { ...platformSettings.rideBikePricing?.[tier], fee: parseFloat(e.target.value) } } })}
                              className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                            />
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-full border border-line p-4 rounded-xl flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" />Ride Auto Pricing</h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {['tier1', 'tier2', 'tier3'].map((tier, idx) => (
                        <React.Fragment key={tier}>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Max (km)</label>
                            <input type="number" step="0.1"
                              value={platformSettings?.rideAutoPricing?.[tier]?.maxDistanceKm || (idx===0?1.5:idx===1?2.5:9999)}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, rideAutoPricing: { ...platformSettings.rideAutoPricing, [tier]: { ...platformSettings.rideAutoPricing?.[tier], maxDistanceKm: parseFloat(e.target.value) } } })}
                              className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted">T{idx+1} Fee (₹)</label>
                            <input type="number" 
                              value={platformSettings?.rideAutoPricing?.[tier]?.fee || (idx===0?35:idx===1?50:65)}
                              onChange={(e) => setPlatformSettings({ ...platformSettings, rideAutoPricing: { ...platformSettings.rideAutoPricing, [tier]: { ...platformSettings.rideAutoPricing?.[tier], fee: parseFloat(e.target.value) } } })}
                              className="bg-base border border-line-strong rounded-lg px-2 py-2 text-xs font-bold w-full"
                            />
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-full border border-line p-4 rounded-xl flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-main mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />Optional Surcharges</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['rain', 'lateNight', 'festival'].map((sc, idx) => {
                        const labels = { rain: 'Rain Charge', lateNight: 'Late Night Charge', festival: 'Festival Charge' };
                        const defaultFees = { rain: 10, lateNight: 20, festival: 15 };
                        const cur = platformSettings?.surcharges?.[sc] || { enabled: false, fee: defaultFees[sc] };
                        return (
                          <div key={sc} className="flex items-center gap-4 bg-base border border-line-strong rounded-lg p-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox"
                                checked={cur.enabled}
                                onChange={(e) => setPlatformSettings({ ...platformSettings, surcharges: { ...platformSettings.surcharges, [sc]: { ...cur, enabled: e.target.checked } } })}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-[11px] font-bold uppercase">{labels[sc]}</span>
                            </label>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-xs font-bold">₹</span>
                              <input type="number"
                                value={cur.fee}
                                onChange={(e) => setPlatformSettings({ ...platformSettings, surcharges: { ...platformSettings.surcharges, [sc]: { ...cur, fee: parseFloat(e.target.value) } } })}
                                className="bg-white border border-line-strong rounded-md px-2 py-1 text-xs font-bold w-16"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Platform Fee (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={platformSettings.platformFee ?? 5}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, platformFee: parseFloat(e.target.value) || 0 })}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 border-t border-line pt-4">
                  <input
                    type="checkbox"
                    id="isOpen"
                    checked={platformSettings.isOpen}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, isOpen: e.target.checked })}
                    className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="isOpen" className="text-xs text-muted font-bold cursor-pointer uppercase">
                    Ecosystem Ordering Active (Toggles platform shutdown / open)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSettingsSaving}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer shadow-md mt-2 disabled:opacity-50 w-full"
                >
                  {isSettingsSaving ? 'Saving parameters...' : 'Update Platform Parameters'}
                </button>
              </form>
            </div>
          )}

          {/* PROMO BANNERS TAB */}
          {activeSubTab === 'banners' && (
            <div className="flex flex-col gap-6">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Dynamic Promo Banners</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Uploader Form */}
                <div className="md:col-span-1 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-main">Add New Banner</h4>
                  <form onSubmit={handleAddBanner} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Banner Image File</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => setNewBannerFile(e.target.files[0])}
                        className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs text-main outline-none w-full font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Title / Alt Text</label>
                      <input
                        type="text"
                        required
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        placeholder="Weekend Bonanza..."
                        className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs text-main outline-none w-full font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Redirect Link (Optional)</label>
                      <input
                        type="text"
                        value={newBannerLink}
                        onChange={(e) => setNewBannerLink(e.target.value)}
                        placeholder="/restaurants"
                        className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs text-main outline-none w-full font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUploadingBanner}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 rounded-xl shadow-md disabled:opacity-50 mt-1 cursor-pointer"
                    >
                      {isUploadingBanner ? 'Adding...' : 'Publish Banner'}
                    </button>
                  </form>
                </div>

                {/* Active Banners Feed */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-main flex items-center justify-between">
                    Live Banners Feed
                    <span className="bg-violet-50 text-primary px-2 py-0.5 rounded-md text-[10px]">{banners.length} Total</span>
                  </h4>
                  
                  {isBannersLoading ? (
                    <div className="bg-surface rounded-3xl p-8 border border-line flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : banners.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {banners.map(banner => (
                        <div key={banner._id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col sm:flex-row gap-4 shadow-xs items-center">
                          <div className="w-full sm:w-48 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                            {!banner.active && (
                              <div className="absolute inset-0 bg-surface/60 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="bg-red-50 text-red-600 font-bold text-[10px] px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wider">Hidden</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-grow gap-1 w-full">
                            <h5 className="font-bold text-main text-sm line-clamp-1">{banner.title}</h5>
                            <p className="text-[10px] text-muted font-semibold mb-2">Link: {banner.link}</p>
                            <div className="flex gap-2 mt-auto">
                              <button
                                onClick={() => handleToggleBanner(banner._id)}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex-1 border transition-colors cursor-pointer ${
                                  banner.active ? 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100' : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                {banner.active ? 'Hide Banner' : 'Show Banner'}
                              </button>
                              <button
                                onClick={() => handleDeleteBanner(banner._id)}
                                className="text-[10px] font-bold px-3 py-1.5 rounded-lg flex-1 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface rounded-3xl p-10 text-center border border-line shadow-2xs">
                      <ImagePlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <h4 className="font-display font-extrabold text-sm text-main">No banners active</h4>
                      <p className="text-xs text-muted font-semibold mt-1 max-w-xs mx-auto">Upload beautiful promotional images to attract customers on the Home page.</p>
                    </div>
                  )}
                </div>
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

    </div>
  );
}
