import { API_BASE } from '../config/api';
import { io } from 'socket.io-client';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Store, Plus, Edit2, Trash2, ShoppingBag, DollarSign, List, Shield, Bell, Check, Tag, Clock, MapPin, X, ArrowUpRight, Calendar, ImagePlus, Pencil, AlertTriangle, ArrowLeft, FolderTree, FolderPlus, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../utils/uploadUtil';
import { formatAppDate, formatAppDateOnly } from '../utils/dateUtils';
import { getOrderFinancialBreakdown, formatCurrency, formatDistance, formatRating, getOrderPlacedAt, getOrderDeliveredAt } from '../utils/orderUtils';
import LocationPickerModal from '../components/LocationPickerModal';
import NotificationCenter from '../components/NotificationCenter';
import VegBadge from '../components/VegBadge';
import ImageUploadInput from '../components/common/ImageUploadInput';
import OrderDetailsModal from '../components/OrderDetailsModal';
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

export default function RestaurantDashboard() {
  const { user, token, logout } = useAuthStore();
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);
  const navigate = useNavigate();

  // ── Personal Edit Profile state ─────────────────────────────
  const [showEditPersonalProfile, setShowEditPersonalProfile] = useState(false);
  const [editPersonalName, setEditPersonalName] = useState('');
  const [editPersonalPhone, setEditPersonalPhone] = useState('');
  const [editPersonalEmail, setEditPersonalEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState('');
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalProfileError, setPersonalProfileError] = useState('');
  const [personalProfileSuccess, setPersonalProfileSuccess] = useState('');

  // ── Delete Account state ─────────────────────────────────────
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSavePersonalProfile = async (e) => {
    e.preventDefault();
    setPersonalProfileError(''); setPersonalProfileSuccess('');
    setIsSavingPersonal(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editPersonalName, phone: editPersonalPhone })
      });
      const data = await res.json();
      if (!res.ok) { setPersonalProfileError(data.message || 'Failed to update.'); return; }
      setPersonalProfileSuccess('Profile updated!');
      setTimeout(() => { setShowEditPersonalProfile(false); setPersonalProfileSuccess(''); window.location.reload(); }, 1200);
    } catch { setPersonalProfileError('Server error.'); }
    finally { setIsSavingPersonal(false); }
  };

  const handleSendEmailOtp = async () => {
    if (!editPersonalEmail || editPersonalEmail === user?.email) return;
    setEmailUpdateError(''); setEmailUpdateSuccess('');
    setIsSendingEmailOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-email-update-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newEmail: editPersonalEmail })
      });
      const data = await res.json();
      if (!res.ok) { setEmailUpdateError(data.message || 'Failed to send OTP.'); return; }
      setIsEmailOtpSent(true);
      setEmailUpdateSuccess('OTP sent to new email!');
    } catch { setEmailUpdateError('Server error.'); }
    finally { setIsSendingEmailOtp(false); }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp) return;
    setEmailUpdateError(''); setEmailUpdateSuccess('');
    setIsVerifyingEmailOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/update-email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ otp: emailOtp })
      });
      const data = await res.json();
      if (!res.ok) { setEmailUpdateError(data.message || 'Failed to verify OTP.'); return; }
      setEmailUpdateSuccess('Email updated successfully!');
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch { setEmailUpdateError('Server error.'); }
    finally { setIsVerifyingEmailOtp(false); }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.message || 'Failed to delete.'); return; }
      logout(); navigate('/');
    } catch { setDeleteError('Server error.'); }
    finally { setIsDeletingAccount(false); }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeSubTab, setActiveSubTabState] = useState(tabFromUrl || 'orders');

  useEffect(() => {
    if (tabFromUrl && ['orders', 'menu', 'hours', 'offers', 'profile', 'kyc', 'reviews'].includes(tabFromUrl)) {
      setActiveSubTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const setActiveSubTab = (tab) => {
    setActiveSubTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };
  
  // Dashboard Metrics
  const [metrics, setMetrics] = useState(null);
  const [weeklySales, setWeeklySales] = useState([]);
  
  // Menu Management
  const [menuItems, setMenuItems] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuSubTab, setMenuSubTab] = useState('items'); // 'items' or 'categories'
  const [menuCategories, setMenuCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catFoodType, setCatFoodType] = useState('both');
  const [catDisplayOrder, setCatDisplayOrder] = useState(1);
  const [catIsActive, setCatIsActive] = useState(true);
  const [catModalError, setCatModalError] = useState('');
  const [isCatSaving, setIsCatSaving] = useState(false);

  // Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Main Course');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemImageFile, setItemImageFile] = useState(null);
  const [itemDesc, setItemDesc] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemAvailabilityMode, setItemAvailabilityMode] = useState('restaurant_hours');
  const [itemAvailableFrom, setItemAvailableFrom] = useState('09:00');
  const [itemAvailableTo, setItemAvailableTo] = useState('23:00');
  const [itemModalError, setItemModalError] = useState('');
  const [isItemSaving, setIsItemSaving] = useState(false);

  // Opening Hours Management
  const [openingHours, setOpeningHours] = useState(DEFAULT_OPENING_HOURS);
  const [isHoursSaving, setIsHoursSaving] = useState(false);
  const [hoursSuccessMsg, setHoursSuccessMsg] = useState('');
  const [bulkOpenTime, setBulkOpenTime] = useState('09:00');
  const [bulkCloseTime, setBulkCloseTime] = useState('23:00');
  
  // Orders Management
  const [orders, setOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const rejectionOptions = ["Item unavailable", "Restaurant too busy", "Kitchen unavailable", "Delivery issue", "Restaurant temporarily unavailable", "Other"];
  
  // Orders Pipeline sub-tabs and Date filtering
  const [orderPipelineTab, setOrderPipelineTab] = useState('new'); // 'new', 'ongoing', 'completed'

  // Global History Filter for Restaurant
  const historyFilter = useHistoryFilter(orders, {
    dateKey: 'createdAt'
  });
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  const handleClearRestaurantHistory = async () => {
    const res = await fetch(`${API_BASE}/restaurant-partner/orders/history`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to clear restaurant order history');
    }
    setOrders(prev => prev.filter(o => !['Delivered', 'Completed', 'Rejected', 'Cancelled'].includes(o.status)));
  };

  // Profile Management
  const [restaurantProfile, setRestaurantProfile] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileAddress, setProfileAddress] = useState('');
  const [profileLat, setProfileLat] = useState(null);
  const [profileLng, setProfileLng] = useState(null);
  const [profileTime, setProfileTime] = useState(30);
  const [profileVeg, setProfileVeg] = useState(false);
  const [profileClosed, setProfileClosed] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Location picker for restaurant address
  const [showRestaurantLocationPicker, setShowRestaurantLocationPicker] = useState(false);

  // Local Coupons/Offers
  const [offers, setOffers] = useState([]);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState('');
  const [newOfferMinAmount, setNewOfferMinAmount] = useState('150');
  const [newOfferItemId, setNewOfferItemId] = useState('');

  // KYC
  const [kycDocType, setKycDocType] = useState('GSTIN');
  const [kycDocNum, setKycDocNum] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'restaurant') {
      navigate('/login');
      return;
    }
    fetchMetrics();
    fetchMenu();
    fetchMenuCategories();
    fetchOrders();
    fetchProfile();

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socket.on('orderStatusChanged', (data) => {
      if (data && data.order) {
        setOrders(prev => {
          const exists = prev.find(o => o._id === data.orderId);
          if (exists) {
            return prev.map(o => o._id === data.orderId ? { ...o, ...data.order } : o);
          }
          fetchOrders();
          return prev;
        });
      } else {
        fetchOrders();
      }
      fetchMetrics();
    });
    const interval = setInterval(() => {
      fetchOrders();
      fetchMetrics();
    }, 10000);
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [token, user, navigate]);


  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setWeeklySales(data.weeklySales);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getIncomeBreakdown = (ordersList) => {
    let upi = 0;
    let card = 0;
    let cod = 0;
    ordersList.forEach(order => {
      const fin = getOrderFinancialBreakdown(order);
      const amount = fin.restaurant.restaurantPayable;
      const method = order.paymentDetails?.method || 'COD';
      if (method === 'UPI') upi += amount;
      else if (method === 'Card') card += amount;
      else if (method === 'COD') cod += amount;
    });
    return { upi, card, cod, total: upi + card + cod };
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/menu`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMenuLoading(false);
    }
  };

  const fetchMenuCategories = async () => {
    try {
      setIsCategoriesLoading(true);
      const res = await fetch(`${API_BASE}/restaurant-partner/menu-categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMenuCategories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRestaurantProfile(data);
        setProfileName(data.name || '');
        setProfileImage(data.image || '');
        setProfileAddress(data.address || '');
        setProfileLat(data.lat || null);
        setProfileLng(data.lng || null);
        setProfileTime(data.deliveryTime || 30);
        setProfileVeg(data.isPureVeg || false);
        setProfileClosed(data.isClosed || false);
        setOffers(data.offers || []);
        if (data.openingHours) {
          setOpeningHours(normalizeOpeningHours(data.openingHours));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Opening Hours actions
  const handleSaveOpeningHours = async (e) => {
    if (e) e.preventDefault();
    setIsHoursSaving(true);
    setHoursSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          openingHours
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setRestaurantProfile(updated);
        setOpeningHours(normalizeOpeningHours(updated.openingHours));
        setHoursSuccessMsg('Opening hours saved successfully!');
        setTimeout(() => setHoursSuccessMsg(''), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to save opening hours');
      }
    } catch (err) {
      console.error(err);
      alert('Server error saving opening hours');
    } finally {
      setIsHoursSaving(false);
    }
  };

  const handleApplyAllDays = () => {
    const updated = {};
    DAYS_OF_WEEK.forEach(day => {
      updated[day] = {
        enabled: true,
        open: bulkOpenTime || '09:00',
        close: bulkCloseTime || '23:00'
      };
    });
    setOpeningHours(updated);
  };

  // ── Category Actions ─────────────────────────────────────────
  const handleOpenCategoryModal = (category = null) => {
    setCatModalError('');
    if (category) {
      setEditingCategory(category);
      setCatName(category.name || '');
      setCatFoodType(category.foodType || 'both');
      setCatDisplayOrder(category.displayOrder !== undefined ? category.displayOrder : 1);
      setCatIsActive(category.isActive !== false);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatFoodType('both');
      setCatDisplayOrder(menuCategories.length + 1);
      setCatIsActive(true);
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setCatModalError('');
    if (!catName.trim()) {
      setCatModalError('Please enter a category name.');
      return;
    }
    setIsCatSaving(true);
    const payload = {
      name: catName.trim(),
      foodType: catFoodType,
      displayOrder: Number(catDisplayOrder) || 0,
      isActive: catIsActive
    };
    try {
      const url = editingCategory
        ? `${API_BASE}/restaurant-partner/menu-categories/${editingCategory._id}`
        : `${API_BASE}/restaurant-partner/menu-categories`;
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setCatModalError(data.message || 'Failed to save category.');
        return;
      }
      setShowCategoryModal(false);
      fetchMenuCategories();
      fetchMenu();
    } catch (err) {
      setCatModalError(err.message || 'Server error saving category.');
    } finally {
      setIsCatSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if ((category.itemsCount || 0) > 0) {
      alert('This category contains menu items. Move or reassign those items before deleting the category.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/menu-categories/${category._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to delete category');
        return;
      }
      fetchMenuCategories();
      fetchMenu();
    } catch (err) {
      console.error(err);
      alert('Server error deleting category');
    }
  };

  const handleToggleCategoryStatus = async (category) => {
    const newStatus = category.isActive === false ? true : false;
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/menu-categories/${category._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setMenuCategories(prev => prev.map(c => c._id === category._id ? { ...c, isActive: updated.isActive } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Add / Edit Menu Item ──────────────────────────────────────
  const handleOpenItemModal = (item = null) => {
    setItemModalError('');
    if (item) {
      setEditingItem(item);
      setItemName(item.name || '');
      setItemPrice(item.price || '');
      setItemCategory(item.category || (menuCategories[0]?.name || 'Main Course'));
      setItemCategoryId(item.categoryId || (menuCategories.find(c => c.name === item.category)?._id || ''));
      setItemImage(item.image || '');
      setItemImageFile(null);
      setItemDesc(item.description || '');
      setItemIsVeg(item.isVeg !== false);
      setItemIsAvailable(item.isAvailable !== false);
      setItemAvailabilityMode(item.availabilityMode || 'restaurant_hours');
      setItemAvailableFrom(item.availableFrom || '09:00');
      setItemAvailableTo(item.availableTo || '23:00');
    } else {
      setEditingItem(null);
      setItemName('');
      setItemPrice('');
      const defaultCat = menuCategories[0];
      setItemCategory(defaultCat?.name || 'Main Course');
      setItemCategoryId(defaultCat?._id || '');
      setItemImage('');
      setItemImageFile(null);
      setItemDesc('');
      setItemIsVeg(true);
      setItemIsAvailable(true);
      setItemAvailabilityMode('restaurant_hours');
      setItemAvailableFrom('09:00');
      setItemAvailableTo('23:00');
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setItemModalError('');
    if (!itemName.trim() || !itemPrice) {
      setItemModalError('Please enter the dish name and price.');
      return;
    }
    if (!itemImage.trim() && !itemImageFile) {
      setItemModalError('Please choose an image file or provide an Image URL.');
      return;
    }

    setIsItemSaving(true);
    let finalImageUrl = (itemImage || '').trim();
    if (itemImageFile) {
      try {
        finalImageUrl = await uploadFileToBackend(itemImageFile);
      } catch (err) {
        setIsItemSaving(false);
        setItemModalError(err.message || 'Image upload failed.');
        return;
      }
    }

    const payload = {
      name: itemName.trim(),
      price: parseFloat(itemPrice),
      category: itemCategory,
      categoryId: itemCategoryId || undefined,
      image: finalImageUrl,
      description: itemDesc.trim(),
      isVeg: itemIsVeg,
      isAvailable: itemIsAvailable,
      availabilityMode: itemAvailabilityMode,
      availableFrom: itemAvailableFrom || '09:00',
      availableTo: itemAvailableTo || '23:00'
    };

    try {
      const url = editingItem 
        ? `${API_BASE}/restaurant-partner/menu/${editingItem._id}`
        : `${API_BASE}/restaurant-partner/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setItemModalError(data.message || 'Failed to save menu item.');
        return;
      }

      setShowItemModal(false);
      setItemImageFile(null);
      fetchMenu();
      fetchMenuCategories();
      fetchMetrics();
    } catch (err) {
      setItemModalError(err.message || 'Server error saving menu item.');
    } finally {
      setIsItemSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/menu/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMenuItems(prev => prev.filter(i => i._id !== itemId));
        fetchMenuCategories();
        fetchMetrics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Order Status update
  const handleUpdateOrderStatus = async (orderId, nextStatus, reason = null) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus, rejectionReason: reason })
      });
      if (res.ok) {
        // Always re-fetch from the restaurant-isolated endpoint so we never
        // splice the raw unified Order document (which contains supplier items)
        // into the restaurant's order list.
        fetchOrders();
        fetchMetrics();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('[RESTAURANT] Order status update failed:', errData.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsProfileSaving(true);
    
    // Validate missing or dummy coordinates
    if (!profileLat || !profileLng || (Number(profileLat) === 19.076 && Number(profileLng) === 72.8777)) {
      setIsProfileSaving(false);
      return alert("Please update your exact location using the map before saving.");
    }

    let finalProfileImageUrl = (profileImage || '').trim();
    if (profileImageFile) {
      try {
        finalProfileImageUrl = await uploadFileToBackend(profileImageFile);
      } catch (err) {
        setIsProfileSaving(false);
        return alert(err.message || 'Cover image upload failed');
      }
    }
    if (!finalProfileImageUrl && restaurantProfile?.image) {
      finalProfileImageUrl = restaurantProfile.image;
    }

    try {
      const payload = {
        name: profileName,
        address: profileAddress,
        deliveryTime: parseInt(profileTime),
        isPureVeg: profileVeg,
        isClosed: profileClosed,
      };
      if (finalProfileImageUrl) {
        payload.image = finalProfileImageUrl;
      }
      if (profileLat !== null) payload.lat = profileLat;
      if (profileLng !== null) payload.lng = profileLng;

      const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setRestaurantProfile(updated);
        setProfileClosed(updated.isClosed || false);
        alert('Restaurant profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Submit KYC
  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    if (!kycDocNum) return;
    setKycSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentType: kycDocType,
          documentNumber: kycDocNum
        })
      });
      if (res.ok) {
        alert('KYC documents submitted. Approval pending admin review.');
        // Force refresh user role state locally or window reload to sync
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKycSubmitting(false);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newOfferCode || !newOfferDiscount) return;

    let applicableItemName = '';
    if (newOfferItemId) {
      const selectedItem = menuItems.find(i => String(i._id) === String(newOfferItemId));
      if (selectedItem) {
        applicableItemName = selectedItem.name;
      }
    }

    const newOffer = {
      code: newOfferCode.toUpperCase().trim(),
      discount: parseFloat(newOfferDiscount),
      minAmount: parseFloat(newOfferMinAmount || 0),
      applicableItemId: newOfferItemId || '',
      applicableItemName: applicableItemName,
      active: true
    };

    const updatedOffers = [...offers, newOffer];

    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          offers: updatedOffers
        })
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        setRestaurantProfile(updatedProfile);
        setOffers(updatedProfile.offers || []);
        setNewOfferCode('');
        setNewOfferDiscount('');
        setNewOfferMinAmount('150');
        setNewOfferItemId('');
        alert('Promo code created successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (offerCode) => {
    if (!window.confirm(`Delete coupon "${offerCode}"?`)) return;
    const updatedOffers = offers.filter(o => o.code !== offerCode);

    try {
      const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          offers: updatedOffers
        })
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        setRestaurantProfile(updatedProfile);
        setOffers(updatedProfile.offers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNextStatusText = (status) => {
    if (status === 'Placed') return { next: 'Accepted', label: 'Accept Order' };
    if (status === 'Accepted') return { next: 'Preparing', label: 'Start Cooking' };
    if (status === 'Preparing') return { next: 'Ready_for_Pickup', label: 'Mark Ready for Pickup' };
    return null;
  };

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

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleString('default', { month: 'long' });

    // Build a set of days in this month that have orders (for dot indicators)
    const daysWithOrders = new Set();
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        daysWithOrders.add(d.getDate());
      }
    });

    const handleDayClick = (day) => {
      // Build a YYYY-MM-DD string for the clicked date
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;

      setDateFilterType('custom');
      if (!customStartDate || (customStartDate && customEndDate)) {
        // Start a fresh range
        setCustomStartDate(dateStr);
        setCustomEndDate('');
      } else {
        // Second click — set end date (ensure start <= end)
        if (dateStr >= customStartDate) {
          setCustomEndDate(dateStr);
        } else {
          setCustomEndDate(customStartDate);
          setCustomStartDate(dateStr);
        }
      }
    };

    const dayCells = [];
    for (let i = 0; i < firstDay; i++) {
      dayCells.push(<div key={`empty-${i}`} className="w-6 h-6" />);
    }
    for (let d = 1; d <= totalDays; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const isStart = dateStr === customStartDate;
      const isEnd = dateStr === customEndDate;
      const inRange = customStartDate && customEndDate && dateStr >= customStartDate && dateStr <= customEndDate;
      const hasOrder = daysWithOrders.has(d);
      const isToday = d === now.getDate();

      dayCells.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDayClick(d)}
          className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer relative
            ${ isStart || isEnd ? 'bg-primary text-white shadow-sm' :
               inRange ? 'bg-primary/15 text-primary' :
               isToday ? 'ring-1 ring-primary text-primary' :
               'hover:bg-violet-50 hover:text-primary text-main' }`}
        >
          {d}
          {hasOrder && !isStart && !isEnd && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
          )}
        </button>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 border border-line p-2.5 rounded-2xl bg-base/50">
        <h4 className="text-center font-display font-black text-xs text-primary">{monthName} {year}</h4>
        <div className="grid grid-cols-7 gap-0.5 text-[9px] font-bold text-muted text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-gray-650 text-center">
          {dayCells}
        </div>
        {customStartDate && (
          <p className="text-[9px] text-center text-primary font-bold mt-0.5">
            {customStartDate}{customEndDate ? ` → ${customEndDate}` : ' → pick end date'}
          </p>
        )}
      </div>
    );
  };

  const dateFilteredOrders = historyFilter.filteredItems;

  const newOrdersCount = dateFilteredOrders.filter(o => o.status === 'Placed').length;
  const ongoingOrdersCount = dateFilteredOrders.filter(o => ['Accepted', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer', 'Confirmed', 'Out for Delivery'].includes(o.status)).length;
  const completedOrdersCount = dateFilteredOrders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length;
  const rejectedOrdersCount = dateFilteredOrders.filter(o => ['Rejected', 'Cancelled'].includes(o.status)).length;

  const filteredOrders = dateFilteredOrders.filter(o => {
    if (orderPipelineTab === 'new') return o.status === 'Placed';
    if (orderPipelineTab === 'ongoing') return ['Accepted', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer', 'Confirmed', 'Out for Delivery'].includes(o.status);
    if (orderPipelineTab === 'completed') return ['Delivered', 'Completed'].includes(o.status);
    if (orderPipelineTab === 'rejected') return ['Rejected', 'Cancelled'].includes(o.status);
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full mt-4">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          {/* Back button returning to Restaurants Home / Listing */}
          <button
            type="button"
            onClick={() => navigate('/restaurants')}
            title="Back to Restaurants Home"
            className="w-11 h-11 rounded-2xl border border-line bg-surface hover:bg-base text-main transition-colors flex items-center justify-center cursor-pointer shadow-3xs flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-main" />
          </button>

          {restaurantProfile?.image ? (
            <img src={getImageUrl(restaurantProfile.image, 'restaurant')} alt="Restaurant Cover" onError={(e) => handleImageError(e, 'restaurant')} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-line flex-shrink-0" />
          ) : (
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl flex-shrink-0">
              <Store className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="font-display font-black text-2xl text-main leading-tight">
              {restaurantProfile?.name || 'Restaurant Panel'}
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">Manage and scale your digital kitchen operations</p>
          </div>
        </div>

        {/* Quick Toggles container */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Kitchen Status Toggle */}
          {restaurantProfile && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted font-bold uppercase">Kitchen Status</span>
              <button
                onClick={async () => {
                  const newClosedVal = !restaurantProfile.isClosed;
                  try {
                    const res = await fetch(`${API_BASE}/restaurant-partner/profile`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ isClosed: newClosedVal })
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setRestaurantProfile(updated);
                      setProfileClosed(updated.isClosed || false);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={`text-[10px] font-extrabold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                  restaurantProfile.isClosed
                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
              >
                {restaurantProfile.isClosed ? '🔴 Closed' : '🟢 Open'}
              </button>
            </div>
          )}

          {/* Notification Center Bell */}
          <NotificationCenter role="restaurant" userId={user?._id} restaurantId={restaurantProfile?._id} />

          {/* KYC Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-bold uppercase">KYC status</span>
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
              user?.kycStatus === 'Approved' ? 'bg-green-50 border-green-200 text-green-700' :
              user?.kycStatus === 'Pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              {user?.kycStatus || 'Not Submitted'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Info widgets */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Gross Sales</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{formatCurrency(metrics.totalSales)}</span>
              <span className="p-1 bg-green-50 text-green-600 rounded-md text-[9px] font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> 15%
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <div>
              <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Net Earnings</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-xl font-black text-main">{formatCurrency(metrics.netEarnings)}</span>
                <span className="p-1 bg-primary/10 text-primary rounded-md text-[9px] font-bold">85% Split</span>
              </div>
            </div>
            <div className="border-t border-line pt-2.5 mt-2.5 text-[10px] font-bold text-muted flex flex-col gap-1">
              <div className="flex justify-between">
                <span>UPI:</span>
                <span>{formatCurrency(getIncomeBreakdown(dateFilteredOrders).upi)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card:</span>
                <span>{formatCurrency(getIncomeBreakdown(dateFilteredOrders).card)}</span>
              </div>
              <div className="flex justify-between">
                <span>COD:</span>
                <span>{formatCurrency(getIncomeBreakdown(dateFilteredOrders).cod)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-line-strong pt-1 mt-0.5 font-extrabold text-primary">
                <span>Sum (Net):</span>
                <span>{formatCurrency(getIncomeBreakdown(dateFilteredOrders).total)}</span>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Kitchen Orders</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{metrics.ordersCount} Total</span>
              <span className="text-[10px] font-bold text-muted">{metrics.activeOrders} Active</span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Dishes listed</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{metrics.menuItemsCount} Items</span>
              <button onClick={() => handleOpenItemModal(null)} className="p-1 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-xs">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Column: Vertical sidebar navigation on desktop (mobile uses fixed bottom navigation bar) */}
        <div className="hidden lg:flex lg:col-span-1 bg-surface border border-line shadow-2xs p-2 rounded-3xl flex-col gap-1.5">
          {[
            { id: 'orders', label: 'Order Pipeline', icon: ShoppingBag, badge: orders.filter(o => !['Delivered', 'Completed', 'Cancelled'].includes(o.status)).length },
            { id: 'menu', label: 'Menu & Food Items', icon: List, badge: menuItems.length },
            { id: 'hours', label: 'Opening Hours', icon: Clock },
            { id: 'offers', label: 'Discounts & Offers', icon: Tag },
            { id: 'profile', label: 'Kitchen Profile', icon: Store },
            { id: 'kyc', label: 'KYC Document Verification', icon: Shield },
            { id: 'reviews', label: 'Ratings & Reviews', icon: Star, badge: orders.filter(o => Number(o.review?.rating) > 0).length }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-shrink-0 lg:w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left font-bold text-xs transition-all cursor-pointer ${
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
                  <span className={`text-[9px] px-1.8 py-0.5 rounded-full font-black ${active ? 'bg-surface text-primary' : 'bg-primary text-white animate-pulse'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Columns: Tab Body Panels */}
        <div className="lg:col-span-3">
          
          {/* ORDERS TAB */}
          {activeSubTab === 'orders' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-2">
                <h3 className="font-display font-extrabold text-base text-main">Order Pipeline</h3>
              </div>

              {/* Global History Filter Toolbar */}
              <HistoryFilterToolbar
                dateLabel={historyFilter.dateLabel}
                isFiltered={historyFilter.isFiltered}
                onOpenCalendar={() => setShowCalendarModal(true)}
                onReset={historyFilter.resetFilters}
                onClearHistory={() => setShowClearHistoryModal(true)}
                clearHistoryLabel="Clear All Order History"
                availableYears={historyFilter.availableYears}
                selectedYear={historyFilter.dateFilter.type === 'year' ? historyFilter.dateFilter.year : null}
                onSelectYear={(yr) => (yr ? historyFilter.selectYear(yr) : historyFilter.resetFilters())}
                totalCount={orders.length}
                filteredCount={historyFilter.filteredItems.length}
              />

              {/* Order pipeline sub-tabs */}
              <div className="flex gap-2 border-b border-line pb-3 overflow-x-auto no-scrollbar scroll-smooth">
                {[
                  { id: 'new', label: 'New Orders', count: newOrdersCount, color: 'bg-violet-500' },
                  { id: 'ongoing', label: 'Ongoing Orders', count: ongoingOrdersCount, color: 'bg-primary' },
                  { id: 'completed', label: 'Completed Orders', count: completedOrdersCount, color: 'bg-green-600' },
                  { id: 'rejected', label: 'Rejected/Cancelled', count: rejectedOrdersCount, color: 'bg-red-500' }
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

              {isOrdersLoading ? (
                <div className="h-48 skeleton rounded-3xl" />
              ) : filteredOrders.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {filteredOrders.map(order => {
                    const action = getNextStatusText(order.status);
                    return (
                      <div key={order._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-3 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-muted">#{order._id.substr(-8).toUpperCase()}</span>
                            <span className="text-[10px] text-muted font-semibold ml-2">
                              • Placed: {formatAppDate(getOrderPlacedAt(order))}
                              {['Delivered', 'Completed'].includes(order.status) && (
                                <span className="ml-2 font-bold text-green-700">
                                  • Delivered: {getOrderDeliveredAt(order) ? formatAppDate(getOrderDeliveredAt(order)) : 'Delivery time unavailable'}
                                </span>
                              )}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            ['Delivered', 'Completed'].includes(order.status) ? 'bg-green-100 text-green-700 border border-green-200' : 
                            ['Rejected', 'Cancelled'].includes(order.status) ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-violet-100 text-violet-700 animate-pulse border border-violet-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* List items */}
                        <div className="flex flex-col gap-1.5 py-1">
                          {order.items.map((item, idx) => {
                            const unitPrice = parseFloat(item.price) || 0;
                            const qty = parseInt(item.quantity, 10) || 1;
                            const lineTotal = unitPrice * qty;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs font-bold text-main gap-2">
                                <span className="truncate">{item.name}</span>
                                <span className="text-muted font-medium shrink-0">Qty: {qty} × {formatCurrency(unitPrice)} = {formatCurrency(lineTotal)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Review details */}
                        {Number(order.review?.rating) > 0 && (
                          <div className="bg-green-50/20 border border-green-100 rounded-2xl p-4 text-xs font-semibold text-green-955 flex flex-col gap-1.5 my-1.5">
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
                              <p className="text-[11px] text-gray-655 italic bg-surface/70 p-2.5 rounded-xl border border-green-100/10">
                                "{order.review.comment}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {order.status === 'Rejected' && order.rejectionReason && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3 my-1.5">
                            <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider mb-0.5">Rejection Reason:</p>
                            <p className="text-xs text-red-900 font-semibold">{order.rejectionReason}</p>
                          </div>
                        )}

                        <div className="border-t border-line pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          {(() => {
                            const fin = getOrderFinancialBreakdown(order);
                            const rFin = fin.restaurant.byRestaurant.find(r => String(r.restaurantId) === String(user?.restaurantId));
                            const restPayable = rFin ? rFin.restaurantPayable : fin.restaurant.restaurantPayable;
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-primary">Payable to Restaurant: {formatCurrency(restPayable)}</span>
                              </div>
                            );
                          })()}
                          
                          {/* Accept/Advance Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 items-center">
                            <button
                              onClick={() => setSelectedDetailsOrder(order)}
                              className="bg-base hover:bg-gray-100 text-main border border-line text-[10px] font-bold px-3 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Details</span>
                            </button>
                            {order.status === 'Placed' && (
                              <button
                                onClick={() => setRejectingOrderId(order._id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Reject Order</span>
                              </button>
                            )}
                            {action ? (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, action.next)}
                                disabled={updatingOrderId === order._id}
                                className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{action.label}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-muted flex items-center gap-1">
                                <Check className="w-4 h-4 text-green-600" /> {order.status === 'Out for Delivery' ? 'Handed Over to Rider (Out for Delivery)' : 'Finished & Handed Over'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <HistoryEmptyState
                  dateLabel={historyFilter.dateLabel}
                  onReset={historyFilter.resetFilters}
                  message="No matching orders found"
                  description="There are no orders matching your current date filter and pipeline selection."
                />
              )}
            </div>
          )}

          {/* MENU MANAGEMENT TAB */}
          {activeSubTab === 'menu' && (
            <div className="flex flex-col gap-5">
              {/* Menu Sub-navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex items-center gap-1.5 bg-base p-1 rounded-2xl border border-line w-fit">
                  <button
                    type="button"
                    onClick={() => setMenuSubTab('items')}
                    className={`px-3.5 py-1.8 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      menuSubTab === 'items'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-main hover:bg-surface'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Menu Items</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                      menuSubTab === 'items' ? 'bg-white/20 text-white' : 'bg-surface text-muted border border-line'
                    }`}>
                      {menuItems.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuSubTab('categories')}
                    className={`px-3.5 py-1.8 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      menuSubTab === 'categories'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-main hover:bg-surface'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Categories</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                      menuSubTab === 'categories' ? 'bg-white/20 text-white' : 'bg-surface text-muted border border-line'
                    }`}>
                      {menuCategories.length}
                    </span>
                  </button>
                </div>

                {menuSubTab === 'items' ? (
                  <button
                    onClick={() => handleOpenItemModal(null)}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 w-fit"
                  >
                    <Plus className="w-4 h-4" /> Add Food Item
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCategoryModal(null)}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 w-fit"
                  >
                    <FolderPlus className="w-4 h-4" /> Add Category
                  </button>
                )}
              </div>

              {/* ── SUB-VIEW 1: MENU ITEMS ── */}
              {menuSubTab === 'items' && (
                <div className="flex flex-col gap-4">
                  {isMenuLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-24 skeleton rounded-3xl" />
                      <div className="h-24 skeleton rounded-3xl" />
                    </div>
                  ) : menuItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menuItems.map(item => (
                        <div key={item._id} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex gap-3 relative group">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-base flex-shrink-0">
                            <img src={getImageUrl(item.image, 'food')} alt={item.name} onError={(e) => handleImageError(e, 'food')} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-grow pr-12">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <VegBadge isVeg={item.isVeg} size="xs" />
                              <h4 className="text-xs font-bold text-main line-clamp-1">{item.name}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-primary font-black">₹{item.price}</span>
                              {item.category && (
                                <span className="text-[9px] font-bold text-muted bg-base px-2 py-0.5 rounded-md border border-line">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-muted line-clamp-2 mt-0.5 font-medium leading-tight">{item.description || 'No description provided.'}</p>
                            
                            {/* Quick Availability Toggler & Timing badge */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <button
                                onClick={async () => {
                                  const newAvail = item.isAvailable === false ? true : false;
                                  try {
                                    const res = await fetch(`${API_BASE}/restaurant-partner/menu/${item._id}`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ isAvailable: newAvail })
                                    });
                                    if (res.ok) {
                                      const updated = await res.json();
                                      setMenuItems(prev => prev.map(i => i._id === item._id ? updated : i));
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                  item.isAvailable !== false
                                    ? 'bg-green-50 border-green-150 text-green-700 hover:bg-green-100'
                                    : 'bg-base border-line-strong text-muted hover:bg-gray-100'
                                }`}
                              >
                                {item.isAvailable !== false ? '🟢 Available' : '🔴 Out of Stock'}
                              </button>

                              <span className="text-[8px] font-bold px-2 py-0.5 rounded-md bg-base border border-line text-muted">
                                🕒 {item.availabilityMode === 'custom'
                                  ? `${formatTime12(item.availableFrom)} – ${formatTime12(item.availableTo)}`
                                  : 'All Restaurant Hours'}
                              </span>
                            </div>
                          </div>
                          
                          {/* CRUD Buttons */}
                          <div className="absolute right-3 top-3 flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="p-1.5 bg-base hover:bg-primary-light hover:text-primary rounded-lg text-muted cursor-pointer"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="p-1.5 bg-base hover:bg-red-50 hover:text-red-500 rounded-lg text-muted cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface rounded-3xl p-14 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                      <List className="w-12 h-12 text-gray-300" />
                      <h4 className="font-display font-extrabold text-sm text-main">No dishes listed yet</h4>
                      <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Click "Add Food Item" above to fill your digital kitchen menu card!</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── SUB-VIEW 2: CATEGORIES MANAGEMENT ── */}
              {menuSubTab === 'categories' && (
                <div className="flex flex-col gap-4">
                  {isCategoriesLoading ? (
                    <div className="flex flex-col gap-3">
                      <div className="h-16 skeleton rounded-2xl" />
                      <div className="h-16 skeleton rounded-2xl" />
                      <div className="h-16 skeleton rounded-2xl" />
                    </div>
                  ) : menuCategories.length > 0 ? (
                    <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-base border-b border-line text-[10px] uppercase font-extrabold text-muted">
                              <th className="py-3 px-4 w-12 text-center">#</th>
                              <th className="py-3 px-4">Category Name</th>
                              <th className="py-3 px-4">Food Type</th>
                              <th className="py-3 px-4 text-center">Items Assigned</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-center">Display Order</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {menuCategories.map((cat, idx) => (
                              <tr key={cat._id} className="hover:bg-base/50 transition-colors">
                                <td className="py-3.5 px-4 text-center font-black text-muted text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4 font-extrabold text-main">
                                  <div className="flex items-center gap-2">
                                    <span>{cat.name}</span>
                                    {cat.isActive === false && (
                                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                        Hidden from customer
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {cat.foodType === 'veg' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Veg Only
                                    </span>
                                  ) : cat.foodType === 'nonVeg' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Non-Veg Only
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Both (Veg & Non-Veg)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-muted">
                                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border ${
                                    (cat.itemsCount || 0) > 0
                                      ? 'bg-primary/10 text-primary border-primary/20'
                                      : 'bg-base text-muted border-line'
                                  }`}>
                                    {cat.itemsCount || 0} items
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCategoryStatus(cat)}
                                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                      cat.isActive !== false
                                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                        : 'bg-gray-100 border-gray-250 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {cat.isActive !== false ? '🟢 Active' : '⚪ Inactive'}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 text-center font-black text-main">
                                  {cat.displayOrder ?? idx + 1}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCategoryModal(cat)}
                                      className="p-1.5 bg-base hover:bg-primary-light hover:text-primary rounded-lg text-muted transition-colors cursor-pointer"
                                      title="Edit Category"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        (cat.itemsCount || 0) > 0
                                          ? 'bg-base text-gray-300 hover:text-gray-400'
                                          : 'bg-base hover:bg-red-50 hover:text-red-500 text-muted'
                                      }`}
                                      title={(cat.itemsCount || 0) > 0 ? "Cannot delete category containing menu items" : "Delete Category"}
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
                    </div>
                  ) : (
                    <div className="bg-surface rounded-3xl p-14 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                      <FolderTree className="w-12 h-12 text-gray-300" />
                      <h4 className="font-display font-extrabold text-sm text-main">No custom categories created</h4>
                      <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Organize your dishes with custom categories like Biryanis, Starters, Beverages, or Breads!</p>
                      <button
                        onClick={() => handleOpenCategoryModal(null)}
                        className="mt-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Create First Category
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPENING HOURS TAB */}
          {activeSubTab === 'hours' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-line pb-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-main">Opening Hours</h3>
                  <p className="text-xs text-muted font-medium mt-0.5">Configure your restaurant's operating schedule for each weekday</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveOpeningHours}
                  disabled={isHoursSaving}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 w-fit"
                >
                  <Clock className="w-4 h-4" /> {isHoursSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {hoursSuccessMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> {hoursSuccessMsg}
                </div>
              )}

              {/* Quick Apply to All Days Bar */}
              <div className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-main">Quick Fill: Apply to All Days</span>
                  <span className="text-[11px] text-muted font-medium">Set time once and copy to all 7 days</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-base border border-line-strong rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-muted">Open:</span>
                    <input
                      type="time"
                      value={bulkOpenTime}
                      onChange={(e) => setBulkOpenTime(e.target.value)}
                      className="bg-transparent text-xs font-bold text-main outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-base border border-line-strong rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-muted">Close:</span>
                    <input
                      type="time"
                      value={bulkCloseTime}
                      onChange={(e) => setBulkCloseTime(e.target.value)}
                      className="bg-transparent text-xs font-bold text-main outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAllDays}
                    className="bg-violet-100 hover:bg-violet-200 text-primary text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Apply to All Days
                  </button>
                </div>
              </div>

              {/* Weekly Schedule List */}
              <div className="bg-surface border border-line rounded-3xl shadow-2xs p-6 flex flex-col gap-4">
                <h4 className="font-display font-black text-sm text-main uppercase tracking-wider">Weekly Schedule</h4>
                
                <div className="flex flex-col divide-y divide-line">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const dayConfig = openingHours[day] || { enabled: true, open: '09:00', close: '23:00' };
                    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                    const isOvernight = parseTimeToMinutes(dayConfig.open) > parseTimeToMinutes(dayConfig.close);

                    return (
                      <div key={day} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => {
                              setOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...dayConfig, enabled: !dayConfig.enabled }
                              }));
                            }}
                            className={`text-[10px] font-black px-3 py-1 rounded-full border transition-all cursor-pointer ${
                              dayConfig.enabled
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {dayConfig.enabled ? 'ON' : 'OFF — CLOSED'}
                          </button>
                          <span className="font-display font-extrabold text-sm text-main">{dayLabel}</span>
                        </div>

                        {dayConfig.enabled ? (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-base border border-line-strong rounded-xl px-3 py-1.5">
                              <span className="text-[10px] font-bold text-muted uppercase">Opening:</span>
                              <input
                                type="time"
                                value={dayConfig.open || '09:00'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...dayConfig, open: val }
                                  }));
                                }}
                                className="bg-transparent text-xs font-bold text-main outline-none"
                              />
                            </div>
                            <span className="text-muted font-bold text-xs">→</span>
                            <div className="flex items-center gap-1.5 bg-base border border-line-strong rounded-xl px-3 py-1.5">
                              <span className="text-[10px] font-bold text-muted uppercase">Closing:</span>
                              <input
                                type="time"
                                value={dayConfig.close || '23:00'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...dayConfig, close: val }
                                  }));
                                }}
                                className="bg-transparent text-xs font-bold text-main outline-none"
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-muted">
                              ({formatTime12(dayConfig.open)} – {formatTime12(dayConfig.close)}{isOvernight ? ' 🌙 Overnight' : ''})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-muted italic">Closed all day</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-line pt-4 mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveOpeningHours}
                    disabled={isHoursSaving}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isHoursSaving ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OFFERS TAB */}
          {activeSubTab === 'offers' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Offer & Discount Manager</h3>
              
              {/* Add Coupon Form */}
              <form onSubmit={handleCreateCoupon} className="bg-base border border-gray-150 p-4 rounded-3xl flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Promo Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SPICE50"
                    value={newOfferCode}
                    onChange={(e) => setNewOfferCode(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none uppercase font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Flat Discount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={newOfferDiscount}
                    onChange={(e) => setNewOfferDiscount(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Min Order (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150"
                    value={newOfferMinAmount}
                    onChange={(e) => setNewOfferMinAmount(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none font-bold animate-fade-in"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-extrabold tracking-wider text-muted px-1">Applicable Item</label>
                  <select
                    value={newOfferItemId}
                    onChange={(e) => setNewOfferItemId(e.target.value)}
                    className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main outline-none font-bold min-w-[150px] cursor-pointer"
                  >
                    <option value="">All Menu Items</option>
                    {menuItems.map(item => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs">
                  Create Offer
                </button>
              </form>

              {/* Coupon List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {offers.map((offer, idx) => (
                  <div key={idx} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex justify-between items-center relative gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-primary flex items-center justify-center font-black">
                        %
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-xs font-mono font-black text-main">{offer.code}</h4>
                        <p className="text-[10px] text-muted font-semibold">Flat ₹{offer.discount} off • Min order ₹{offer.minAmount}</p>
                        {offer.applicableItemName && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold w-max mt-0.5">
                            🎯 Only for: {offer.applicableItemName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-green-50 border border-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold">Active</span>
                      <button
                        onClick={() => handleDeleteCoupon(offer.code)}
                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-muted cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE MANAGEMENT TAB */}
          {activeSubTab === 'profile' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Kitchen Settings</h3>
              
              <form onSubmit={handleSaveProfile} className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Kitchen Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Average Prep Time (Mins)</label>
                    <input
                      type="number"
                      required
                      value={profileTime}
                      onChange={(e) => setProfileTime(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Kitchen Address & Location</label>
                  
                  {/* Current address display */}
                  <div className="bg-base border border-line-strong rounded-xl p-3 flex flex-col gap-2 relative">
                    {profileAddress ? (
                      <>
                        <p className="text-xs font-semibold text-main leading-relaxed">{profileAddress}</p>
                        {profileLat && profileLng && (
                          <p className="text-[10px] text-primary font-mono flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {Number(profileLat).toFixed(5)}°N, {Number(profileLng).toFixed(5)}°E
                          </p>
                        )}
                        {(!profileLat || !profileLng || (Number(profileLat) === 19.076 && Number(profileLng) === 72.8777)) && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Location unavailable. Please set exact location on map.</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted italic">No location set yet. Click the button below to pick one.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowRestaurantLocationPicker(true)}
                      className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold py-2 px-3 rounded-lg cursor-pointer transition-all w-fit mt-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {profileAddress ? 'Change Location on Map' : 'Pick Location on Map'}
                    </button>
                  </div>
                </div>

                <ImageUploadInput
                  label="Kitchen Cover Image"
                  imageType="restaurant"
                  value={profileImage}
                  file={profileImageFile}
                  onFileChange={setProfileImageFile}
                  onUrlChange={setProfileImage}
                />

                <div className="flex flex-col gap-3.5 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="profileVeg"
                      checked={profileVeg}
                      onChange={(e) => setProfileVeg(e.target.checked)}
                      className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="profileVeg" className="text-xs text-muted font-bold cursor-pointer uppercase">This is a Pure Vegetarian Kitchen</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="profileClosed"
                      checked={profileClosed}
                      onChange={(e) => setProfileClosed(e.target.checked)}
                      className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="profileClosed" className="text-xs text-muted font-bold cursor-pointer uppercase">Mark Kitchen as Temporarily Closed</label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer shadow-md mt-2 disabled:opacity-50 w-full"
                >
                  {isProfileSaving ? 'Saving Updates...' : 'Save Kitchen Parameters'}
                </button>
              </form>

              {/* ── My Account section ── */}
              <div className="flex flex-col gap-4 mt-2">
                <h4 className="font-display font-extrabold text-sm text-main border-b border-line pb-2">My Account</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => { 
                      setEditPersonalName(user?.name || ''); 
                      setEditPersonalPhone(user?.phone || ''); 
                      setEditPersonalEmail(user?.email || '');
                      setIsEmailOtpSent(false);
                      setEmailOtp('');
                      setEmailUpdateError('');
                      setEmailUpdateSuccess('');
                      setPersonalProfileError(''); 
                      setPersonalProfileSuccess(''); 
                      setShowEditPersonalProfile(true); 
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5"/> Edit My Profile
                  </button>
                  <button
                    onClick={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteAccount(true); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5"/> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KYC VERIFICATION TAB */}
          {activeSubTab === 'kyc' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Business KYC Authentication</h3>
              
              {user?.kycStatus === 'Approved' ? (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 text-green-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    <h4 className="font-display font-extrabold text-sm uppercase">KYC Verified & Authorized</h4>
                  </div>
                  <p className="text-xs leading-relaxed font-semibold">Your business credentials have been successfully authenticated by the platform administrator. You can accept active deliveries and publish menu updates.</p>
                  <div className="text-[10px] font-mono text-green-700 bg-surface/50 px-3 py-2 rounded-xl w-max mt-1">
                    Verified ID: {user.kycDetails?.documentType} - {user.kycDetails?.documentNumber}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-5 text-yellow-800 flex gap-3 text-xs leading-relaxed font-medium">
                    <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold">KYC Action Required</h5>
                      <p className="mt-0.5">Please provide business licensing / taxation IDs below (such as your FSSAI license or GSTIN registration). Dashboards and payments will remain locked until verified by an Administrator.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitKyc} className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Document Type</label>
                        <select
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                          className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none"
                        >
                          <option value="GSTIN">GSTIN Certificate</option>
                          <option value="FSSAI License">FSSAI Kitchen License</option>
                          <option value="PAN Card">Business PAN</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Document ID Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 29AAAAA1111A1Z1"
                          value={kycDocNum}
                          onChange={(e) => setKycDocNum(e.target.value)}
                          className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main outline-none uppercase font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={kycSubmitting}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {kycSubmitting ? 'Uploading Documents...' : 'Submit Verification Docs'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS & RATINGS TAB */}
          {activeSubTab === 'reviews' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-main">Customer Feedback & Ratings</h3>
                  <p className="text-xs text-muted font-medium mt-0.5">Reviews left by customers on completed orders</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">
                    {orders.filter(o => Number(o.review?.rating) > 0).length} Total Reviews
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. AVERAGE RATING */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                    Average Customer Rating
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-3xl text-main">
                      {restaurantProfile?.ratingCount > 0
                        ? formatRating(restaurantProfile.rating)
                        : (orders.some(o => Number(o.review?.rating) > 0)
                            ? formatRating(orders.filter(o => Number(o.review?.rating) > 0).reduce((sum, o) => sum + o.review.rating, 0) / orders.filter(o => Number(o.review?.rating) > 0).length)
                            : 'New')}
                    </span>
                    <Star className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-[11px] text-muted font-medium">
                    {restaurantProfile?.ratingCount > 0
                      ? `Based on ${restaurantProfile.ratingCount} reviews`
                      : (orders.filter(o => Number(o.review?.rating) > 0).length > 0
                          ? `Based on ${orders.filter(o => Number(o.review?.rating) > 0).length} reviews`
                          : 'No reviews yet')}
                  </span>
                </div>

                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                    Total Completed Orders
                  </span>
                  <span className="font-display font-black text-3xl text-primary">
                    {orders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length}
                  </span>
                  <span className="text-[11px] text-muted font-medium">Successfully delivered</span>
                </div>

                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                    Customer Reviews Received
                  </span>
                  <span className="font-display font-black text-3xl text-green-600">
                    {orders.filter(o => Number(o.review?.rating) > 0).length}
                  </span>
                  <span className="text-[11px] text-muted font-medium">Verified customer feedback</span>
                </div>
              </div>

              {/* Recent Reviews List */}
              <div className="flex flex-col gap-3">
                <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider">
                  Recent Customer Reviews
                </h4>

                {orders.filter(o => Number(o.review?.rating) > 0).length === 0 ? (
                  <div className="bg-surface border border-line rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-2">
                    <Star className="w-10 h-10 text-gray-300" />
                    <h5 className="font-bold text-sm text-main">No reviews received yet</h5>
                    <p className="text-xs text-muted max-w-sm">
                      Customer ratings and comments for your dishes will appear here once your orders are delivered and rated.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders
                      .filter(o => Number(o.review?.rating) > 0)
                      .map((o) => (
                        <div key={o._id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= o.review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                                  }`}
                                />
                              ))}
                              <span className="text-xs font-bold text-main ml-1.5">{o.review.rating}.0</span>
                            </div>
                            <span className="text-[10px] text-muted font-mono font-bold">
                              #{String(o._id).slice(-6).toUpperCase()}
                            </span>
                          </div>

                          {o.review.comment ? (
                            <p className="text-xs text-main italic bg-base p-3 rounded-xl border border-line leading-relaxed">
                              "{o.review.comment}"
                            </p>
                          ) : (
                            <p className="text-xs text-muted italic">No written comment provided.</p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-muted border-t border-line/60 pt-2 mt-1">
                            <span>{formatAppDateOnly(o.review.createdAt || o.updatedAt)}</span>
                            <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                              Verified Order
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MENU ITEM ADD/EDIT MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-xl border border-line animate-scale-up">
            
            <div className="flex justify-between items-center border-b border-line pb-3.5">
              <h3 className="font-display font-extrabold text-base text-main">
                {editingItem ? 'Edit Food Item' : 'Add Food Item'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="p-1 hover:bg-base rounded-lg text-muted hover:text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {itemModalError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {itemModalError}
              </p>
            )}

            <form onSubmit={handleSaveItem} className="flex flex-col gap-3.5">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Tikka Masala"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="bg-base border border-gray-250 rounded-xl px-3.5 py-2.5 text-xs text-main outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 240"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="bg-base border border-gray-250 rounded-xl px-3.5 py-2.5 text-xs text-main outline-none font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Category</label>
                    <button
                      type="button"
                      onClick={() => handleOpenCategoryModal(null)}
                      className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      + New Category
                    </button>
                  </div>
                  {menuCategories.length > 0 ? (
                    <select
                      value={itemCategoryId || (menuCategories.find(c => c.name.toLowerCase() === itemCategory.toLowerCase())?._id || '')}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const found = menuCategories.find(c => c._id === selectedId);
                        if (found) {
                          setItemCategoryId(found._id);
                          setItemCategory(found.name);
                        } else {
                          setItemCategoryId('');
                          setItemCategory(selectedId);
                        }
                      }}
                      className="bg-base border border-gray-250 rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary"
                    >
                      {menuCategories.map(cat => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name} {cat.isActive === false ? '(Hidden)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Course"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="bg-base border border-gray-250 rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Description</label>
                <textarea
                  placeholder="Tell customers about the spices, volume, and ingredients..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  rows={2}
                  className="bg-base border border-gray-250 rounded-xl px-3.5 py-2.5 text-xs text-main outline-none resize-none"
                />
              </div>

              <ImageUploadInput
                label="Dish Image *"
                imageType="food"
                value={itemImage}
                file={itemImageFile}
                onFileChange={setItemImageFile}
                onUrlChange={setItemImage}
                required
              />

              {/* Item Availability Section */}
              <div className="bg-base border border-line-strong p-3.5 rounded-2xl flex flex-col gap-2.5 mt-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Item Availability Schedule</span>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-main">
                    <input
                      type="radio"
                      name="availabilityMode"
                      value="restaurant_hours"
                      checked={itemAvailabilityMode === 'restaurant_hours'}
                      onChange={() => setItemAvailabilityMode('restaurant_hours')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>All Restaurant Hours</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-main">
                    <input
                      type="radio"
                      name="availabilityMode"
                      value="custom"
                      checked={itemAvailabilityMode === 'custom'}
                      onChange={() => setItemAvailabilityMode('custom')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Custom Time</span>
                  </label>
                </div>

                {itemAvailabilityMode === 'custom' && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-line animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-extrabold text-muted">Available From</label>
                        <input
                          type="time"
                          value={itemAvailableFrom}
                          onChange={(e) => setItemAvailableFrom(e.target.value)}
                          className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main font-bold outline-none"
                        />
                        <span className="text-[9px] text-muted">{formatTime12(itemAvailableFrom)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-extrabold text-muted">Available To</label>
                        <input
                          type="time"
                          value={itemAvailableTo}
                          onChange={(e) => setItemAvailableTo(e.target.value)}
                          className="bg-surface border border-gray-250 rounded-xl px-3 py-2 text-xs text-main font-bold outline-none"
                        />
                        <span className="text-[9px] text-muted">{formatTime12(itemAvailableTo)}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-primary font-bold">Repeat: Every Day</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="itemVeg"
                    checked={itemIsVeg}
                    onChange={(e) => setItemIsVeg(e.target.checked)}
                    className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="itemVeg" className="text-xs text-muted font-bold cursor-pointer uppercase">This is Vegetarian (Green Badge)</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="itemAvailable"
                    checked={itemIsAvailable}
                    onChange={(e) => setItemIsAvailable(e.target.checked)}
                    className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="itemAvailable" className="text-xs text-muted font-bold cursor-pointer uppercase">Item is Available & In Stock</label>
                </div>
              </div>

              <button type="submit" disabled={isItemSaving} className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl mt-2 cursor-pointer shadow-md disabled:opacity-50">
                {isItemSaving ? 'Saving...' : (editingItem ? 'Update Menu Item' : 'Add Item to Menu')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MENU CATEGORY ADD/EDIT MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-xl border border-line animate-scale-up">
            <div className="flex justify-between items-center border-b border-line pb-3.5">
              <h3 className="font-display font-extrabold text-base text-main">
                {editingCategory ? 'Edit Menu Category' : 'Create New Menu Category'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 hover:bg-base rounded-lg text-muted hover:text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {catModalError && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl mt-3">
                {catModalError}
              </p>
            )}

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4 mt-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biryanis, Starters, Breads, Desserts"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Food Type Filter</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Veg & Non-Veg' },
                    { id: 'veg', label: 'Pure Veg' },
                    { id: 'nonVeg', label: 'Non-Veg Only' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCatFoodType(type.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center ${
                        catFoodType === type.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-base border-line text-muted hover:text-main'
                      }`}
                    >
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1"
                    value={catDisplayOrder}
                    onChange={(e) => setCatDisplayOrder(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary"
                  />
                  <span className="text-[9px] text-muted px-1">Lower numbers appear first</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Visibility Status</label>
                  <button
                    type="button"
                    onClick={() => setCatIsActive(!catIsActive)}
                    className={`h-[42px] px-3.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      catIsActive
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 border-gray-250 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {catIsActive ? '🟢 Active in Menu' : '⚪ Inactive (Hidden)'}
                  </button>
                  <span className="text-[9px] text-muted px-1">Inactive categories hide from customers</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-3 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatSaving}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isCatSaving ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PERSONAL PROFILE MODAL ─────────────────────── */}
      {showEditPersonalProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">Edit My Profile</h3>
              <button onClick={() => setShowEditPersonalProfile(false)} className="text-muted hover:text-main cursor-pointer">✕</button>
            </div>
            {personalProfileError && <p className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{personalProfileError}</p>}
            {personalProfileSuccess && <p className="text-[11px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-xl border border-green-100">{personalProfileSuccess}</p>}
            <form onSubmit={handleSavePersonalProfile} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold text-muted">Full Name</label>
                <input type="text" value={editPersonalName} onChange={e => setEditPersonalName(e.target.value)} required
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold text-muted">Mobile Number</label>
                <input type="tel" value={editPersonalPhone} onChange={e => setEditPersonalPhone(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"/>
              </div>
              <div className="flex flex-col gap-1 pb-3 border-b border-line-strong">
                <label className="text-[10px] uppercase font-extrabold text-muted">Email</label>
                <div className="flex gap-2">
                  <input type="email" value={editPersonalEmail} onChange={e => setEditPersonalEmail(e.target.value)} disabled={isEmailOtpSent}
                    className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary disabled:opacity-60"/>
                  {editPersonalEmail !== user?.email && !isEmailOtpSent && (
                    <button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp}
                      className="px-3 bg-violet-100 text-primary hover:bg-violet-200 text-[10px] font-bold rounded-xl cursor-pointer disabled:opacity-50">
                      {isSendingEmailOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                </div>
                {isEmailOtpSent && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" placeholder="Enter 6-digit OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)}
                      className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-widest outline-none focus:border-primary"/>
                    <button type="button" onClick={handleVerifyEmailOtp} disabled={isVerifyingEmailOtp}
                      className="px-4 bg-primary text-white hover:bg-primary-hover text-[10px] font-bold rounded-xl cursor-pointer disabled:opacity-50">
                      {isVerifyingEmailOtp ? '...' : 'Confirm'}
                    </button>
                  </div>
                )}
                {emailUpdateError && <p className="text-[10px] font-bold text-red-500 mt-1">{emailUpdateError}</p>}
                {emailUpdateSuccess && <p className="text-[10px] font-bold text-green-600 mt-1">{emailUpdateSuccess}</p>}
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowEditPersonalProfile(false)} className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingPersonal} className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">{isSavingPersonal ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT MODAL ─────────────────────────────── */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Delete Account</h3>
              <button onClick={() => setShowDeleteAccount(false)} className="text-muted cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-muted bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">⚠️ This <strong>permanently</strong> deletes your account, restaurant and all data. Cannot be undone.</p>
            {deleteError && <p className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{deleteError}</p>}
            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold text-muted">Confirm Password</label>
                <input type="password" placeholder="Enter your password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required
                  className="bg-base border border-red-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-red-400"/>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDeleteAccount(false)} className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isDeletingAccount || !deletePassword} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">{isDeletingAccount ? 'Deleting...' : 'Delete Forever'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESTAURANT LOCATION PICKER MODAL ── */}
      <LocationPickerModal
        isOpen={showRestaurantLocationPicker}
        onClose={() => setShowRestaurantLocationPicker(false)}
        onConfirm={(pickedAddr) => {
          const parts = [
            pickedAddr.houseNo,
            pickedAddr.street,
            pickedAddr.area,
            pickedAddr.city,
            pickedAddr.state,
            pickedAddr.zip,
          ].filter(Boolean);
          setProfileAddress(parts.join(', '));
          setProfileLat(pickedAddr.lat);
          setProfileLng(pickedAddr.lng);
          setShowRestaurantLocationPicker(false);
        }}
        initialAddress={
          profileLat && profileLng
            ? { street: profileAddress, city: '', state: '', zip: '', lat: profileLat, lng: profileLng }
            : null
        }
        title="Set Restaurant Location"
      />

      {/* ── REJECTION MODAL ── */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-fade-in">
            <h3 className="font-display font-black text-xl text-red-600 border-b border-line pb-2">Reject Order</h3>
            <p className="text-xs font-semibold text-muted">Please select a reason for rejection. This will notify the customer immediately.</p>
            <div className="flex flex-col gap-2 mt-2">
              {rejectionOptions.map(reason => (
                <label key={reason} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-main">
                  <input type="radio" name="rejectionReason" value={reason} checked={rejectionReason === reason} onChange={e => setRejectionReason(e.target.value)} className="w-4 h-4 text-red-600 focus:ring-red-500" />
                  {reason}
                </label>
              ))}
              {rejectionReason === 'Other' && (
                <input type="text" placeholder="Type custom reason..." value={customRejectionReason} onChange={e => setCustomRejectionReason(e.target.value)} className="mt-2 bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500" />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { setRejectingOrderId(null); setRejectionReason(''); setCustomRejectionReason(''); }} className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
              <button type="button" disabled={!rejectionReason || (rejectionReason === 'Other' && !customRejectionReason)} onClick={() => { handleUpdateOrderStatus(rejectingOrderId, 'Rejected', rejectionReason === 'Other' ? customRejectionReason : rejectionReason); setRejectingOrderId(null); setRejectionReason(''); setCustomRejectionReason(''); }} className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 cursor-pointer disabled:opacity-50">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL HISTORY CALENDAR MODAL ─── */}
      <HistoryCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        dateFilter={historyFilter.dateFilter}
        onApply={historyFilter.setDateFilter}
        availableYears={historyFilter.availableYears}
        datesWithRecords={historyFilter.datesWithRecords}
      />

      {/* ── UNIFIED ORDER DETAILS MODAL ─── */}
      <OrderDetailsModal
        isOpen={Boolean(selectedDetailsOrder)}
        onClose={() => setSelectedDetailsOrder(null)}
        order={selectedDetailsOrder}
        role="restaurant"
        token={token}
      />

      {/* ── CLEAR HISTORY CONFIRMATION MODAL ─── */}
      <ClearHistoryModal
        isOpen={showClearHistoryModal}
        onClose={() => setShowClearHistoryModal(false)}
        onConfirm={handleClearRestaurantHistory}
        title="Clear All Restaurant Order History?"
        description="This will remove completed and cancelled orders from your restaurant order view. Active in-flight kitchen orders and lifetime financial calculations will not be affected."
        confirmButtonText="Yes, Clear All"
      />
    </div>
  );
}
