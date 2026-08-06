import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bike, DollarSign, Clock, ShieldCheck, MapPin, Store, CheckCircle, ChevronRight, AlertCircle, ShoppingBag, Eye, LogOut, Send, FileText, Star, MessageSquare, Heart, Phone, Pencil, AlertTriangle, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import InteractiveMap from '../components/InteractiveMap';
import { io } from 'socket.io-client';
import { formatAppDateOnly, formatAppTimeOnly } from '../utils/dateUtils';

export default function DeliveryDashboard() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

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
        const formData = new FormData();
        formData.append('image', editProfileImage);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.imageUrl) {
          profileImageUrl = uploadData.imageUrl;
        } else {
          setProfileError('Failed to upload image.');
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

  const [activeSubTab, setActiveSubTab] = useState('pool'); // 'pool', 'orders', 'wallet', 'history', 'kyc'
  
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

  // Status progression action triggers
  const [updatingId, setUpdatingId] = useState(null);

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
      const res = await fetch(`${API_BASE}/orders/${selectedOrder._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: messageText,
          sender: 'rider'
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
    if (!token || user?.role !== 'delivery') {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchOrdersData();

    const interval = setInterval(() => {
      fetchProfile();
      fetchOrdersData();
    }, 6000);

    return () => clearInterval(interval);
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
      // 1. Available Pool
      const availRes = await fetch(`${API_BASE}/delivery-partner/orders/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const availData = await availRes.json();
      // Guard: only set state if the response is actually an array
      setAvailableOrders(Array.isArray(availData) ? availData : []);

      // 2. Active Run
      const activeRes = await fetch(`${API_BASE}/delivery-partner/orders/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      const safeActiveData = Array.isArray(activeData) ? activeData : [];
      setActiveOrders(safeActiveData);

      // Auto-select active order if selectedOrder is null
      if (safeActiveData.length > 0 && !selectedOrder) {
        setSelectedOrder(safeActiveData[0]);
      }

      // 3. Completed history
      const historyRes = await fetch(`${API_BASE}/delivery-partner/orders/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      const safeHistoryData = Array.isArray(historyData) ? historyData : [];
      // Sort by most recently completed first
      safeHistoryData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setHistoryOrders(safeHistoryData);

    } catch (err) {
      console.error(err);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // Sync selectedOrder on updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = [...activeOrders, ...historyOrders, ...availableOrders].find(o => o._id === selectedOrder._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updated);
      }
    }
  }, [activeOrders, historyOrders, availableOrders, selectedOrder]);

  useEffect(() => {
    if (selectedOrder && selectedOrder.restaurantId) {
      const fetchRestaurantAddress = async () => {
        try {
          const res = await fetch(`${API_BASE}/restaurants/${selectedOrder.restaurantId}`);
          if (res.ok) {
            const data = await res.json();
            setSelectedOrderRestaurantAddress(data.address);
          }
        } catch (err) {
          console.error("Error fetching restaurant address in delivery dashboard:", err);
        }
      };
      fetchRestaurantAddress();
    } else {
      setSelectedOrderRestaurantAddress('');
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

  // Geolocation and Socket.IO GPS update streaming for Out for Delivery orders
  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== 'Out for Delivery' || !token) return;

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
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[GPS SOCKET] Dispatching coordinate update:', latitude, longitude);
          socket.emit('updateLocation', {
            orderId: selectedOrder._id,
            lat: latitude,
            lng: longitude
          });
        },
        (err) => {
          console.error('[GPS SOCKET] Geolocation error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      console.warn('[GPS SOCKET] Geolocation is not supported by this browser.');
    }

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.disconnect();
    };
  }, [selectedOrder?._id, selectedOrder?.status, token]);

  const handleAcceptOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/delivery-partner/orders/${orderId}/accept`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const claimed = await res.json();
        setSelectedOrder(claimed);
        fetchOrdersData();
        setActiveSubTab('orders'); // Jump back to orders tab to view tracking map
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (orderId, nextStatus) => {
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
        setSelectedOrder(updated);
        fetchOrdersData();
        fetchProfile(); // Refresh earnings
      }
    } catch (err) {
      console.error(err);
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

  const getNextRiderAction = (status) => {
    if (status === 'Confirmed') return { next: 'Preparing', label: 'Arrive at Restaurant' };
    if (status === 'Preparing') return { next: 'Out for Delivery', label: 'Pick Up & Start Run' };
    if (status === 'Out for Delivery') return { next: 'Delivered', label: 'Mark as Delivered' };
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full mt-4">
      
      {/* Rider Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          {user?.profileImage || riderProfile?.profileImage ? (
            <img 
              src={user?.profileImage || riderProfile?.profileImage} 
              alt="Profile" 
              className="w-12 h-12 rounded-2xl object-cover border border-line shadow-xs" 
            />
          ) : (
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Bike className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="font-display font-black text-2xl text-main leading-tight">
              {riderProfile?.name || 'Rider Dashboard'}
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">Claim active runs, manage wallet and trace milestones</p>
          </div>
        </div>

        {/* Availability & Capabilities Switches */}
        {user?.kycStatus === 'Approved' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-surface border border-line p-4 rounded-2xl shadow-2xs">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
              <span className="text-xl font-black text-main">₹{(riderProfile.deliveryDetails?.walletBalance || 0).toFixed(2)}</span>
              <button onClick={() => setActiveSubTab('wallet')} className="text-[10px] font-bold text-primary hover:underline">Cashout</button>
            </div>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">Total Earnings</span>
            <span className="text-xl font-black text-main mt-2">₹{(riderProfile.deliveryDetails?.totalEarnings || 0).toFixed(2)}</span>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider flex items-center gap-1"><Heart className="w-3 h-3 text-red-400 fill-red-100" /> Tips Earned</span>
            <span className="text-xl font-black text-green-600 mt-2">₹{historyOrders.reduce((sum, o) => sum + (o.riderReview?.tipAmount || 0), 0).toFixed(2)}</span>
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
        
        {/* Left Side: Navigation subtabs */}
        <div className="lg:col-span-1 bg-surface border border-line shadow-2xs p-2 rounded-3xl flex flex-col gap-1">
          {[
            { id: 'pool', label: 'Order Requests Pool', icon: ShoppingBag, badge: availableOrders.length },
            { id: 'orders', label: 'Claimed runs', icon: Bike, badge: activeOrders.length },
            { id: 'wallet', label: 'Earnings & Withdrawals', icon: DollarSign },
            { id: 'history', label: 'Runs History Log', icon: Clock },
            { id: 'kyc', label: 'KYC Partner Verification', icon: ShieldCheck },
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
                  activeOrders.map(order => (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        selectedOrder?._id === order._id ? 'border-primary bg-violet-50/15' : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold text-muted">
                        <span>#{order._id.substr(-8).toUpperCase()}</span>
                        <span className={`px-1.5 py-0.5 rounded ${getStatusBadge(order.status)}`}>{order.status}</span>
                      </div>
                      <p className="text-xs font-bold text-main line-clamp-1">To: {order.address?.street || 'Customer Location'}, {order.address?.city || ''}</p>
                      <div className="border-t border-line pt-2 flex justify-between items-center text-[10px] font-bold text-muted">
                        <span>Grand Total: ₹{order.total}</span>
                        <span className="text-primary flex items-center">Track <ChevronRight className="w-3 h-3" /></span>
                      </div>
                    </div>
                  ))
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
                        <h4 className="font-display font-extrabold text-sm text-main">Dispatch Details</h4>
                        <p className="text-[9px] font-mono text-muted">ID: {selectedOrder._id}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                    </div>

                    {/* Real Google Maps tracking map */}
                    <InteractiveMap 
                      status={selectedOrder.status} 
                      restaurantAddress={selectedOrderRestaurantAddress}
                      customerAddress={`${selectedOrder.address?.street || ''}, ${selectedOrder.address?.city || ''}, ${selectedOrder.address?.state || ''} - ${selectedOrder.address?.zip || ''}`}
                      orderId={selectedOrder._id}
                    />

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
                    {getNextRiderAction(selectedOrder.status) ? (
                      <div className="bg-base border border-gray-150 p-4 rounded-2xl flex flex-col gap-2">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">Milestone Control</span>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder._id, getNextRiderAction(selectedOrder.status).next)}
                          disabled={updatingId === selectedOrder._id}
                          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-4.5 h-4.5" />
                          <span>{getNextRiderAction(selectedOrder.status).label}</span>
                        </button>
                      </div>
                    ) : selectedOrder.status === 'Delivered' ? (
                      <div className="flex flex-col gap-3">
                        <div className="bg-green-50 border border-green-100 text-green-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Ride successfully delivered! Earnings credited to wallet.</span>
                        </div>
                        {/* Customer Feedback Display */}
                        {selectedOrder.riderReview ? (
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
                            {selectedOrder.riderReview.tipAmount > 0 && (
                              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-green-600 fill-green-100" /> Tip Received
                                </span>
                                <span className="text-sm font-black text-green-700">₹{selectedOrder.riderReview.tipAmount}</span>
                              </div>
                            )}
                            {selectedOrder.riderReview.comment && (
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
                    ) : (
                      <div className="bg-violet-50 border border-violet-100 text-violet-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 animate-pulse">
                        <Clock className="w-5 h-5 text-primary" />
                        <span>Awaiting kitchen preparation...</span>
                      </div>
                    )}

                    {/* Live Chat Panel */}
                    <div className="rounded-2xl p-4 border border-gray-150 flex flex-col gap-3 bg-surface mt-1">
                      <h4 className="font-display font-extrabold text-xs text-gray-805 uppercase tracking-wider pb-1 border-b border-line flex items-center justify-between">
                        <span>Live Chat with Customer</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </h4>

                      {/* Scrollable messages container */}
                      <div ref={chatContainerRef} className="h-48 overflow-y-auto flex flex-col gap-3 pr-1.5 scrollbar-thin">
                        {selectedOrder.messages && selectedOrder.messages.length > 0 ? (
                          selectedOrder.messages.map((msg, idx) => {
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
                            <p className="text-[9px] max-w-[160px] leading-tight">Send a message to coordinate direction details with the customer.</p>
                          </div>
                        )}
                      </div>

                      {/* Message Input Box */}
                      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-line pt-2 mt-0.5">
                        <input
                          type="text"
                          placeholder="Type a message to customer..."
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

                    {/* Address details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="border border-line p-3.5 rounded-2xl">
                        <span className="text-[9px] text-muted font-extrabold uppercase">1. Pickup Kitchen</span>
                        <h5 className="font-bold text-main mt-1">Burger Point</h5>
                        <p className="text-[10px] text-muted mt-0.5 leading-relaxed font-semibold">Shop 4, Linking Road, Mumbai</p>
                      </div>
                      <div className="border border-line p-3.5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-muted font-extrabold uppercase">2. Drop Customer</span>
                          <h5 className="font-bold text-main mt-1">{selectedOrder.user?.name || 'Delivery Address'}</h5>
                          <p className="text-[10px] text-muted mt-0.5 leading-relaxed font-semibold">
                            {selectedOrder.address?.street || 'Customer Location'}, {selectedOrder.address?.city || ''}, {selectedOrder.address?.state || ''} - {selectedOrder.address?.zip || ''}
                          </p>
                        </div>
                        <a 
                          href={`tel:${selectedOrder.user?.phone || selectedOrder.customerPhone || '+919876543210'}`}
                          className="mt-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Customer ({selectedOrder.user?.phone || selectedOrder.customerPhone || '+91 98765 43210'})</span>
                        </a>
                      </div>
                    </div>
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
                    <div key={order._id} className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col gap-3 justify-between">
                      <div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-muted pb-2 border-b border-line">
                          <span>#{order._id.substr(-8).toUpperCase()}</span>
                          <span>₹{order.total} total</span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-3 text-xs leading-tight font-bold">
                          <div className="flex items-center gap-1.5 text-main">
                            <Store className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="truncate">Burger Point</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted">
                            <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            <span className="truncate">{order.address?.street || 'Customer Location'}, {order.address?.city || ''}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAcceptOrder(order._id)}
                        disabled={updatingId === order._id}
                        className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold py-2.5 rounded-xl mt-3 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        Accept & Claim Delivery
                      </button>
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
              <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">Completed Runs History</h3>
              {historyOrders.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {historyOrders.map(order => (
                    <div key={order._id} className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col gap-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono text-[9px] font-bold text-muted">#{order._id.substr(-8).toUpperCase()}</span>
                          <h4 className="font-bold text-main mt-1">To: {order.address?.street || 'Customer Location'}, {order.address?.city || ''}</h4>
                          <p className="text-[9px] text-muted font-semibold mt-0.5">Delivered on {formatAppDateOnly(order.createdAt)}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs font-black text-main">₹{(order.deliveryFee || 40) + 20}</span>
                          <p className="text-[9px] text-green-600 font-black">Credited</p>
                        </div>
                      </div>

                      {/* Customer Feedback & Tip Section */}
                      {order.riderReview ? (
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
                            {order.riderReview.tipAmount > 0 && (
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
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-3xl p-16 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
                  <Clock className="w-12 h-12 text-gray-300" />
                  <h4 className="font-display font-extrabold text-sm text-main">No runs completed</h4>
                  <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Your complete dispatch log sheet will compile right here once dispatches succeed.</p>
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
                <img src={user.profileImage} alt="Profile" className="w-16 h-16 rounded-xl object-cover mt-1 border border-line" />
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
                    <img src={user?.profileImage || riderProfile?.profileImage} alt="Profile" className="w-full h-full object-cover" />
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

    </div>
  );
}
