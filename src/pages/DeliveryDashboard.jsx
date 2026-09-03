import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Bike, DollarSign, Clock, ShieldCheck, MapPin, Store, CheckCircle, XCircle, ChevronRight, AlertCircle, ShoppingBag, Eye, LogOut, Send, FileText, Star, MessageSquare, Heart, Phone, Pencil, AlertTriangle, Camera, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../utils/uploadUtil';
import InteractiveMap from '../components/InteractiveMap';
import { io } from 'socket.io-client';
import NotificationCenter from '../components/NotificationCenter';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { formatAppDateOnly, formatAppTimeOnly, formatAppDateTime } from '../utils/dateUtils';
import { getOrderFinancialBreakdown, formatCurrency, formatDistance, formatRating, normalizeRiderRun, getOrderPlacedAt, getOrderDeliveredAt, getOrderSourceDisplayNames } from '../utils/orderUtils';
import {
  useHistoryFilter,
  HistoryFilterToolbar,
  HistoryCalendarModal,
  ClearHistoryModal,
  HistoryEmptyState
} from '../components/history';

export default function DeliveryDashboard() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  // Edit Profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState('');
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');
  const [editProfileImage, setEditProfileImage] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Delete Account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');
    setIsSavingProfile(true);
    try {
      let profileImageUrl = riderProfile?.profileImage || user?.profileImage || '';
      
      if (editProfileImage) {
        try {
          profileImageUrl = await uploadFileToBackend(editProfileImage);
        } catch (uErr) {
          setProfileError(uErr.message || 'Failed to upload image.');
          setIsSavingProfile(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editName, phone: editPhone, profileImage: profileImageUrl })
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.message || 'Failed.'); return; }
      setProfileSuccess('Profile updated!');
      setTimeout(() => { setShowEditProfile(false); setProfileSuccess(''); window.location.reload(); }, 1200);
    } catch { setProfileError('Server error.'); }
    finally { setIsSavingProfile(false); }
  };

  const handleSendEmailOtp = async () => {
    if (!editEmail || editEmail === user?.email) return;
    setEmailUpdateError(''); setEmailUpdateSuccess('');
    setIsSendingEmailOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-email-update-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newEmail: editEmail })
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
      if (!res.ok) { setDeleteError(data.message || 'Failed.'); return; }
      logout(); navigate('/');
    } catch { setDeleteError('Server error.'); }
    finally { setIsDeletingAccount(false); }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeSubTab, setActiveSubTabState] = useState(tabFromUrl || 'pool');

  useEffect(() => {
    if (tabFromUrl && ['pool', 'orders', 'wallet', 'history', 'kyc', 'profile'].includes(tabFromUrl)) {
      setActiveSubTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const setActiveSubTab = (tab) => {
    setActiveSubTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };
  
  // Rider specific profile & availability
  const [riderProfile, setRiderProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [activeFoodDelivery, setActiveFoodDelivery] = useState(true);
  const [activeRide, setActiveRide] = useState(true);

  // Orders lists
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderRestaurantAddress, setSelectedOrderRestaurantAddress] = useState('');
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  // Global History Filter for Delivery Partner Runs
  const historyFilter = useHistoryFilter(historyOrders, {
    dateKey: 'createdAt',
    typeKey: 'orderType',
    statusKey: 'status'
  });
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showClearRunsModal, setShowClearRunsModal] = useState(false);

  const handleClearRunsHistory = async () => {
    const res = await fetch(`${API_BASE}/delivery-partner/orders/history`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to clear runs history');
    }
    setHistoryOrders([]);
  };

  // Ratings & Reviews state
  const [ratingsData, setRatingsData] = useState(null);
  const [isRatingsLoading, setIsRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [reviewVisibleCount, setReviewVisibleCount] = useState(10);

  const fetchRatingsData = async () => {
    try {
      setIsRatingsLoading(true);
      setRatingsError(null);
      const res = await fetch(`${API_BASE}/delivery-partner/ratings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load ratings data');
      const data = await res.json();
      setRatingsData(data);
    } catch (err) {
      console.error('Error fetching rider ratings:', err);
      setRatingsError(err.message);
    } finally {
      setIsRatingsLoading(false);
    }
  };

  // Status progression action triggers
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');

  // Withdrawal Requests
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalMsg, setWithdrawalMsg] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // KYC Submission
  const [kycDocType, setKycDocType] = useState('Driving License');
  const [kycDocNum, setKycDocNum] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Chat State
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [riderLoc, setRiderLoc] = useState(null);
  const [selectedOrderRestaurantName, setSelectedOrderRestaurantName] = useState('');
  const [selectedOrderRestaurantPhone, setSelectedOrderRestaurantPhone] = useState('');
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (selectedOrder?.messages && selectedOrder.messages.length > 0) {
      scrollToBottom();
    }
  }, [selectedOrder?.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || isSending || !selectedOrder) return;

    setIsSending(true);
    try {
      const isBeforePickup = selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status);
      const res = await fetch(`${API_BASE}/orders/${selectedOrder._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: messageText,
          sender: 'rider',
          target: isBeforePickup ? 'restaurant' : 'customer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
        setMessageText('');
        fetchOrdersData();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'delivery') {
      navigate('/');
      return;
    }
    if (user?.role === 'delivery') {
      fetchProfile();
      fetchOrdersData();

      const interval = setInterval(() => {
        fetchProfile();
        fetchOrdersData();
      }, 60000); // 60 seconds fallback polling to prevent 429 API rate limits

      return () => clearInterval(interval);
    }
  }, [token, user, navigate]);


  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRiderProfile(data);
        setIsAvailable(data.deliveryDetails?.isAvailable || false);
        setActiveFoodDelivery(data.deliveryDetails?.activeFoodDelivery !== false);
        setActiveRide(data.deliveryDetails?.activeRide !== false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrdersData = async () => {
    try {
      const [availRes, activeRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/delivery-partner/orders/available`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery-partner/orders/active`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery-partner/orders/history`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (availRes.ok) {
        const availData = await availRes.json();
        setAvailableOrders(Array.isArray(availData) ? availData : []);
      }

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        const safeActiveData = Array.isArray(activeData) ? activeData : [];
        setActiveOrders(safeActiveData);

        if (safeActiveData.length > 0) {
          setSelectedOrder(prev => {
            if (!prev) return safeActiveData[0];
            const match = safeActiveData.find(o => String(o._id) === String(prev._id));
            return match || safeActiveData[0];
          });
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const safeHistoryData = Array.isArray(historyData) ? historyData : [];
        safeHistoryData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setHistoryOrders(safeHistoryData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // Rider Rejection Modal States
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectModalStep, setRejectModalStep] = useState('confirm'); // 'confirm' | 'reason' | 'success'
  const [rejectReasonCode, setRejectReasonCode] = useState('');
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [rejectErrorMsg, setRejectErrorMsg] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [lastRejectionCount, setLastRejectionCount] = useState(0);

  const rejectReasonOptions = [
    { code: 'too_far', label: 'Too far from my current location' },
    { code: 'earning_low', label: 'Delivery earning is too low' },
    { code: 'vehicle_problem', label: 'Vehicle problem' },
    { code: 'personal_emergency', label: 'Personal emergency' },
    { code: 'unable_handle', label: 'Unable to handle this order' },
    { code: 'pickup_issue', label: 'Pickup location issue' },
    { code: 'customer_issue', label: 'Customer location issue' },
    { code: 'heavy_traffic', label: 'Heavy traffic / route issue' },
    { code: 'weather_issue', label: 'Weather / road condition issue' },
    { code: 'other', label: 'Other' }
  ];

  const handleRejectOrderSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingOrder) return;
    setRejectErrorMsg('');
    if (!rejectReasonCode) {
      setRejectErrorMsg('Please select a reason for rejecting this delivery.');
      return;
    }
    if (rejectReasonCode === 'other' && !rejectReasonText.trim()) {
      setRejectErrorMsg('Please specify the reason when selecting "Other".');
      return;
    }

    setIsSubmittingReject(true);
    try {
      const selectedObj = rejectReasonOptions.find(o => o.code === rejectReasonCode);
      const res = await fetch(`${API_BASE}/delivery-partner/orders/${rejectingOrder._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reasonCode: rejectReasonCode,
          reasonText: rejectReasonCode === 'other' ? rejectReasonText.trim() : (selectedObj?.label || rejectReasonCode),
          note: rejectNote.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const orderIdToExclude = rejectingOrder._id;
        setAvailableOrders(prev => prev.filter(o => String(o._id) !== String(orderIdToExclude)));
        if (selectedOrder && String(selectedOrder._id) === String(orderIdToExclude)) {
          setSelectedOrder(null);
        }
        setLastRejectionCount(data.dailyRejectionCount || ((user?.deliveryDetails?.dailyRejectionCount || 0) + 1));
        setRejectModalStep('success');
        fetchProfile();
        fetchOrdersData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to reject order:', errorData);
        setRejectErrorMsg(errorData.message || 'Unable to reject this delivery. Please try again.');
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      setRejectErrorMsg(err.message || 'Unable to reject this delivery. Please check network connection.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Fetch ratings data whenever switching to reviews tab
  useEffect(() => {
    if (activeSubTab === 'reviews') {
      fetchRatingsData();
    }
  }, [activeSubTab]);

  // Sync selectedOrder on external list updates (only if external list has a newer update)
  useEffect(() => {
    if (selectedOrder) {
      const match = [...activeOrders, ...historyOrders, ...availableOrders].find(o => String(o._id) === String(selectedOrder._id));
      if (match && match.status !== selectedOrder.status) {
        const matchTime = new Date(match.updatedAt || match.createdAt || 0).getTime();
        const selectedTime = new Date(selectedOrder.updatedAt || selectedOrder.createdAt || 0).getTime();
        if (matchTime >= selectedTime) {
          setSelectedOrder(match);
        }
      }
    }
  }, [activeOrders, historyOrders, availableOrders]);

  useEffect(() => {
    if (selectedOrder && selectedOrder.restaurantId) {
      const fetchRestaurantAddress = async () => {
        try {
          const res = await fetch(`${API_BASE}/restaurants/${selectedOrder.restaurantId}`);
          if (res.ok) {
            const data = await res.json();
            setSelectedOrderRestaurantAddress(data.address);
            setSelectedOrderRestaurantName(data.name || 'Restaurant');
            setSelectedOrderRestaurantPhone(data.phone || '');
          }
        } catch (err) {
          console.error("Error fetching restaurant address in delivery dashboard:", err);
        }
      };
      fetchRestaurantAddress();
    } else {
      setSelectedOrderRestaurantAddress('');
      setSelectedOrderRestaurantName('');
      setSelectedOrderRestaurantPhone('');
    }
  }, [selectedOrder]);

  const handleToggleAvailability = async () => {
    setIsTogglingAvail(true);
    const nextVal = !isAvailable;
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/profile/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: nextVal })
      });
      if (res.ok) {
        setIsAvailable(nextVal);
        fetchProfile();
        fetchOrdersData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingAvail(false);
    }
  };

  const handleToggleFoodDelivery = async () => {
    const nextVal = !activeFoodDelivery;
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/profile/services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activeFoodDelivery: nextVal })
      });
      if (res.ok) {
        setActiveFoodDelivery(nextVal);
        fetchOrdersData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRide = async () => {
    const nextVal = !activeRide;
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/profile/services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activeRide: nextVal })
      });
      if (res.ok) {
        setActiveRide(nextVal);
        fetchOrdersData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [gpsStatus, setGpsStatus] = useState('locating'); // 'live' | 'locating' | 'unavailable'

  // Geolocation and Socket.IO GPS update streaming for active dispatches
  useEffect(() => {
    if (!selectedOrder || ['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(selectedOrder.status) || !token) {
      setGpsStatus('unavailable');
      return;
    }

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.emit('joinOrder', selectedOrder._id);
    console.log('[GPS SOCKET] Live coordinate streaming activated for order:', selectedOrder._id);

    let watchId;
    if (navigator.geolocation) {
      setGpsStatus('locating');

      // Immediate one-time fix on order select so the rider marker appears instantly
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, heading, speed, accuracy } = position.coords;
          if (accuracy && accuracy > 500) {
            console.warn('[GPS SOCKET] Ignored initial low accuracy point:', accuracy, 'm');
            return;
          }
          console.log('[GPS SOCKET] Immediate initial location:', latitude, longitude);
          setRiderLoc({ lat: latitude, lng: longitude, heading, speed, accuracy });
          setGpsStatus('live');
        },
        (err) => {
          console.warn('[GPS SOCKET] Initial getCurrentPosition warning:', err.message);
          // Do not fail hard on initial timeout; watchPosition will continue trying
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      // Continuous GPS tracking
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading, speed, accuracy } = position.coords;
          if (accuracy && accuracy > 350) {
            console.warn('[GPS SOCKET] Ignored low accuracy point:', accuracy, 'm');
            return;
          }
          console.log('[GPS SOCKET] Dispatching coordinate update:', latitude, longitude, 'accuracy:', accuracy);
          setRiderLoc({ lat: latitude, lng: longitude, heading, speed, accuracy });
          setGpsStatus('live');

          socket.emit('updateLocation', {
            orderId: selectedOrder._id,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || 0
          });
        },
        (err) => {
          console.error('[GPS SOCKET] Geolocation error:', err);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('unavailable');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      console.warn('[GPS SOCKET] Geolocation is not supported by this browser.');
      setGpsStatus('unavailable');
    }

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.disconnect();
    };
  }, [selectedOrder?._id, selectedOrder?.status, token]);

  // Socket listener for real-time order status, pickup stops, and pool synchronization
  useEffect(() => {
    if (!token || !user?._id) return;

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join', `user_${user._id}`);
      socket.emit('join', `delivery_${user._id}`);
      if (selectedOrder?._id) {
        socket.emit('join', `order_${selectedOrder._id}`);
        socket.emit('join', `order:${selectedOrder._id}`);
      }
    });

    // Pickup stop updated by restaurant or rider (milestone progression)
    socket.on('pickupStopUpdated', (data) => {
      if (data && data.order) {
        setSelectedOrder(prev => (prev && prev._id === data.order._id ? { ...prev, ...data.order } : prev));
        setActiveOrders(prev => prev.map(o => (o._id === data.order._id ? { ...o, ...data.order } : o)));
      } else if (data && data.orderId && data.pickupStops) {
        setSelectedOrder(prev => (prev && prev._id === data.orderId ? { ...prev, pickupStops: data.pickupStops, ...(data.status ? { status: data.status } : {}) } : prev));
        setActiveOrders(prev => prev.map(o => (o._id === data.orderId ? { ...o, pickupStops: data.pickupStops, ...(data.status ? { status: data.status } : {}) } : o)));
      }
      fetchOrdersData();
    });

    // Whole order or status updated
    socket.on('orderUpdated', (data) => {
      if (data && data._id) {
        setSelectedOrder(prev => (prev && prev._id === data._id ? { ...prev, ...data } : prev));
        setActiveOrders(prev => prev.map(o => (o._id === data._id ? { ...o, ...data } : o)));
      }
      fetchOrdersData();
    });

    socket.on('statusUpdated', (data) => {
      if (data && data.order) {
        setSelectedOrder(prev => (prev && prev._id === data.order._id ? { ...prev, ...data.order } : prev));
        setActiveOrders(prev => prev.map(o => (o._id === data.order._id ? { ...o, ...data.order } : o)));
      }
      fetchOrdersData();
    });

    // General order status change
    socket.on('orderStatusChanged', (data) => {
      if (data && data.order) {
        setSelectedOrder(prev => (prev && prev._id === data.order._id ? { ...prev, ...data.order } : prev));
        setActiveOrders(prev => prev.map(o => (o._id === data.order._id ? { ...o, ...data.order } : o)));
      }
      fetchOrdersData();
    });

    socket.on('auto_ride_opportunity', () => {
      fetchOrdersData();
    });

    socket.on('new_order_pool', () => {
      fetchOrdersData();
    });

    // Fallback polling interval every 12 seconds for network resilience
    const interval = setInterval(() => {
      fetchOrdersData();
    }, 12000);

    // Refresh immediately when window/tab is focused or visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrdersData();
      }
    };
    const handleFocus = () => {
      fetchOrdersData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.disconnect();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, user?._id, selectedOrder?._id]);

  const [claimConflictMsg, setClaimConflictMsg] = useState('');

  const handleAcceptOrder = async (orderId) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    setClaimConflictMsg('');
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/orders/${orderId}/accept`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const claimed = await res.json();
        const fresh = claimed.order || claimed;
        setSelectedOrder(fresh);
        setAvailableOrders(prev => prev.filter(o => String(o._id) !== String(orderId)));
        setActiveOrders(prev => [fresh, ...prev.filter(o => String(o._id) !== String(orderId))]);
        setActiveSubTab('orders'); // Jump back to orders tab to view tracking map
        fetchOrdersData();
      } else if (res.status === 409) {
        // Expected race condition — another rider accepted first
        const data = await res.json().catch(() => ({}));
        setClaimConflictMsg(data.message || 'This order was already claimed by another rider.');
        fetchOrdersData(); // Refresh pool so the order disappears
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to claim order');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const isUpdatingRef = useRef(false);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    if (isUpdatingRef.current || updatingId) return;
    isUpdatingRef.current = true;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        const fresh = updated.order || updated;
        setSelectedOrder(fresh);
        
        if (['Delivered', 'Completed'].includes(fresh.status)) {
          setActiveOrders(prev => prev.filter(o => String(o._id) !== String(orderId)));
          setHistoryOrders(prev => [fresh, ...prev.filter(o => String(o._id) !== String(orderId))]);
        } else {
          setActiveOrders(prev => prev.map(o => String(o._id) === String(orderId) ? fresh : o));
        }

        fetchOrdersData();
        fetchProfile(); // Refresh earnings
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to update status: ${errorData.message || res.statusText || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdatingId(null);
      isUpdatingRef.current = false;
    }
  };

  // Update individual pickup stop status (per-source milestone tracking)
  const handleUpdateStopStatus = async (orderId, stopId, nextStatus) => {
    const key = orderId + '_stop_' + stopId;
    if (updatingId) return;
    setUpdatingId(key);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/pickupstops/${stopId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        const fresh = updated.order || updated;
        setSelectedOrder(fresh);
        setActiveOrders(prev => prev.map(o => String(o._id) === String(orderId) ? fresh : o));
        fetchOrdersData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to update pickup stop: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error updating pickup stop: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectingOrderId) return;
    try {
      setUpdatingId(rejectingOrderId);
      const res = await fetch(`${API_BASE}/orders/${rejectingOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'Rider_Rejected',
          rejectionReason: rejectionReason === 'Other' ? customRejectionReason : rejectionReason
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRejectingOrderId(null);
        setRejectionReason('');
        setCustomRejectionReason('');
        setActiveOrders(prev => prev.filter(o => o._id !== rejectingOrderId));
        if (selectedOrder && selectedOrder._id === rejectingOrderId) {
          setSelectedOrder(null);
        }
        await fetchOrdersData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || 'Failed to reject order');
      }
    } catch (err) {
      console.error(err);
      alert('Error rejecting order');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setIsWithdrawing(true);
    setWithdrawalMsg('');

    try {
      const res = await fetch(`${API_BASE}/delivery-partner/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        // Mock register withdrawal request for Admin Dashboard list
        await fetch(`${API_BASE}/admin/withdrawals/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            riderId: user._id,
            name: user.name,
            amount: parseFloat(withdrawAmount),
            phone: user.phone
          })
        });

        setWithdrawalMsg('Withdrawal request successfully logged! Payout is pending admin approval.');
        setWithdrawAmount('');
        fetchProfile();
      } else {
        setWithdrawalMsg(data.message || 'Withdrawal failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleKycSubmit = async (e) => {
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
        alert('KYC submitted. Re-load page to refresh.');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKycSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Placed') return 'bg-violet-100 text-violet-700 border-violet-200';
    if (status === 'Confirmed') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'Preparing') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'Out for Delivery') return 'bg-purple-100 text-purple-700 border-purple-200 animate-pulse';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getNextRiderAction = (status, orderType, order = null) => {
    if (orderType === 'ride') {
      if (status === 'Rider_Accepted') return { next: 'Rider_At_Pickup', label: 'Reached Pickup Point' };
      if (status === 'Rider_At_Pickup') return { next: 'Picked_Up', label: 'Picked Up Customer' };
      if (status === 'Picked_Up') return { next: 'Delivered', label: 'Dropped Customer' };
      return null;
    }

    // For multi-stop orders, pickup progression is handled per-stop in the UI.
    // The main order status buttons only handle after all stops are collected.
    const hasPickupStops = order && Array.isArray(order.pickupStops) && order.pickupStops.length > 0;

    if (hasPickupStops) {
      const validStops = order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled');
      const allCollected = validStops.length > 0 && validStops.every(s => s.status === 'Collected');

      // While collecting pickups — main milestone buttons handle delivery start
      if (['Placed', 'Confirmed', 'Accepted', 'Preparing', 'Ready_for_Pickup', 'Rider_Accepted'].includes(status)) {
        if (allCollected) {
          return { next: 'Out_for_Delivery', label: 'All Collected — Start Delivery' };
        }
        // Per-stop buttons handle individual pickup progression; main button is disabled here
        return null; // Per-stop UI takes over
      }
      if (['Out_for_Delivery', 'Out for Delivery'].includes(status)) {
        return { next: 'Rider_At_Customer', label: 'Reached Customer' };
      }
      if (status === 'Rider_At_Customer') {
        return { next: 'Delivered', label: 'Mark as Delivered' };
      }
      return null;
    }

    // Legacy fallback for orders without pickupStops (old orders)
    const hasSupplierPickups = order && Array.isArray(order.supplierDeliveries) && order.supplierDeliveries.length > 0;
    const hasRestaurant = order && order.restaurantId && Array.isArray(order.items) && order.items.some(i => i.itemModel === 'MenuItem' && !i.supplierId);
    const pickupLabel = (hasSupplierPickups && !hasRestaurant) ? 'Reached Store' : (hasSupplierPickups && hasRestaurant ? 'Reached Pickup Stop' : 'Reached Restaurant');

    if (['Rider_Accepted', 'Placed', 'Accepted', 'Confirmed', 'Preparing'].includes(status)) {
      return { next: (hasSupplierPickups && !hasRestaurant) ? 'Rider_At_Pickup' : 'Rider_At_Restaurant', label: pickupLabel };
    }
    if (['Rider_At_Restaurant', 'Rider_At_Pickup', 'Ready_for_Pickup'].includes(status)) {
      return { next: 'Picked_Up', label: 'Pick Up Order' };
    }
    if (status === 'Picked_Up') {
      return { next: 'Out_for_Delivery', label: 'Start Delivery' };
    }
    if (['Out_for_Delivery', 'Out for Delivery'].includes(status)) {
      return { next: 'Rider_At_Customer', label: 'Reached Customer' };
    }
    if (status === 'Rider_At_Customer') {
      return { next: 'Delivered', label: 'Mark as Delivered' };
    }

    return null;
  };

  // Helper: compute pickup collection progress for a multi-stop order
  const getPickupStopsProgress = (order) => {
    if (!order || !Array.isArray(order.pickupStops) || order.pickupStops.length === 0) {
      return { hasStops: false, total: 0, collected: 0, allCollected: true, pending: [] };
    }
    const validStops = order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled');
    const total = validStops.length;
    const collected = validStops.filter(s => s.status === 'Collected').length;
    const allCollected = total > 0 && collected === total;
    const pending = validStops.filter(s => s.status !== 'Collected');
    return { hasStops: true, total, collected, allCollected, pending };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full mt-4">
      
      {/* Rider Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          {/* Back button returning to Rider Home page */}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Back to Rider Home"
            className="w-11 h-11 rounded-2xl border border-line bg-surface hover:bg-base text-main transition-colors flex items-center justify-center cursor-pointer shadow-3xs flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-main" />
          </button>

          {user?.profileImage || riderProfile?.profileImage ? (
            <img
              src={getImageUrl(user?.profileImage || riderProfile?.profileImage, 'avatar')}
              alt="Profile"
              onError={(e) => handleImageError(e, 'avatar')}
              className="w-12 h-12 rounded-2xl object-cover border border-line shadow-xs flex-shrink-0"
            />
          ) : (
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex-shrink-0">
              <Bike className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="font-display font-black text-2xl text-main leading-tight">
              {riderProfile?.name || user?.name || 'Rider Dashboard'}
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">Delivery Partner</p>
          </div>
        </div>

        {/* Availability & Capabilities Switches */}
        {user?.kycStatus === 'Approved' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-surface border border-line p-4 rounded-2xl shadow-2xs">
            <NotificationCenter userId={user?._id} role="delivery" />
            {/* Duty Toggle */}
            <div className="flex items-center gap-2.5 pr-4 sm:border-r sm:border-gray-150">
              <span className={`text-xs font-bold ${isAvailable ? 'text-green-600' : 'text-gray-450'}`}>
                {isAvailable ? 'Duty: Online' : 'Duty: Offline'}
              </span>
              <button
                onClick={handleToggleAvailability}
                disabled={isTogglingAvail}
                className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform duration-300 ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Service Capabilities */}
            <div className="flex items-center gap-4">
              {/* Food Delivery toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeFoodDelivery}
                  disabled={!isAvailable}
                  onChange={handleToggleFoodDelivery}
                  className="w-4 h-4 accent-primary rounded cursor-pointer disabled:opacity-40"
                />
                <span className={`text-xs font-bold ${activeFoodDelivery && isAvailable ? 'text-main' : 'text-muted'}`}>
                  Food Delivery
                </span>
              </label>

              {/* Ride toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeRide}
                  disabled={!isAvailable}
                  onChange={handleToggleRide}
                  className="w-4 h-4 accent-primary rounded cursor-pointer disabled:opacity-40"
                />
                <span className={`text-xs font-bold ${activeRide && isAvailable ? 'text-main' : 'text-muted'}`}>
                  Ride Captain
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      {riderProfile && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Duty Status</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-3.5 h-3.5 rounded-full relative flex items-center justify-center ${user?.kycStatus === 'Approved' && isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}>
                {user?.kycStatus === 'Approved' && isAvailable && <span className="absolute w-3.5 h-3.5 bg-green-500 rounded-full animate-ping" />}
              </span>
              <span className="text-sm font-black text-main">
                {user?.kycStatus !== 'Approved' ? 'Inactive (KYC Pending)' : isAvailable ? 'Ready to Ride' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Wallet Balance</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">{formatCurrency(riderProfile.deliveryDetails?.walletBalance)}</span>
              <button onClick={() => setActiveSubTab('wallet')} className="text-[10px] font-bold text-primary hover:underline">Cashout</button>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Total Earnings</span>
            <span className="text-xl font-black text-main mt-2">{formatCurrency(riderProfile.deliveryDetails?.totalEarnings)}</span>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider flex items-center gap-1"><Heart className="w-3 h-3 text-red-400 fill-red-100" /> Tips Earned</span>
            <span className="text-xl font-black text-green-600 mt-2">
              {formatCurrency(ratingsData?.totalTips ?? historyOrders.reduce((sum, o) => sum + (Number(o.riderReview?.tipAmount) || 0), 0))}
            </span>
          </div>
          <div
            onClick={() => setActiveSubTab('reviews')}
            className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px] cursor-pointer hover:border-primary/50 transition-colors group"
          >
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider flex items-center justify-between">
              <span>Rider Rating</span>
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            </span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-black text-main">
                {ratingsData?.ratingCount > 0
                  ? `${formatRating(ratingsData.averageRating)} ★`
                  : (riderProfile.deliveryDetails?.ratingCount > 0
                      ? `${formatRating(riderProfile.deliveryDetails.rating)} ★`
                      : 'New')}
              </span>
              <span className="text-[10px] font-bold text-primary group-hover:underline">
                {ratingsData?.ratingCount > 0 ? `${ratingsData.ratingCount} Reviews` : 'View'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KYC Block Alert */}
      {user?.kycStatus !== 'Approved' && (
        <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-3xl p-5 flex gap-3 text-xs leading-relaxed font-medium">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold">Claiming orders locked</h5>
            <p className="mt-0.5">Your partner profile KYC has not been approved yet. Register your vehicle number and licensing details in the **KYC Tab** to gain verified partner access.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Navigation sidebar on desktop (mobile uses fixed bottom navigation bar) */}
        <div className="hidden lg:flex lg:col-span-1 bg-surface border border-line shadow-2xs p-2 rounded-3xl flex-col gap-1.5">
          {[
            { id: 'pool', label: 'Order Requests Pool', icon: ShoppingBag, badge: availableOrders.length },
            { id: 'orders', label: 'Claimed Runs', icon: Bike, badge: activeOrders.length },
            { id: 'wallet', label: 'Earnings & Withdrawals', icon: DollarSign },
            { id: 'history', label: 'Runs History Log', icon: Clock },
            { id: 'kyc', label: 'KYC Partner Verification', icon: ShieldCheck },
            { id: 'reviews', label: 'Ratings & Reviews', icon: Star, badge: ratingsData?.ratingCount > 0 ? ratingsData.ratingCount : undefined },
            { id: 'profile', label: 'My Profile', icon: Pencil }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left font-bold text-xs transition-all cursor-pointer ${
                  active ? 'bg-primary text-white shadow-xs' : 'text-muted hover:bg-base hover:text-main'
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

        {/* Right Side: Tab Panel view */}
        <div className="lg:col-span-3">
          
          {/* CLAIMED RUNS / ORDERS TAB */}
          {activeSubTab === 'orders' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              
              {/* Claimed orders list */}
              <div className="md:col-span-1 flex flex-col gap-3">
                <h3 className="font-display font-extrabold text-sm text-main uppercase tracking-wider pb-1">Claimed Runs</h3>
                {activeOrders.length > 0 ? (
                  activeOrders.map(order => {
                    const sourcesInfo = getOrderSourceDisplayNames(order);
                    const custName = order.customerName || order.user?.name || order.userId?.name || order.address?.name || 'Customer';
                    const dropAddress = order.customerLocation?.formattedAddress || (order.address?.street ? `${order.address.street}${order.address.city ? `, ${order.address.city}` : ''}` : (order.address?.formattedAddress || 'Customer Location'));
                    const placedTime = getOrderPlacedAt(order);

                    return (
                      <div
                        key={order._id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                          selectedOrder?._id === order._id ? 'border-primary bg-violet-50/15' : 'border-line bg-surface'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-bold text-muted">
                          <span className="font-mono">#{order._id.substr(-8).toUpperCase()}</span>
                          {(() => {
                            const restStops = Array.isArray(order.pickupStops) ? order.pickupStops.filter(s => s.sourceType === 'restaurant') : [];
                            const isCancelled = order.status === 'Cancelled' || order.status === 'Rejected';
                            if (isCancelled) {
                              return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Cancelled / Restaurant Rejected</span>;
                            }
                            if (order.status === 'Delivered' || order.status === 'Completed') {
                              return <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 border-green-200">Delivered</span>;
                            }
                            if (['Out_for_Delivery', 'Out for Delivery'].includes(order.status)) {
                              return <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border-purple-200 animate-pulse">Out for Delivery</span>;
                            }
                            if (order.orderType === 'food' && restStops.length > 0) {
                              if (restStops.every(s => s.status === 'Ready' || s.status === 'Collected')) {
                                return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">🟢 Ready for Pickup</span>;
                              }
                              if (restStops.some(s => s.status === 'Preparing')) {
                                return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">🟠 Preparing</span>;
                              }
                              return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-black">🔴 Awaiting Restaurant</span>;
                            }
                            return <span className={`px-1.5 py-0.5 rounded ${getStatusBadge(order.status)}`}>{order.status}</span>;
                          })()}
                        </div>

                        {order.orderType === 'ride' ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-yellow-600">🏍️ BIKE RIDE</span>
                            <span className="text-[10px] font-bold text-main">
                              Customer: <strong className="text-main font-extrabold">{custName}</strong>
                            </span>
                            <div className="flex flex-col gap-1 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-150 text-[10px]">
                              <span className="text-[9px] font-extrabold text-gray-500">FROM</span>
                              <span className="font-bold text-main truncate">
                                {order.pickupLocation?.formattedAddress || order.pickupAddress?.street || order.pickupAddress?.city || 'Selected Pickup'}
                              </span>
                              <span className="text-[9px] font-extrabold text-gray-500 mt-0.5">TO</span>
                              <span className="font-bold text-main truncate">
                                {order.dropLocation?.formattedAddress || order.address?.street || 'Drop Location'}
                              </span>
                            </div>
                            {placedTime && (
                              <div className="flex items-center gap-1 text-[9px] text-muted font-medium">
                                <Clock className="w-3 h-3 text-primary shrink-0" />
                                <span>Placed: {formatAppDateTime(placedTime)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-[10px]">
                            <div className="text-xs font-bold text-main">
                              Customer: <strong className="font-extrabold">{custName}</strong>
                            </div>
                            <div className="font-bold text-primary flex items-start gap-1">
                              <Store className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                              <span className="line-clamp-1">
                                {sourcesInfo.count > 1 ? `Pickups: ${sourcesInfo.summary}` : `Pickup: ${sourcesInfo.summary}`}
                              </span>
                            </div>
                            <div className="text-muted font-medium flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" />
                              <span className="line-clamp-1">Deliver To: {dropAddress}</span>
                            </div>
                            {placedTime && (
                              <div className="flex items-center gap-1 text-[9px] text-muted font-medium mt-0.5">
                                <Clock className="w-3 h-3 text-primary shrink-0" />
                                <span>Placed: {formatAppDateTime(placedTime)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="border-t border-line pt-2 flex justify-between items-center text-[10px] font-bold text-muted">
                          <span>Grand Total: {formatCurrency(order.total ?? order.fare)}</span>
                          <span className="text-primary flex items-center gap-0.5">Track <ChevronRight className="w-3 h-3" /></span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-surface rounded-2xl p-6 text-center border border-line flex flex-col items-center gap-1.5">
                    <Bike className="w-8 h-8 text-gray-300" />
                    <h4 className="text-xs font-bold text-main">No active dispatches</h4>
                    <p className="text-[10px] text-muted">Claim runs from the "Requests Pool" tab.</p>
                  </div>
                )}
              </div>

              {/* Active map and controls */}
              <div className="md:col-span-2">
                {selectedOrder ? (
                  <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4 animate-scale-up">
                    <div className="flex justify-between items-center border-b border-line pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-sm text-main">
                          {selectedOrder.orderType === 'ride' ? '🏍️ BIKE RIDE' : 'Dispatch Details'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted font-medium mt-0.5">
                          <span className="font-mono font-bold">ID: #{selectedOrder._id.substr(-8).toUpperCase()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-main">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            Placed: {formatAppDateTime(selectedOrder.createdAt)}
                          </span>
                        </div>
                      </div>
                      {(() => {
                        const restStops = Array.isArray(selectedOrder.pickupStops) ? selectedOrder.pickupStops.filter(s => s.sourceType === 'restaurant') : [];
                        const isCancelled = selectedOrder.status === 'Cancelled' || selectedOrder.status === 'Rejected';
                        if (isCancelled) {
                          return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">Cancelled / Restaurant Rejected</span>;
                        }
                        if (selectedOrder.status === 'Delivered' || selectedOrder.status === 'Completed') {
                          return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">Delivered</span>;
                        }
                        if (['Out_for_Delivery', 'Out for Delivery'].includes(selectedOrder.status)) {
                          return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 animate-pulse">Out for Delivery</span>;
                        }
                        if (selectedOrder.orderType === 'food' && restStops.length > 0) {
                          if (restStops.every(s => s.status === 'Ready' || s.status === 'Collected')) {
                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">🟢 Ready for Pickup</span>;
                          }
                          if (restStops.some(s => s.status === 'Preparing')) {
                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">🟠 Preparing</span>;
                          }
                          return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">🔴 Awaiting Restaurant</span>;
                        }
                        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>;
                      })()}
                    </div>

                    {/* Real Google Maps tracking map using exact order location snapshots */}
                    {!['Delivered', 'Completed'].includes(selectedOrder.status) && (
                      <InteractiveMap 
                        status={selectedOrder.status} 
                        restaurantName={selectedOrder.orderType === 'ride' ? 'Pickup Point' : (selectedOrderRestaurantName || 'Restaurant')}
                        restaurantAddress={selectedOrder.orderType === 'ride' ? (selectedOrder.pickupLocation?.formattedAddress || selectedOrder.pickupAddress?.street || '') : (selectedOrder.restaurantLocation?.formattedAddress || '')}
                        restaurantLat={selectedOrder.orderType !== 'ride' ? selectedOrder.restaurantLocation?.lat : undefined}
                        restaurantLng={selectedOrder.orderType !== 'ride' ? selectedOrder.restaurantLocation?.lng : undefined}
                        customerName={selectedOrder.customerName || selectedOrder.user?.name || selectedOrder.userId?.name || 'Customer'}
                        customerAddress={selectedOrder.orderType === 'ride' ? (selectedOrder.dropLocation?.formattedAddress || selectedOrder.address?.street || '') : (selectedOrder.customerLocation?.formattedAddress || selectedOrder.address?.street || '')}
                        customerLat={selectedOrder.orderType !== 'ride' ? selectedOrder.customerLocation?.lat : undefined}
                        customerLng={selectedOrder.orderType !== 'ride' ? selectedOrder.customerLocation?.lng : undefined}
                        deliveryMethod={selectedOrder.orderType === 'ride' ? 'Ride' : 'Standard'}
                        orderId={selectedOrder._id}
                        isRide={selectedOrder.orderType === 'ride'}
                        ridePickupLat={selectedOrder.orderType === 'ride' ? (selectedOrder.pickupLocation?.lat ?? selectedOrder.customerLocation?.lat) : undefined}
                        ridePickupLng={selectedOrder.orderType === 'ride' ? (selectedOrder.pickupLocation?.lng ?? selectedOrder.customerLocation?.lng) : undefined}
                        rideDropLat={selectedOrder.orderType === 'ride' ? (selectedOrder.dropLocation?.lat ?? selectedOrder.restaurantLocation?.lat) : undefined}
                        rideDropLng={selectedOrder.orderType === 'ride' ? (selectedOrder.dropLocation?.lng ?? selectedOrder.restaurantLocation?.lng) : undefined}
                        riderLat={riderLoc?.lat}
                        riderLng={riderLoc?.lng}
                        gpsStatus={gpsStatus}
                        supplierDeliveries={selectedOrder.supplierDeliveries || []}
                        pickupStops={selectedOrder.pickupStops || []}
                        routeSequence={selectedOrder.routeSequence || []}
                      />
                    )}

                    {/* Unified Pickup Stops Panel — shows ALL sources (suppliers + restaurant) */}
                    {(() => {
                      const stopsProgress = getPickupStopsProgress(selectedOrder);
                      if (!stopsProgress.hasStops) {
                        // Legacy: fall back to old supplierDeliveries display if no pickupStops
                        if (!Array.isArray(selectedOrder.supplierDeliveries) || selectedOrder.supplierDeliveries.length === 0) return null;
                        return (
                          <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-3">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-main flex items-center gap-1.5">
                              🏪 Store Pickup Stops ({selectedOrder.supplierDeliveries.length})
                            </h5>
                            <div className="flex flex-col gap-2">
                              {selectedOrder.supplierDeliveries.map((sup, sIdx) => (
                                <div key={sup.supplierId || sIdx} className="bg-surface border border-line rounded-xl p-3 flex flex-col gap-1 shadow-2xs">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold text-xs text-main">{sup.supplierName || 'Store'}</p>
                                    {sup.distanceKm != null && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">{sup.distanceKm} km</span>}
                                  </div>
                                  {Array.isArray(sup.items) && sup.items.length > 0 && (
                                    <div className="bg-base/70 rounded-lg p-2 flex flex-col gap-1 border border-line/60 text-[11px]">
                                      {sup.items.map((it, itIdx) => {
                                        const uPrice = Number(it.price || 0);
                                        const qty = Number(it.quantity || 1);
                                        return (
                                          <div key={itIdx} className="flex justify-between items-center font-medium text-main">
                                            <span>• {it.itemName || it.name} {it.unit ? `(${it.unit})` : ''}</span>
                                            <span className="font-bold text-muted">Qty: {qty} × {formatCurrency(uPrice)} = {formatCurrency(uPrice * qty)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      const { total, collected, allCollected } = stopsProgress;
                      const isDelivering = ['Out_for_Delivery', 'Out for Delivery', 'Rider_At_Customer', 'Delivered', 'Completed'].includes(selectedOrder.status);

                      return (
                        <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-main flex items-center gap-1.5">
                              📦 Pickup Stops
                            </h5>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allCollected || isDelivering ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-primary'}`}>
                              {isDelivering ? 'All Collected' : `${collected}/${total} Collected`}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-line rounded-full h-1.5">
                            <div
                              className="bg-primary rounded-full h-1.5 transition-all duration-500"
                              style={{ width: `${total > 0 ? (collected / total) * 100 : 0}%` }}
                            />
                          </div>

                          {/* Each stop */}
                          <div className="flex flex-col gap-2.5">
                            {selectedOrder.pickupStops.map((stop, sIdx) => {
                              const stopId = String(stop._id || stop.stopId || sIdx);
                              const isSupplier = stop.sourceType === 'supplier';
                              const isCollected = stop.status === 'Collected';
                              const isArrived = stop.status === 'Rider_Arrived';
                              const isStopRejected = stop.status === 'Rejected' || stop.status === 'Cancelled';
                              const isRestaurantNotReady = stop.sourceType === 'restaurant' && ['Pending', 'Preparing'].includes(stop.status);
                              const isRestaurantReady = stop.sourceType === 'restaurant' && stop.status === 'Ready';
                              const isUpdatingStop = Boolean(updatingId && (updatingId === (selectedOrder._id + '_stop_' + stopId) || updatingId.includes('_stop_' + stopId)));

                              return (
                                <div
                                  key={stopId}
                                  className={`border rounded-xl p-3 flex flex-col gap-2 shadow-2xs transition-all ${
                                    isStopRejected ? 'bg-red-50/60 border-red-200 opacity-75' :
                                    isCollected ? 'bg-green-50 border-green-150' :
                                    isSupplier ? 'bg-surface border-line' :
                                    'bg-orange-50/50 border-orange-100'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-5 h-5 rounded-full font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 ${
                                        isStopRejected ? 'bg-red-500 text-white' :
                                        isCollected ? 'bg-green-600 text-white' :
                                        isSupplier ? 'bg-violet-600 text-white' :
                                        'bg-orange-500 text-white'
                                      }`}>
                                        {isStopRejected ? '✕' : isCollected ? '✓' : sIdx + 1}
                                      </span>
                                      <div>
                                        <h6 className="font-bold text-xs text-main flex items-center gap-1">
                                          {isSupplier ? '🏪' : '🍴'} {stop.sourceName || 'Pickup Stop'}
                                        </h6>
                                        {stop.address && <p className="text-[10px] text-muted line-clamp-1">{stop.address}</p>}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                      {stop.distanceKm != null && stop.distanceKm > 0 && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{formatDistance(stop.distanceKm)}</span>
                                      )}
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                        isStopRejected ? 'bg-red-100 text-red-700' :
                                        isCollected ? 'bg-green-100 text-green-700' :
                                        isArrived ? 'bg-violet-100 text-violet-700' :
                                        (!isRestaurantNotReady) ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {isStopRejected ? 'Cancelled' :
                                         isCollected ? 'Collected' :
                                         isArrived ? 'Rider Arrived' :
                                         isRestaurantNotReady ? 'Preparing' :
                                         'Ready for Pickup'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Items with customer unit prices and line totals */}
                                  {Array.isArray(stop.items) && stop.items.length > 0 && (
                                    <div className="bg-base/70 rounded-lg p-2.5 flex flex-col gap-1 border border-line/60">
                                      <span className="text-[9px] uppercase font-extrabold text-muted">Items to Collect:</span>
                                      {stop.items.map((it, itIdx) => {
                                        const uPrice = Number(it.price || it.customerUnitPrice || 0);
                                        const qty = Number(it.quantity || 1);
                                        const lTotal = uPrice * qty;
                                        return (
                                          <div key={itIdx} className="flex justify-between items-center text-[11px] font-medium text-main">
                                            <span className={isStopRejected ? 'line-through text-red-500' : ''}>
                                              • {it.itemName || it.name} {it.unit ? `(${it.unit})` : ''}
                                            </span>
                                            <div className="flex items-center gap-2 text-right">
                                              <span className="text-[10px] text-muted font-bold">Qty: {qty} × {formatCurrency(uPrice)} =</span>
                                              <span className="font-bold text-main">{formatCurrency(lTotal)}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      <div className="flex justify-between items-center text-[10px] font-bold text-muted border-t border-line/60 pt-1.5 mt-0.5">
                                        <span>Source Subtotal:</span>
                                        <span className="font-extrabold text-main">
                                          {formatCurrency(stop.items.reduce((sum, it) => sum + (Number(it.price || it.customerUnitPrice || 0) * Number(it.quantity || 1)), 0))}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Phone & Call Button */}
                                  {stop.sourcePhone && !isStopRejected && (
                                    <div className="flex items-center justify-between bg-violet-50/70 border border-violet-150 rounded-xl px-3 py-2 mt-0.5">
                                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-900">
                                        <Phone className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                                        <span>{stop.sourcePhone}</span>
                                      </div>
                                      <a
                                        href={`tel:${stop.sourcePhone}`}
                                        className="text-[10px] font-black text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>Call {isSupplier ? 'Store' : 'Restaurant'}</span>
                                      </a>
                                    </div>
                                  )}

                                  {/* Per-stop milestone buttons */}
                                  {!isCollected && !isDelivering && (
                                    <div className="flex gap-1.5 mt-1">
                                      {/* Stop was Rejected / Cancelled */}
                                      {isStopRejected && (
                                        <span className="flex-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1">
                                          <XCircle className="w-3.5 h-3.5" /> Stop Cancelled / Rejected (Skip)
                                        </span>
                                      )}

                                      {/* Restaurant food not ready yet */}
                                      {!isStopRejected && isRestaurantNotReady && (
                                        <span className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1">
                                          <Clock className="w-3.5 h-3.5" /> Waiting for Restaurant
                                        </span>
                                      )}

                                      {/* Stop is Ready for Pickup — show Reached Store / Reached Restaurant */}
                                      {!isStopRejected && !isArrived && (isRestaurantReady || isSupplier) && (
                                        <button
                                          onClick={() => handleUpdateStopStatus(selectedOrder._id, stopId, 'Rider_Arrived')}
                                          disabled={isUpdatingStop}
                                          className={`flex-1 ${isSupplier ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} text-white text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50`}
                                        >
                                          <MapPin className="w-3.5 h-3.5" />
                                          {isUpdatingStop ? 'Updating...' : (isSupplier ? 'Reached Store' : 'Reached Restaurant')}
                                        </button>
                                      )}

                                      {/* Rider has reached the stop — show Collect Items / Collect Food */}
                                      {!isStopRejected && isArrived && (
                                        <button
                                          onClick={() => handleUpdateStopStatus(selectedOrder._id, stopId, 'Collected')}
                                          disabled={isUpdatingStop}
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          {isUpdatingStop ? 'Collecting...' : (isSupplier ? 'Collect Items' : 'Collect Food')}
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {isCollected && (
                                    <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold">
                                      <CheckCircle className="w-3.5 h-3.5" /> Collected ✓
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Out_for_Delivery guard warning */}
                          {!allCollected && !isDelivering && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] font-bold text-amber-800 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
                              <span>
                                {collected} of {total} stops collected. Collect all items before starting delivery.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Rider Financial Overview: Customer Collection vs Rider Earnings */}
                    {selectedOrder.orderType !== 'ride' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        {/* Customer Payment to Collect */}
                        <div className="bg-surface border border-line rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Customer Payment</span>
                            <span className="text-[9px] font-bold text-muted bg-base px-1.5 py-0.5 rounded border border-line uppercase">
                              {selectedOrder.paymentDetails?.method || (selectedOrder.paymentMethod === 'COD' || !selectedOrder.paymentMethod ? 'Cash on Delivery' : selectedOrder.paymentMethod)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Items Subtotal</span>
                            <span className="font-bold text-main">{formatCurrency(getOrderFinancialBreakdown(selectedOrder).customer.itemsSubtotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Delivery Fee</span>
                            <span className="font-bold text-main">{formatCurrency(getOrderFinancialBreakdown(selectedOrder).customer.totalCustomerDeliveryFee)}</span>
                          </div>
                          {getOrderFinancialBreakdown(selectedOrder).customer.platformFee > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted font-medium">Platform Fee</span>
                              <span className="font-bold text-main">{formatCurrency(getOrderFinancialBreakdown(selectedOrder).customer.platformFee)}</span>
                            </div>
                          )}
                          <div className="border-t border-line pt-1.5 flex justify-between items-center text-xs font-black">
                            <span className="text-main">Amount to Collect (COD)</span>
                            <span className="text-primary text-sm font-black">{formatCurrency(selectedOrder.total)}</span>
                          </div>
                        </div>

                        {/* Rider Delivery Earnings */}
                        <div className="bg-surface border border-line rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Rider Earnings</span>
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 uppercase">
                              Wallet Credit
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Base Delivery Earning</span>
                            <span className="font-bold text-main">{formatCurrency(getOrderFinancialBreakdown(selectedOrder).rider.basePayout)}</span>
                          </div>
                          {getOrderFinancialBreakdown(selectedOrder).rider.additionalStopPayout > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted font-medium">Additional Stops Bonus</span>
                              <span className="font-bold text-main">{formatCurrency(getOrderFinancialBreakdown(selectedOrder).rider.additionalStopPayout)}</span>
                            </div>
                          )}
                          {selectedOrder.riderReview?.tipAmount > 0 && (
                            <div className="flex justify-between items-center text-xs text-green-600 font-bold">
                              <span>Customer Tip</span>
                              <span>+{formatCurrency(selectedOrder.riderReview.tipAmount)}</span>
                            </div>
                          )}
                          <div className="border-t border-line pt-1.5 flex justify-between items-center text-xs font-black">
                            <span className="text-main">Total Rider Earning</span>
                            <span className="text-green-600 text-sm font-black">
                              {formatCurrency((Number(getOrderFinancialBreakdown(selectedOrder).rider.totalRiderPayout) || 0) + (Number(selectedOrder.riderReview?.tipAmount) || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        {/* Customer Ride Fare */}
                        <div className="bg-surface border border-yellow-200/80 rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-[9px] uppercase font-extrabold tracking-wider text-yellow-700">Ride Fare (Customer)</span>
                            <span className="text-[9px] font-bold text-yellow-800 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200 uppercase">
                              {selectedOrder.paymentDetails?.method || (selectedOrder.paymentMethod === 'COD' || !selectedOrder.paymentMethod ? 'Cash on Drop' : selectedOrder.paymentMethod)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Estimated Distance</span>
                            <span className="font-bold text-main">{formatDistance(selectedOrder.distance)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Total Ride Fare</span>
                            <span className="font-bold text-main">{formatCurrency(selectedOrder.total ?? selectedOrder.fare)}</span>
                          </div>
                          <div className="border-t border-line pt-1.5 flex justify-between items-center text-xs font-black">
                            <span className="text-main">Amount to Collect (Cash)</span>
                            <span className="text-yellow-700 text-sm font-black">{formatCurrency(selectedOrder.total ?? selectedOrder.fare)}</span>
                          </div>
                        </div>

                        {/* Rider Captain Earnings */}
                        <div className="bg-surface border border-line rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Captain Earning</span>
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 uppercase">
                              Wallet Credit
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium">Ride Payout</span>
                            <span className="font-bold text-main">
                              {formatCurrency(selectedOrder.pricingSnapshot?.rider?.totalRiderPayout ?? selectedOrder.riderPayout ?? selectedOrder.riderEarning ?? selectedOrder.total ?? selectedOrder.fare)}
                            </span>
                          </div>
                          {selectedOrder.riderReview?.tipAmount > 0 && (
                            <div className="flex justify-between items-center text-xs text-green-600 font-bold">
                              <span>Customer Tip</span>
                              <span>+{formatCurrency(selectedOrder.riderReview.tipAmount)}</span>
                            </div>
                          )}
                          <div className="border-t border-line pt-1.5 flex justify-between items-center text-xs font-black">
                            <span className="text-main">Total Captain Earning</span>
                            <span className="text-green-600 text-sm font-black">
                              {formatCurrency((Number(selectedOrder.pricingSnapshot?.rider?.totalRiderPayout ?? selectedOrder.riderPayout ?? selectedOrder.riderEarning ?? selectedOrder.total ?? selectedOrder.fare ?? 0)) + (Number(selectedOrder.riderReview?.tipAmount) || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Driver Instructions */}
                    {selectedOrder.instruction && (
                      <div className="bg-violet-50/50 border border-violet-100 text-violet-900 rounded-2xl p-4 flex gap-2.5 text-xs leading-relaxed font-medium">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-main">Driver Instructions</h5>
                          <p className="mt-0.5 text-gray-655 font-semibold">{selectedOrder.instruction}</p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {(selectedOrder.status === 'Rider_Assigned' || (selectedOrder.orderType === 'food' && selectedOrder.riderStatus === 'Pending' && (selectedOrder.deliveryAgent?.id === user?._id || selectedOrder.deliveryAgent?.phone === user?.phone))) ? (
                      <div className="bg-base border border-gray-150 p-4 rounded-2xl flex flex-col gap-2">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Milestone Control</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder._id, 'Rider_Accepted')}
                            disabled={updatingId === selectedOrder._id}
                            className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-4.5 h-4.5" />
                            <span>{selectedOrder.orderType === 'ride' ? 'ACCEPT RIDE' : 'ACCEPT ORDER'}</span>
                          </button>
                          <button
                            onClick={() => { setRejectingOrderId(selectedOrder._id); setRejectionReason(''); setCustomRejectionReason(''); }}
                            disabled={updatingId === selectedOrder._id}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span>{selectedOrder.orderType === 'ride' ? 'REJECT RIDE' : 'REJECT'}</span>
                          </button>
                        </div>
                      </div>
                    ) : getNextRiderAction(selectedOrder.status, selectedOrder.orderType, selectedOrder) ? (
                      <div className="bg-base border border-gray-150 p-4 rounded-2xl flex flex-col gap-2">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Milestone Control</span>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder._id, getNextRiderAction(selectedOrder.status, selectedOrder.orderType, selectedOrder).next)}
                          disabled={updatingId === selectedOrder._id}
                          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-4.5 h-4.5" />
                          <span>{updatingId === selectedOrder._id ? 'Updating...' : getNextRiderAction(selectedOrder.status, selectedOrder.orderType, selectedOrder).label}</span>
                        </button>
                      </div>
                    ) : ['Delivered', 'Completed'].includes(selectedOrder.status) ? (
                      <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold p-3.5 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>{selectedOrder.orderType === 'ride' ? '✅ Ride successfully completed!' : '✅ Delivery successfully completed!'}</span>
                      </div>
                    ) : (
                      <div className="bg-violet-50 border border-violet-100 text-violet-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 animate-pulse">
                        <Clock className="w-5 h-5 text-primary" />
                        <span>
                          {selectedOrder.orderType === 'ride'
                            ? 'Waiting for pickup...'
                            : Array.isArray(selectedOrder.pickupStops) && selectedOrder.pickupStops.length > 0
                              ? 'Collecting items from pickup stops...'
                              : 'Awaiting preparation...'}
                        </span>
                      </div>
                    )}

                    {/* Live Chat Panel */}
                    {selectedOrder.status !== 'Delivered' && (
                    <div className="rounded-2xl p-4 border border-gray-150 flex flex-col gap-3 bg-surface mt-1">
                      <h4 className="font-display font-extrabold text-xs text-gray-805 uppercase tracking-wider pb-1 border-b border-line flex items-center justify-between">
                        <span>{selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status) ? 'Live Chat with Restaurant' : 'Live Chat with Customer'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </h4>

                      {/* Scrollable messages container */}
                      <div ref={chatContainerRef} className="h-48 overflow-y-auto flex flex-col gap-3 pr-1.5 scrollbar-thin">
                        {selectedOrder.messages && selectedOrder.messages.length > 0 ? (
                          selectedOrder.messages
                            .filter(msg => {
                              const isBeforePickup = selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status);
                              if (isBeforePickup) {
                                // Before pickup: Only show restaurant messages or rider messages targeted at restaurant
                                return msg.sender === 'restaurant' || msg.sender === 'system' || (msg.sender === 'rider' && msg.target !== 'customer');
                              } else {
                                // After pickup: Only show customer messages or rider messages targeted at customer
                                return msg.sender === 'customer' || msg.sender === 'system' || (msg.sender === 'rider' && msg.target !== 'restaurant');
                              }
                            })
                            .map((msg, idx) => {
                            if (msg.sender === 'system') {
                              return (
                                <div key={idx} className="text-[9px] text-muted font-bold text-center bg-base/70 py-1 px-2.5 rounded-lg w-max mx-auto max-w-[85%] border border-line">
                                  {msg.text}
                                </div>
                              );
                            }

                            const isMe = msg.sender === 'rider';
                            return (
                              <div 
                                key={idx} 
                                className={`flex flex-col gap-0.5 max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                              >
                                <div className={`px-3 py-1.5 rounded-2xl text-xs font-semibold leading-normal ${
                                  isMe 
                                    ? 'bg-primary text-white rounded-tr-none shadow-3xs' 
                                    : 'bg-gray-100 text-main rounded-tl-none border border-gray-150'
                                }`}>
                                  {msg.text}
                                </div>
                                <span className="text-[7px] text-muted font-medium">
                                  {formatAppTimeOnly(msg.createdAt)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex-grow flex flex-col items-center justify-center text-center text-muted gap-1.5 py-6">
                            <span className="text-lg">💬</span>
                            <p className="text-[10px] font-bold text-muted">No messages yet</p>
                            <p className="text-[9px] max-w-[160px] leading-tight">Send a message to coordinate direction details with the {selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status) ? 'restaurant' : 'customer'}.</p>
                          </div>
                        )}
                      </div>

                      {/* Message Input Box */}
                      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-line pt-2 mt-0.5">
                        <input
                          type="text"
                          placeholder={`Type a message to ${selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status) ? 'restaurant' : 'customer'}...`}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="bg-base border border-line-strong focus:border-primary focus:bg-surface rounded-xl px-3 py-2 text-xs text-main outline-none flex-grow"
                        />
                        <button
                          type="submit"
                          disabled={!messageText.trim() || isSending}
                          className="bg-primary hover:bg-primary-hover text-white p-2 rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                    )}

                    {/* Address details */}
                    {(() => {
                      if (selectedOrder.status === 'Delivered') {
                        return (
                          <div className="flex flex-col gap-3">
                            <div className="bg-green-50 border border-green-100 text-green-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span>{selectedOrder.orderType === 'ride' ? 'Ride successfully completed! Earnings credited to wallet.' : 'Order successfully delivered! Earnings credited to wallet.'}</span>
                            </div>
                            {Number(selectedOrder.riderReview?.rating) > 0 ? (
                              <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold text-muted uppercase tracking-wider flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" /> Customer Feedback
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`w-3.5 h-3.5 ${s <= selectedOrder.riderReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                                    ))}
                                  </div>
                                </div>
                                {selectedOrder.riderReview?.tipAmount > 0 && (
                                  <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                                    <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                                      <Heart className="w-3 h-3 text-green-600 fill-green-100" /> Tip Received
                                    </span>
                                    <span className="text-sm font-black text-green-700">₹{selectedOrder.riderReview.tipAmount}</span>
                                  </div>
                                )}
                                {selectedOrder.riderReview?.comment && (
                                  <div className="bg-surface/60 rounded-xl px-3 py-2.5 border border-violet-100/50">
                                    <p className="text-[10px] text-muted font-semibold italic">"{selectedOrder.riderReview.comment}"</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-base border border-line rounded-2xl p-3 text-center">
                                <p className="text-[10px] text-muted font-semibold">Awaiting customer feedback...</p>
                              </div>
                            )}
                          </div>
                        );
                      }

                      const isBeforePickup = selectedOrder.orderType === 'food' && ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(selectedOrder.status);
                      
                      if (selectedOrder.orderType === 'ride') {
                        return (
                          <div className="border border-line p-4 rounded-2xl flex items-center justify-between shadow-xs">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Customer</span>
                              <h5 className="font-bold text-main text-sm">
                                {selectedOrder.customerName || selectedOrder.user?.name || selectedOrder.userId?.name || 'Customer'}
                              </h5>
                              <p className="text-[10px] text-gray-500 font-semibold max-w-[200px] truncate">
                                {selectedOrder.pickupLocation?.formattedAddress || selectedOrder.pickupAddress?.street || 'Pickup'} 
                                {' → '} 
                                {selectedOrder.dropLocation?.formattedAddress || selectedOrder.address?.street || 'Drop'}
                              </p>
                            </div>
                            <a 
                              href={`tel:${selectedOrder.customerPhone || selectedOrder.user?.phone || selectedOrder.userId?.phone}`}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call Customer</span>
                            </a>
                          </div>
                        );
                      }

                      return (
                        <div className="border border-primary p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                          {isBeforePickup ? (
                            <>
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-primary font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3" /> Pickup Kitchen
                                </span>
                                <h5 className="font-bold text-main text-sm">
                                  {selectedOrderRestaurantName || 'Restaurant'}
                                </h5>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5 max-w-[250px] leading-relaxed">
                                  {selectedOrderRestaurantAddress || 'Restaurant Address'}
                                </p>
                              </div>
                              {selectedOrderRestaurantPhone && (
                                <a 
                                  href={`tel:${selectedOrderRestaurantPhone}`}
                                  className="bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                                >
                                  <Phone className="w-4 h-4" />
                                  <span>Call Restaurant</span>
                                </a>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-primary font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3" /> Drop Customer
                                </span>
                                <h5 className="font-bold text-main text-sm">
                                  {selectedOrder.customerName || selectedOrder.user?.name || selectedOrder.userId?.name || 'Customer'}
                                </h5>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5 max-w-[250px] leading-relaxed">
                                  {selectedOrder.customerLocation?.formattedAddress || `${selectedOrder.address?.street || 'Customer Location'}, ${selectedOrder.address?.city || ''}, ${selectedOrder.address?.state || ''} - ${selectedOrder.address?.zip || ''}`}
                                </p>
                              </div>
                              <a 
                                href={`tel:${selectedOrder.userId?.phone || selectedOrder.customerPhone || selectedOrder.user?.phone}`}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call Customer</span>
                              </a>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-surface rounded-3xl border border-line p-16 text-center flex flex-col items-center justify-center gap-3">
                    <Bike className="w-10 h-10 text-gray-300" />
                    <h4 className="font-display font-extrabold text-sm text-main">No dispatch selected</h4>
                    <p className="text-xs text-muted max-w-xs leading-relaxed">Select a claimed run from the left panel to load the routing map and milestones.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* AVAILABLE ORDERS POOL TAB */}
          {activeSubTab === 'pool' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Active Order Requests Pool</h3>

              {claimConflictMsg && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span>{claimConflictMsg}</span>
                  <button onClick={() => setClaimConflictMsg('')} className="ml-auto text-amber-400 hover:text-amber-700 cursor-pointer">✕</button>
                </div>
              )}

              {user?.kycStatus !== 'Approved' ? (
                <p className="text-xs text-red-500 italic">Please approve your KYC to fetch orders.</p>
              ) : !isAvailable ? (
                <div className="bg-violet-50/50 border border-violet-100 rounded-3xl p-8 text-center flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-primary" />
                  <h4 className="text-xs font-bold text-main uppercase">You are currently offline</h4>
                  <p className="text-[10px] text-muted font-semibold max-w-xs">Toggle the "Duty" switch in the header to Online to accept requests from customers.</p>
                </div>
              ) : availableOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableOrders.map(order => (
                    <div key={order._id} className={`bg-surface border p-5 rounded-3xl shadow-2xs flex flex-col gap-3 justify-between ${order.orderType === 'ride' ? 'border-yellow-200' : 'border-line'}`}>
                      <div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-muted pb-2 border-b border-line">
                          <span className={order.orderType === 'ride' ? 'text-yellow-600' : ''}>
                            {order.orderType === 'ride' ? '🏍️ RIDE REQUEST' : 'FOOD ORDER'} #{order._id.substr(-8).toUpperCase()}
                          </span>
                          <span className={order.orderType === 'ride' ? 'text-yellow-700' : ''}>
                            {formatCurrency(order.total ?? order.fare)} {order.orderType === 'ride' ? 'fare' : 'total'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold mt-2">
                          <Clock className="w-3 h-3 text-primary shrink-0" />
                          <span>Placed: {formatAppDateTime(order.createdAt)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2 text-xs leading-tight font-bold">
                          {order.orderType === 'ride' ? (
                            <>
                              <div className="flex items-center gap-1.5 text-main">
                                <span className="font-extrabold text-[10px] text-gray-500 w-16">CUSTOMER:</span>
                                <span className="truncate">{order.customerName || order.user?.name || order.userId?.name || 'Customer'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-main">
                                <span className="font-extrabold text-[10px] text-gray-500 w-10">FROM:</span>
                                <span className="truncate">{order.pickupLocation?.formattedAddress || order.pickupAddress?.street || order.pickupAddress?.city || (order.pickupLocation?.lat != null && order.pickupLocation?.lng != null ? `${Number(order.pickupLocation.lat).toFixed(4)}, ${Number(order.pickupLocation.lng).toFixed(4)}` : 'Selected Pickup')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted">
                                <span className="font-extrabold text-[10px] text-gray-400 w-10">TO:</span>
                                <span className="truncate">{order.dropLocation?.formattedAddress || order.address?.street || 'Drop Location'}</span>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                                <span>{order.distance != null ? formatDistance(order.distance) : ''}</span>
                                <span className="font-bold text-green-600">
                                  Earning: {formatCurrency(order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare)}
                                </span>
                              </div>
                            </>
                          ) : (() => {
                            // Determine order type for display
                            const hasSuppliers = Array.isArray(order.pickupStops) && order.pickupStops.some(s => s.sourceType === 'supplier');
                            const hasRestaurant = Array.isArray(order.pickupStops) && order.pickupStops.some(s => s.sourceType === 'restaurant');
                            const isMixed = hasSuppliers && hasRestaurant;
                            const isCatalogOnly = hasSuppliers && !hasRestaurant;
                            const isFoodOnly = !hasSuppliers && hasRestaurant;

                            const typeLabel = isMixed ? '🔀 MIXED ORDER' : isCatalogOnly ? '🏪 STORE DELIVERY' : '🍽 FOOD ORDER';
                            const typeColor = isMixed ? 'text-violet-600' : isCatalogOnly ? 'text-emerald-600' : 'text-orange-500';

                            // Collect all pickup sources for display
                            const pickupSources = Array.isArray(order.pickupStops) && order.pickupStops.length > 0
                              ? order.pickupStops
                              : hasRestaurant
                                ? [{ sourceType: 'restaurant', sourceName: order.restaurant?.name || 'Restaurant', items: [] }]
                                : (order.supplierDeliveries || []).map(sd => ({ sourceType: 'supplier', sourceName: sd.supplierName || 'Store', items: sd.items || [] }));

                            return (
                              <>
                                <div className={`text-[10px] font-black ${typeColor} tracking-wide`}>{typeLabel}</div>
                                <div className="flex items-center gap-1.5 text-main text-xs font-bold mt-1">
                                  <span className="font-extrabold text-[10px] text-gray-500 w-24">CUSTOMER:</span>
                                  <span className="truncate">{order.customerName || order.user?.name || order.userId?.name || 'Customer'}</span>
                                </div>
                                {/* Pickup sources */}
                                <div className="mt-2 flex flex-col gap-1.5">
                                  {pickupSources.slice(0, 3).map((src, si) => {
                                    const isRest = src.sourceType === 'restaurant';
                                    const stopStatus = src.status || (isRest ? 'Pending' : 'Ready');
                                    const isReady = !isRest || stopStatus === 'Ready';
                                    const statusLabel = isReady
                                      ? '🟢 Ready for Pickup'
                                      : stopStatus === 'Preparing'
                                        ? '🟠 Preparing'
                                        : '🔴 Awaiting Restaurant';
                                    const statusClass = isReady
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : stopStatus === 'Preparing'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-red-100 text-red-700 border border-red-200 font-bold';

                                    return (
                                      <div key={si} className={`flex items-start justify-between gap-1.5 ${isRest ? 'bg-orange-50/80 border-orange-100' : 'bg-emerald-50/80 border-emerald-100'} border rounded-lg p-1.5`}>
                                        <div className="flex items-start gap-1.5 min-w-0">
                                          <span className="text-[11px] flex-shrink-0 mt-0.5">{isRest ? '🍴' : '🏪'}</span>
                                          <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-main truncate">{src.sourceName}</p>
                                            {Array.isArray(src.items) && src.items.length > 0 && (
                                              <p className="text-[9px] text-muted truncate">
                                                {src.items.slice(0, 2).map(it => `${it.itemName || it.name || ''}${it.unit ? ` (${it.unit})` : ''} ×${it.quantity || 1}`).join(', ')}
                                                {src.items.length > 2 ? ` +${src.items.length - 2} more` : ''}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0 self-start ${statusClass}`}>
                                          {statusLabel}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {pickupSources.length > 3 && (
                                    <p className="text-[9px] text-muted font-semibold pl-1">+{pickupSources.length - 3} more stops</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-muted text-[10px] font-semibold mt-2">
                                  <span className="font-extrabold text-[10px] text-gray-400 w-24">DELIVER TO:</span>
                                  <span className="truncate">{order.customerLocation?.formattedAddress || `${order.address?.street || 'Customer Location'}, ${order.address?.city || ''}`}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                                  <span>{order.distance != null ? formatDistance(order.distance) : ''} {pickupSources.length > 1 ? `• ${pickupSources.length} stops` : ''}</span>
                                  <span className="font-bold text-green-600">Earning: {formatCurrency(getOrderFinancialBreakdown(order).rider.totalRiderPayout)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-line/60">
                        <button
                          id={`btn-accept-order-${order._id}`}
                          onClick={() => handleAcceptOrder(order._id)}
                          disabled={updatingId === order._id}
                          className={`w-full ${order.orderType === 'ride' ? 'bg-yellow-400 hover:bg-yellow-500 text-black' : 'bg-primary hover:bg-primary-hover text-white'} text-xs font-black py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm active:scale-[0.99]`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{updatingId === order._id ? 'Claiming...' : (order.orderType === 'ride' ? 'ACCEPT & CLAIM RIDE' : 'ACCEPT & CLAIM DELIVERY')}</span>
                        </button>
                        <button
                          id={`btn-reject-order-${order._id}`}
                          onClick={() => {
                            setRejectingOrder(order);
                            setRejectModalStep('confirm');
                            setRejectReasonCode('');
                            setRejectReasonText('');
                            setRejectNote('');
                            setRejectErrorMsg('');
                          }}
                          disabled={updatingId === order._id}
                          className="w-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 hover:border-red-300 text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs active:scale-[0.99]"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>REJECT ORDER</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                  <ShoppingBag className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">No pending dispatches</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">All customer orders have been successfully claimed. New requests will stream here.</p>
                </div>
              )}
            </div>
          )}

          {/* WALLET & WITHDRAWALS TAB */}
          {activeSubTab === 'wallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Request form */}
              <div className="flex flex-col gap-4">
                <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Earnings Cashout</h3>
                
                <form onSubmit={handleWithdrawalRequest} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Withdrawal Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main outline-none font-bold"
                    />
                  </div>

                  {withdrawalMsg && (
                    <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold p-2.5 rounded-xl flex gap-1">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{withdrawalMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isWithdrawing}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Processing payout...' : 'Submit Payout Request'}
                  </button>
                </form>
              </div>

              {/* Earnings info card */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 flex flex-col gap-4 text-emerald-800">
                <h4 className="font-display font-extrabold text-sm uppercase">Wallet Rules</h4>
                <ul className="text-xs leading-relaxed font-semibold flex flex-col gap-2 list-disc pl-4">
                  <li>Minimum withdrawal amount is ₹100.</li>
                  <li>Earnings are credited immediately upon marking an order as <strong>Delivered</strong> (Base ₹40 + ₹20 distance bonus).</li>
                  <li>Customer tips are credited instantly to your wallet when submitted.</li>
                  <li>Super Admin approves cashouts within 24 hours.</li>
                </ul>
              </div>

            </div>
          )}

          {/* RUNS HISTORY TAB */}
          {activeSubTab === 'history' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-2">
                <h3 className="font-display font-extrabold text-base text-main">Completed Runs History</h3>
              </div>

              {/* Global History Filter Toolbar */}
              <HistoryFilterToolbar
                dateLabel={historyFilter.dateLabel}
                isFiltered={historyFilter.isFiltered}
                onOpenCalendar={() => setShowCalendarModal(true)}
                onReset={historyFilter.resetFilters}
                onClearHistory={() => setShowClearRunsModal(true)}
                clearHistoryLabel="Clear All Runs History"
                availableYears={historyFilter.availableYears}
                selectedYear={historyFilter.dateFilter.type === 'year' ? historyFilter.dateFilter.year : null}
                onSelectYear={(yr) => (yr ? historyFilter.selectYear(yr) : historyFilter.resetFilters())}
                typeFilter={historyFilter.typeFilter}
                typeOptions={[
                  { id: 'all', label: 'All Runs' },
                  { id: 'food', label: 'Food Deliveries' },
                  { id: 'ride', label: 'Ride Captain Runs' },
                ]}
                onTypeChange={historyFilter.setTypeFilter}
                totalCount={historyOrders.length}
                filteredCount={historyFilter.filteredItems.length}
              />

              {historyOrders.length === 0 ? (
                <div className="bg-surface rounded-3xl p-16 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                  <Clock className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">No runs completed</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Your complete dispatch log sheet will compile right here once dispatches succeed.</p>
                </div>
              ) : historyFilter.filteredItems.length === 0 ? (
                <HistoryEmptyState
                  dateLabel={historyFilter.dateLabel}
                  onReset={historyFilter.resetFilters}
                  message="No runs found"
                  description="There are no completed runs matching your active date or type filter."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {historyFilter.filteredItems.map(order => {
                    const placedTime = getOrderPlacedAt(order);
                    const deliveredTime = getOrderDeliveredAt(order);
                    const custName = order.customerName || order.userId?.name || order.address?.name || 'Customer';
                    const dropAddress = order.customerLocation?.formattedAddress || (order.address?.street ? `${order.address.street}${order.address.city ? `, ${order.address.city}` : ''}` : (order.address?.formattedAddress || 'Customer Location'));

                    return (
                      <div key={order._id} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col gap-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[9px] font-bold text-muted">#{order._id.substr(-8).toUpperCase()}</span>
                            <h4 className="font-bold text-main mt-1">Customer: {custName}</h4>
                            <p className="text-xs text-muted font-medium mt-0.5">{dropAddress}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-muted font-semibold mt-1">
                              {placedTime && (
                                <span>Placed: {formatAppDateTime(placedTime)}</span>
                              )}
                              {placedTime && <span>•</span>}
                              <span className={deliveredTime ? 'text-green-700 font-bold' : 'text-muted'}>
                                Delivered: {deliveredTime ? formatAppDateTime(deliveredTime) : 'Delivery time unavailable'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="text-xs font-black text-emerald-600">
                              Earning: {formatCurrency(order.orderType === 'ride' ? (order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare) : getOrderFinancialBreakdown(order).rider.totalRiderPayout)}
                            </span>
                            <span className="text-[10px] font-bold text-muted">COD Collected: {formatCurrency(order.total ?? order.fare)}</span>
                            <button
                              onClick={() => setSelectedDetailsOrder(order)}
                              className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer mt-1"
                            >
                              View Details
                            </button>
                          </div>
                        </div>

                      {/* Customer Feedback & Tip Section */}
                      {Number(order.riderReview?.rating) > 0 ? (
                        <div className="border-t border-line pt-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold text-muted uppercase tracking-wider">Customer Rating:</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-3 h-3 ${s <= order.riderReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                                ))}
                              </div>
                            </div>
                            {order?.riderReview?.tipAmount > 0 && (
                              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100 flex items-center gap-1">
                                <Heart className="w-3 h-3 text-green-500 fill-green-100" />
                                +₹{order.riderReview.tipAmount} tip
                              </span>
                            )}
                          </div>
                          {order.riderReview.comment && (
                            <div className="bg-violet-50/50 border border-violet-100/50 rounded-xl px-3 py-2">
                              <p className="text-[10px] text-muted font-semibold italic flex items-start gap-1.5">
                                <MessageSquare className="w-3 h-3 text-muted flex-shrink-0 mt-0.5" />
                                "{order.riderReview.comment}"
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-line pt-2">
                          <p className="text-[9px] text-gray-300 font-semibold italic">No customer feedback yet</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* KYC VERIFICATION TAB */}
          {activeSubTab === 'kyc' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Delivery Partner KYC Authentication</h3>
              
              {user?.kycStatus === 'Approved' ? (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 text-green-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                    <h4 className="font-display font-extrabold text-sm uppercase">KYC Active & Verified</h4>
                  </div>
                  <p className="text-xs leading-relaxed font-semibold">Your profile driver license details have been successfully verified. You are online and ready to accept deliveries from nearby eateries.</p>
                  <div className="text-[10px] font-mono text-green-700 bg-surface/50 px-3 py-2 rounded-xl w-max mt-1">
                    Licensed ID: {user.kycDetails?.documentType} - {user.kycDetails?.documentNumber}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-5 text-yellow-800 flex gap-3 text-xs leading-relaxed font-medium">
                    <ShieldCheck className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold">Driver Verification Required</h5>
                      <p className="mt-0.5">Please provide your Driving License or Aadhar card details below. Payout systems and claiming dispatches will remain locked until verified by an administrator.</p>
                    </div>
                  </div>

                  <form onSubmit={handleKycSubmit} className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Verification Document</label>
                        <select
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                          className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none"
                        >
                          <option value="Driving License">Driving License</option>
                          <option value="Aadhar Card">Aadhar Card</option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Document Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. DL-142026123456"
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

          {/* RATINGS & REVIEWS TAB */}
          {activeSubTab === 'reviews' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-main">Ratings & Reviews</h3>
                  <p className="text-xs text-muted font-medium mt-0.5">Customer feedback about your deliveries</p>
                </div>
                <button
                  onClick={fetchRatingsData}
                  disabled={isRatingsLoading}
                  className="text-xs font-bold text-primary hover:underline self-start sm:self-auto cursor-pointer"
                >
                  {isRatingsLoading ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. AVERAGE RATING */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Average Rating</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-display font-black text-3xl text-main">
                      {ratingsData?.ratingCount > 0 ? formatRating(ratingsData.averageRating) : '—'}
                    </span>
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-1">
                    {ratingsData?.ratingCount > 0 ? `Based on ${ratingsData.ratingCount} reviews` : 'No ratings yet'}
                  </span>
                </div>

                {/* 2. COMPLETED DELIVERIES */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Completed Deliveries</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-display font-black text-3xl text-primary">
                      {ratingsData?.completedDeliveries ?? 0}
                    </span>
                    {Number(ratingsData?.completedRides) > 0 && (
                      <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-200">
                        {ratingsData.completedRides} Rides
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-1">
                    {Number(ratingsData?.completedRides) > 0 ? `${ratingsData.completedDeliveries ?? 0} deliveries • ${ratingsData.completedRides} rides` : 'Total successful deliveries'}
                  </span>
                </div>

                {/* 3. REVIEWS RECEIVED */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Reviews Received</span>
                  <div className="mt-2">
                    <span className="font-display font-black text-3xl text-green-600">
                      {ratingsData?.ratingCount ?? 0}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-1">Verified customer feedback</span>
                </div>

                {/* 4. TIPS EARNED */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-400 fill-red-100" /> Tips Earned
                  </span>
                  <div className="mt-2">
                    <span className="font-display font-black text-3xl text-emerald-600">
                      {formatCurrency(ratingsData?.totalTips)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-1">
                    {ratingsData?.ordersWithTips > 0 ? `From ${ratingsData.ordersWithTips} orders` : 'No tips received yet'}
                  </span>
                </div>
              </div>

              {/* Analytics Row: Breakdown + Service Wise + Tips Summary + Improve Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Rating Breakdown */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
                  <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider">
                    Rating Breakdown
                  </h4>
                  <div className="flex flex-col gap-2 pt-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingsData?.ratingBreakdown?.[star] || 0;
                      const total = ratingsData?.ratingCount || 0;
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs font-semibold">
                          <span className="flex items-center gap-1 w-8 text-main font-bold">
                            {star} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          </span>
                          <div className="flex-1 h-2.5 bg-base rounded-full overflow-hidden border border-line/60">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-muted font-mono text-[11px]">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Service-Wise Rider Ratings */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
                  <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider">
                    Service-Wise Ratings
                  </h4>
                  <p className="text-[11px] text-muted -mt-1">Your rating performance across individual services</p>
                  
                  <div className="flex flex-col gap-2 pt-1">
                    {[
                      { id: 'food', label: 'Food Delivery' },
                      { id: 'ride', label: 'Ride' },
                      { id: 'courier', label: 'Courier' },
                      { id: 'grocery', label: 'Grocery Delivery' },
                      { id: 'bakery_beverages', label: 'Bakery Delivery' },
                      { id: 'veg_fruits', label: 'Veg & Fruits Delivery' },
                      { id: 'meat', label: 'Meat Delivery' }
                    ].map((srv) => {
                      const stat = (ratingsData?.serviceRatings || []).find(s => s.serviceType === srv.id);
                      const hasReviews = stat && stat.count > 0;
                      return (
                        <div key={srv.id} className="flex items-center justify-between p-2.5 bg-base rounded-xl border border-line/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-main">{srv.label}</span>
                            {hasReviews && (
                              <span className="text-[10px] text-muted">({stat.count} {stat.count === 1 ? 'review' : 'reviews'})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-bold text-xs text-main">
                            {hasReviews ? (
                              <>
                                <span>{formatRating(stat.averageRating)}</span>
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              </>
                            ) : (
                              <span className="text-muted font-medium text-xs">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips Summary */}
                <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
                  <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-500 fill-red-100" /> Tips Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="bg-base p-3 rounded-xl border border-line/60 text-center flex flex-col">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Total Tips</span>
                      <span className="font-display font-black text-lg text-emerald-600 mt-1">{formatCurrency(ratingsData?.totalTips)}</span>
                    </div>
                    <div className="bg-base p-3 rounded-xl border border-line/60 text-center flex flex-col">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Tipped Orders</span>
                      <span className="font-display font-black text-lg text-main mt-1">{ratingsData?.ordersWithTips || 0}</span>
                    </div>
                    <div className="bg-base p-3 rounded-xl border border-line/60 text-center flex flex-col">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Avg Tip / Order</span>
                      <span className="font-display font-black text-lg text-primary mt-1">{formatCurrency(ratingsData?.averageTip)}</span>
                    </div>
                  </div>
                </div>

                {/* Improve Your Rating Card */}
                <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/5 border border-primary/20 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider">
                        Improve Your Rating
                      </h4>
                    </div>
                    <p className="text-xs text-muted leading-relaxed mt-2 font-medium">
                      Good service leads to higher ratings and greater customer tips. Always greet customers politely, keep orders secure, and ensure timely dispatches!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-primary">
                    <span>★ Safe Handling</span>
                    <span>•</span>
                    <span>⚡ On-Time Dispatch</span>
                    <span>•</span>
                    <span>🤝 Polite Service</span>
                  </div>
                </div>
              </div>

              {/* Customer Reviews List */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="font-display font-extrabold text-sm text-main uppercase tracking-wider">
                    Recent Customer Delivery Reviews ({(ratingsData?.reviews || []).filter(rev => serviceFilter === 'all' || rev.serviceType === serviceFilter).length})
                  </h4>

                  {/* Service Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
                    {[
                      { id: 'all', label: 'All Services' },
                      { id: 'food', label: 'Food Delivery' },
                      { id: 'ride', label: 'Ride' },
                      { id: 'courier', label: 'Courier' },
                      { id: 'grocery', label: 'Grocery' },
                      { id: 'bakery_beverages', label: 'Bakery' },
                      { id: 'veg_fruits', label: 'Veg & Fruits' },
                      { id: 'meat', label: 'Meat' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => { setServiceFilter(tab.id); setReviewVisibleCount(10); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                          serviceFilter === tab.id
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-surface border border-line text-muted hover:text-main hover:bg-base'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Cards Grid or Empty State */}
                {(() => {
                  const filtered = (ratingsData?.reviews || []).filter(rev => serviceFilter === 'all' || rev.serviceType === serviceFilter);
                  if (filtered.length === 0) {
                    return (
                      <div className="bg-surface border border-line rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-3 shadow-2xs">
                        <Star className="w-12 h-12 text-gray-300 stroke-1" />
                        <h5 className="font-display font-extrabold text-base text-main">No ratings yet</h5>
                        <p className="text-xs text-muted max-w-sm font-medium leading-relaxed">
                          Complete deliveries and provide great service to start receiving customer feedback and ratings here.
                        </p>
                      </div>
                    );
                  }

                  const displayed = filtered.slice(0, reviewVisibleCount);
                  return (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayed.map((rev) => (
                          <div key={rev._id} className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-2xs">
                            {/* Header with stars & order ref */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-bold text-main ml-1">{rev.rating}.0</span>
                              </div>
                              <span className="text-[10px] text-muted font-mono font-bold bg-base px-2 py-0.5 rounded-md border border-line/60">
                                {rev.orderReference}
                              </span>
                            </div>

                            {/* Comment */}
                            {rev.comment ? (
                              <p className="text-xs text-main italic bg-base p-3 rounded-xl border border-line leading-relaxed">
                                "{rev.comment}"
                              </p>
                            ) : (
                              <p className="text-xs text-muted italic">No written comment provided.</p>
                            )}

                            {/* Context: Ride vs Delivery */}
                            {rev.serviceType === 'ride' ? (
                              <div className="flex flex-col gap-1 text-xs pt-1 border-t border-line/50">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 w-max">
                                    RIDE
                                  </span>
                                  <span className="text-[10px] font-mono text-muted font-bold">
                                    Ride: {rev.orderReference}
                                  </span>
                                </div>
                                {(rev.pickupArea || rev.dropArea) && (
                                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] bg-base p-2 rounded-xl border border-line/60">
                                    <div>
                                      <span className="text-[9px] uppercase font-extrabold text-muted block">Pickup</span>
                                      <span className="font-semibold text-main truncate block">{rev.pickupArea || 'Pickup Location'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-extrabold text-muted block">Drop</span>
                                      <span className="font-semibold text-main truncate block">{rev.dropArea || 'Drop Location'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-line/50">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 truncate">
                                    {rev.serviceLabel}
                                  </span>
                                  <span className="text-xs text-muted truncate font-medium">
                                    {rev.sourceName}
                                  </span>
                                </div>
                                {rev.tipAmount > 0 && (
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex-shrink-0">
                                    +₹{rev.tipAmount} Tip
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer with date & Verified badge */}
                            <div className="flex items-center justify-between text-[10px] text-muted border-t border-line/50 pt-2">
                              <span>{formatAppDateOnly(rev.createdAt)} • {formatAppTimeOnly(rev.createdAt)}</span>
                              <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600" /> {rev.serviceType === 'ride' ? 'Verified Ride' : 'Verified Delivery'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Load More Button */}
                      {filtered.length > displayed.length && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={() => setReviewVisibleCount(prev => prev + 10)}
                            className="px-6 py-2.5 bg-surface hover:bg-base text-main border border-line rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            Load More Reviews ({filtered.length - displayed.length} remaining)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PROFILE TAB */}
      {activeSubTab === 'profile' && (
        <div className="lg:col-span-3 flex flex-col gap-5 animate-scale-up">
          <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">My Profile</h3>
          <div className="bg-surface border border-line rounded-3xl p-6 flex flex-col gap-4 max-w-md">
            {[{ label: 'Full Name', value: user?.name }, { label: 'Email', value: user?.email }, { label: 'Phone', value: user?.phone }].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-muted font-extrabold uppercase">{label}</p>
                <p className="text-sm font-bold text-main">{value}</p>
              </div>
            ))}
            {user?.profileImage && (
              <div>
                <p className="text-[10px] text-muted font-extrabold uppercase">Profile Image</p>
                <img src={getImageUrl(user.profileImage, 'avatar')} alt="Profile" onError={(e) => handleImageError(e, 'avatar')} className="w-16 h-16 rounded-xl object-cover mt-1 border border-line" />
              </div>
            )}
            <button
              onClick={() => { 
                setEditName(user?.name || ''); 
                setEditPhone(user?.phone || ''); 
                setEditEmail(user?.email || '');
                setIsEmailOtpSent(false);
                setEmailOtp('');
                setEmailUpdateError('');
                setEmailUpdateSuccess('');
                setEditProfileImage(null); 
                setProfileError(''); 
                setProfileSuccess(''); 
                setShowEditProfile(true); 
              }}
              className="flex items-center gap-2 w-full justify-center py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer mt-2"
            >
              <Pencil className="w-3.5 h-3.5"/> Edit Profile
            </button>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex flex-col gap-3 max-w-md">
            <h4 className="font-extrabold text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Danger Zone</h4>
            <p className="text-xs text-red-600 font-semibold">Permanently deletes your account and all data. Cannot be undone.</p>
            <button onClick={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteAccount(true); }}
              className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer">
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* RIDER REJECTION MODAL */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-base w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-black text-lg text-main">Select Reason</h3>
              <button onClick={() => setRejectingOrderId(null)} className="text-muted hover:text-main cursor-pointer">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-gray-500 mb-2">Please tell us why you are unable to complete this request.</p>
              <select 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-surface border border-line p-3.5 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled>Select a reason...</option>
                <option value="Too far">Too far</option>
                <option value="Vehicle issue">Vehicle issue</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Unable to complete">Unable to complete</option>
                <option value="Wrong assignment">Wrong assignment</option>
                <option value="Other">Other</option>
              </select>
              
              {rejectionReason === 'Other' && (
                <textarea
                  placeholder="Please specify (optional)"
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  className="w-full bg-surface border border-line p-3.5 rounded-xl text-sm font-semibold text-main focus:outline-none focus:border-primary transition-colors mt-2 resize-none min-h-[80px]"
                />
              )}
              
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setRejectingOrderId(null)} className="flex-1 py-3 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button 
                  type="button" 
                  disabled={!rejectionReason} 
                  onClick={handleRejectOrder}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="text-muted hover:text-main cursor-pointer">✕</button>
            </div>
            {profileError && <p className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{profileError}</p>}
            {profileSuccess && <p className="text-[11px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-xl border border-green-100">{profileSuccess}</p>}
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              
              {/* Profile Image Uploader */}
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="relative w-24 h-24 rounded-full border-2 border-line-strong overflow-hidden bg-base flex items-center justify-center">
                  {editProfileImage ? (
                    <img src={URL.createObjectURL(editProfileImage)} alt="Preview" className="w-full h-full object-cover" />
                  ) : user?.profileImage || riderProfile?.profileImage ? (
                    <img src={getImageUrl(user?.profileImage || riderProfile?.profileImage, 'avatar')} alt="Profile" onError={(e) => handleImageError(e, 'avatar')} className="w-full h-full object-cover" />
                  ) : (
                    <Bike className="w-10 h-10 text-muted" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input type="file" accept=".jpeg, .jpg, .png" onChange={e => setEditProfileImage(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <span className="text-[10px] uppercase font-extrabold text-muted mt-2 tracking-wider">Update Photo</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold text-muted tracking-wider">FULL NAME</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary text-main"/>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold text-muted tracking-wider">MOBILE NUMBER</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary text-main"/>
              </div>

              <div className="flex flex-col gap-1 pb-3 border-b border-line-strong">
                <label className="text-[10px] uppercase font-extrabold text-muted tracking-wider">EMAIL</label>
                <div className="flex gap-2">
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={isEmailOtpSent}
                    className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary text-main disabled:opacity-60"/>
                  {editEmail !== user?.email && !isEmailOtpSent && (
                    <button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp}
                      className="px-3 bg-violet-100 text-[#7C3AED] hover:bg-violet-200 text-[10px] font-bold rounded-xl cursor-pointer disabled:opacity-50">
                      {isSendingEmailOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                </div>
                {isEmailOtpSent && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" placeholder="Enter 6-digit OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)}
                      className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-widest outline-none focus:border-primary text-main"/>
                    <button type="button" onClick={handleVerifyEmailOtp} disabled={isVerifyingEmailOtp}
                      className="px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-bold rounded-xl cursor-pointer disabled:opacity-50">
                      {isVerifyingEmailOtp ? '...' : 'Confirm'}
                    </button>
                  </div>
                )}
                {emailUpdateError && <p className="text-[10px] font-bold text-red-500 mt-1">{emailUpdateError}</p>}
                {emailUpdateSuccess && <p className="text-[10px] font-bold text-green-600 mt-1">{emailUpdateSuccess}</p>}
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 py-3 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingProfile} className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors">
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Delete Account</h3>
              <button onClick={() => setShowDeleteAccount(false)} className="text-muted cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-muted bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">⚠️ This <strong>permanently</strong> deletes your account and cannot be undone.</p>
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
        role="rider"
        token={token}
      />

      {/* ── CLEAR HISTORY CONFIRMATION MODAL ─── */}
      <ClearHistoryModal
        isOpen={showClearRunsModal}
        onClose={() => setShowClearRunsModal(false)}
        onConfirm={handleClearRunsHistory}
        title="Clear All Runs History?"
        description="This will remove completed delivery and ride runs from your runs log sheet. Active claimed runs, total earnings, and wallet balances will not be affected."
        confirmButtonText="Yes, Clear All"
      />

      {/* ── RIDER REJECT MODAL (3-STEP: CONFIRM -> REASON -> SUCCESS) ─── */}
      {Boolean(rejectingOrder) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl border border-line p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up">

            {/* STEP 1: INITIAL CONFIRMATION */}
            {rejectModalStep === 'confirm' && (
              <>
                <div className="flex justify-between items-start border-b border-line pb-3">
                  <div>
                    <h4 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Reject Order
                    </h4>
                    <p className="text-xs text-muted font-semibold mt-0.5">Order #{String(rejectingOrder._id).substr(-8).toUpperCase()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectingOrder(null)}
                    className="text-muted hover:text-main text-lg font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-[10px] text-muted">Customer:</span>
                    <span className="font-bold text-main">{rejectingOrder.customerName || rejectingOrder.user?.name || rejectingOrder.userId?.name || 'Customer'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-[10px] text-muted">Delivery Address:</span>
                    <span className="font-bold text-muted truncate max-w-[200px]">{rejectingOrder.customerLocation?.formattedAddress || rejectingOrder.address?.street || 'Customer Location'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-[10px] text-muted">Distance:</span>
                    <span className="font-bold text-main">{rejectingOrder.distance != null ? formatDistance(rejectingOrder.distance) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-[10px] text-muted">Offered Rider Earning:</span>
                    <span className="font-black text-green-600 text-sm">
                      {formatCurrency(rejectingOrder.pricingSnapshot?.rider?.totalRiderPayout ?? rejectingOrder.riderPayout ?? rejectingOrder.riderEarning ?? rejectingOrder.total ?? 25)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-main font-semibold text-center my-1">
                  Are you sure you want to reject this delivery request?
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingOrder(null)}
                    className="flex-1 py-3 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectModalStep('reason')}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                  >
                    Proceed
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: REASON SELECTION */}
            {rejectModalStep === 'reason' && (
              <>
                <div className="flex justify-between items-start border-b border-line pb-3">
                  <div>
                    <h4 className="font-display font-extrabold text-base text-main flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      REJECT ORDER
                    </h4>
                    <p className="text-xs text-muted font-semibold mt-0.5">Please select a reason for rejecting this delivery.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectingOrder(null)}
                    className="text-muted hover:text-main text-lg font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRejectOrderSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {rejectReasonOptions.map((opt) => (
                      <label
                        key={opt.code}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                          rejectReasonCode === opt.code
                            ? 'border-red-500 bg-red-50/50 text-red-900 font-bold'
                            : 'border-line hover:bg-base text-main'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejectReason"
                          value={opt.code}
                          checked={rejectReasonCode === opt.code}
                          onChange={(e) => setRejectReasonCode(e.target.value)}
                          className="accent-red-600 w-4 h-4"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {rejectReasonCode === 'other' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Please specify reason (Required):</label>
                      <input
                        type="text"
                        required
                        placeholder="Type specific reason..."
                        value={rejectReasonText}
                        onChange={(e) => setRejectReasonText(e.target.value)}
                        className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none focus:border-red-500"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Additional Note (Optional):</label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      placeholder="e.g. Traffic is very heavy in that area."
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl p-3 text-xs text-main outline-none focus:border-red-500 resize-none font-medium"
                    />
                  </div>

                  <div className={`flex justify-between items-center rounded-xl px-3.5 py-2.5 text-[10px] font-bold border ${
                    (user?.deliveryDetails?.dailyRejectionCount || 0) >= 3
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-violet-50/70 border-violet-100 text-violet-900'
                  }`}>
                    <span>Today's Rejections:</span>
                    <span className="font-extrabold">
                      {(user?.deliveryDetails?.dailyRejectionCount || 0)} / 3 {(user?.deliveryDetails?.dailyRejectionCount || 0) >= 3 ? '(Exceeded • Surfaced to Admin)' : 'Used'}
                    </span>
                  </div>

                  {rejectErrorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                      <span>{rejectErrorMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setRejectErrorMsg(''); setRejectModalStep('confirm'); }}
                      className="flex-1 py-3 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!rejectReasonCode || (rejectReasonCode === 'other' && !rejectReasonText.trim()) || isSubmittingReject}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isSubmittingReject ? 'Submitting...' : 'Reject Order'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
            {rejectModalStep === 'success' && (
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-main">
                    ✓ Order Rejected
                  </h4>
                  <p className="text-xs text-muted font-semibold mt-1">
                    This order has been sent to Admin for manual handling.
                  </p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    You will not receive this order again.
                  </p>
                </div>

                <div className="w-full bg-base border border-line rounded-xl p-3 flex justify-between items-center text-xs font-bold text-main">
                  <span className="text-muted">Today's Rejections:</span>
                  <span className="text-primary font-black">{lastRejectionCount} / 3</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRejectingOrder(null);
                    setRejectModalStep('confirm');
                    setRejectReasonCode('');
                    setRejectReasonText('');
                    setRejectNote('');
                  }}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                >
                  Back to Requests
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
