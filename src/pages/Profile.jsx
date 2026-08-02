import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, MapPin, ClipboardList, LogOut, ChevronRight, ShoppingBag, Trash2, Calendar, Star, Sparkles, Pencil, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import { formatAppDate } from '../utils/dateUtils';

export default function Profile() {
  const { user, token, logout, deleteAddress } = useAuthStore();
  const { addItem, clearCart, showToast } = useCartStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Rider review modal states
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);

  // Edit Profile modal
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Delete Account modal
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.message || 'Failed to update.'); return; }
      setProfileSuccess('Profile updated! Refresh to see changes.');
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
      if (!res.ok) { setDeleteError(data.message || 'Failed to delete.'); return; }
      logout();
      navigate('/');
    } catch { setDeleteError('Server error.'); }
    finally { setIsDeletingAccount(false); }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchOrderHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Fetch order history error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchWallet = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWallet(data);
        }
      } catch (err) {
        console.error('Fetch wallet error:', err);
      }
    };

    fetchOrderHistory();
    fetchWallet();
  }, [token, navigate]);

  // Safeguard: Wait for redirect with beautiful loading state
  if (!user) {
    if (token) {
      return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 flex flex-col gap-6 w-full">
          <div className="h-8 skeleton-xl w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="h-48 skeleton-3xl" />
            <div className="md:col-span-2 h-64 skeleton-3xl" />
          </div>
        </div>
      );
    }
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleReorder = (order) => {
    clearCart();
    
    // We need to fetch/mock a restaurant object so the cart knows where it is ordering from
    // We can extract a mockup of the restaurant from the order details or just set a basic one
    const mockRestaurant = {
      _id: '607f1f77bcf86cd799439021', // Fallback to Burger Point
      name: 'Burger Point',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80',
      address: 'Shop 4, Linking Road, Mumbai'
    };

    // Re-populate all items
    order.items.forEach(item => {
      // Re-format item details to match MenuItem schema expected in addItem
      const reorderItem = {
        _id: item.menuItemId,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg
      };
      
      // Since addItem increments, we run it 'quantity' times
      for (let q = 0; q < item.quantity; q++) {
        addItem(reorderItem, mockRestaurant);
      }
    });

    showToast('Reordered items successfully loaded back into cart!', 'success');
    navigate('/cart');
  };

  const formatDate = (dateStr) => {
    return formatAppDate(dateStr);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full">
      <div className="border-b border-line pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
            My Account
          </h1>
          <p className="text-xs text-muted font-medium">Manage your delivery profile and trace past orders</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-red-500 font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Log Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left column: Profile Card & Addresses */}
        <div className="flex flex-col gap-6 md:col-span-1">
          
          {/* Profile Card */}
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="font-display font-extrabold text-sm text-main flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>Personal Details</span>
              </h3>
              <button
                onClick={() => { 
                  setEditName(user.name || ''); 
                  setEditPhone(user.phone || ''); 
                  setEditEmail(user.email || '');
                  setIsEmailOtpSent(false);
                  setEmailOtp('');
                  setEmailUpdateError('');
                  setEmailUpdateSuccess('');
                  setProfileError(''); 
                  setProfileSuccess(''); 
                  setShowEditProfile(true); 
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3"/> Edit Profile
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] text-muted font-bold uppercase">Name</p>
                <p className="text-sm font-bold text-main">{user.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted font-bold uppercase">Email</p>
                <p className="text-sm font-bold text-main">{user.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted font-bold uppercase">Phone Number</p>
                <p className="text-sm font-bold text-main">+91 {user.phone}</p>
              </div>
            </div>
          </div>

          {/* Saved Addresses list */}
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-extrabold text-sm text-main border-b border-line pb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Saved Addresses</span>
            </h3>

            {user.addresses && user.addresses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {user.addresses.map((addr) => (
                  <div key={addr._id} className="p-3 bg-base rounded-xl border border-line/50 flex justify-between items-start gap-2.5">
                    <div>
                      {addr.isDefault && <span className="text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.5 rounded-md mb-1.5 inline-block">Default</span>}
                      <p className="text-[11px] text-muted leading-relaxed font-semibold">
                        {addr.street}, {addr.city}, {addr.state} - {addr.zip}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAddress(addr._id)}
                      className="text-muted hover:text-red-500 p-1 cursor-pointer transition-colors"
                      title="Delete Address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted italic">No saved addresses found. Add one during checkout.</p>
            )}
          </div>

      {/* Delete Account danger zone */}
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex flex-col gap-3">
            <h3 className="font-display font-extrabold text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5"/> Danger Zone
            </h3>
            <p className="text-xs text-red-600 font-semibold">Permanently deletes your account and all associated data. This cannot be undone.</p>
            <button
              onClick={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteAccount(true); }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Delete My Account
            </button>
          </div>
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="font-display font-extrabold text-sm text-main flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span>Digital Wallet</span>
              </h3>
              <span className="text-primary font-black text-lg">₹{(wallet?.balance || 0).toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Recent Transactions</h4>
              {wallet?.transactions && wallet.transactions.length > 0 ? (
                <div className="flex flex-col gap-2 mt-1 max-h-[300px] overflow-y-auto pr-1">
                  {wallet.transactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-base rounded-xl border border-line/50">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-main">{tx.description}</span>
                        <span className="text-[9px] text-muted font-semibold">{new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-xs font-black ${tx.type === 'credit' ? 'text-green-600' : 'text-main'}`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic mt-1">No transactions yet. Apply cashback promos during checkout!</p>
              )}
            </div>
          </div>

        </div>

        {/* Right 2 cols: Order History */}
        <div className="md:col-span-2 flex flex-col gap-5">
          <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
            <ClipboardList className="w-5.5 h-5.5 text-primary" />
            <span>Order History</span>
          </h3>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              <div className="h-24 skeleton-3xl" />
              <div className="h-24 skeleton-3xl" />
            </div>
          ) : orders.length > 0 ? (
            <div className="flex flex-col gap-4">
              {orders.map((order) => (
                <div key={order._id} className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4">
                  {/* Row 1: Restaurant/Order Summary */}
                  <div className="flex justify-between items-start border-b border-line pb-3 gap-4">
                    <div>
                      <h4 className="font-display font-bold text-base text-main flex items-center gap-1.5">
                        {order.orderType === 'ride' ? (
                          <>
                            <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Ride</span>
                            <span>Bike Ride Hailing</span>
                          </>
                        ) : (
                          (order.items && order.items.length > 0)
                            ? (order.items.length === 1 ? order.items[0].name : `${order.items[0].name} +${order.items.length - 1} items`)
                            : 'Order'
                        )}
                      </h4>
                      <p className="text-[10px] text-muted font-semibold flex flex-wrap items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Placed on {formatDate(order.createdAt)}</span>
                        {order.restaurant && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-primary font-extrabold bg-primary-light/50 px-2 py-0.5 rounded-md">
                              Delivered by: {order.restaurant.name}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        order.status === 'Delivered' 
                          ? 'bg-green-100 text-green-700' 
                          : order.status === 'Placed'
                          ? 'bg-violet-100 text-violet-700 animate-pulse'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs font-bold text-main mt-0.5">₹{(order.total != null ? order.total : 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Row 2: Actions */}
                  <div className="flex justify-between items-center gap-4">
                    {/* Items text summary */}
                    <p className="text-[11px] text-muted font-semibold truncate max-w-[60%]">
                      {order.orderType === 'ride' ? (
                        `Pickup: ${order.pickupAddress?.street || 'Customer Location'} ➔ Drop: ${order.address?.street || 'Destination Address'}`
                      ) : (
                        (order.items && order.items.length > 0)
                          ? order.items.map(i => `${i.name} (${i.quantity})`).join(', ')
                          : '—'
                      )}
                    </p>

                    <div className="flex items-center gap-2">
                      {order.status === 'Delivered' && order.riderReview && (
                        <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-xl border border-green-200 mr-1">
                          {order.riderReview.tipAmount > 0 && (
                            <span>Tipped ₹{order.riderReview.tipAmount} •&nbsp;</span>
                          )}
                          <span className="flex items-center">
                            {order.riderReview.rating}
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 ml-0.5" />
                          </span>
                        </div>
                      )}

                      {order.status === 'Delivered' && !order.riderReview && order.deliveryAgent && (
                        <button
                          onClick={() => {
                            setSelectedReviewOrder(order);
                            setIsRiderModalOpen(true);
                          }}
                          className="bg-violet-50 hover:bg-violet-100 text-primary font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Rate & Tip Rider
                        </button>
                      )}

                      {/* Active tracking or Review details link */}
                      <Link
                        to={`/order-tracking/${order._id}`}
                        className="bg-primary-light text-primary hover:bg-violet-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {order.status === 'Delivered' ? 'View details' : 'Track Live'}
                      </Link>
                      
                      {order.orderType !== 'ride' && (
                        <button
                          onClick={() => handleReorder(order)}
                          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                        >
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
              <h4 className="font-display font-extrabold text-sm text-main">No past orders yet</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                When you make purchases, your receipt catalog and order histories will populate right here.
              </p>
            </div>
          )}
        </div>



      </div>

      {selectedReviewOrder && (
        <RiderFeedbackModal
          isOpen={isRiderModalOpen}
          onClose={() => {
            setIsRiderModalOpen(false);
            setSelectedReviewOrder(null);
          }}
          orderId={selectedReviewOrder._id}
          deliveryAgent={selectedReviewOrder.deliveryAgent}
          token={token}
          onFeedbackSubmit={(updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? { ...o, riderReview: updatedOrder.riderReview } : o));
          }}
        />
      )}

      {/* ── EDIT PROFILE MODAL ─── */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="text-muted hover:text-main cursor-pointer">✕</button>
            </div>
            {profileError && <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{profileError}</p>}
            {profileSuccess && <p className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">{profileSuccess}</p>}
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Full Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Mobile Number</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary"/>
              </div>
              <div className="flex flex-col gap-1 pb-3 border-b border-line-strong">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Email</label>
                <div className="flex gap-2">
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={isEmailOtpSent}
                    className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-primary disabled:opacity-60"/>
                  {editEmail !== user?.email && !isEmailOtpSent && (
                    <button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp}
                      className="px-3 bg-violet-100 text-primary hover:bg-violet-200 text-[10px] font-bold rounded-xl cursor-pointer disabled:opacity-50">
                      {isSendingEmailOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                </div>
                {isEmailOtpSent && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" placeholder="Enter 6-digit OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)}
                      className="flex-1 bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-bold tracking-widest outline-none focus:border-primary"/>
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
                <button type="button" onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingProfile}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT MODAL ─── */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Delete Account</h3>
              <button onClick={() => setShowDeleteAccount(false)} className="text-muted hover:text-main cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-muted font-semibold bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">⚠️ This will permanently delete your account and all data. This action <strong>cannot be undone</strong>.</p>
            {deleteError && <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{deleteError}</p>}
            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted">Confirm your password</label>
                <input type="password" placeholder="Enter your password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required
                  className="bg-base border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-main font-bold outline-none focus:border-red-400"/>
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowDeleteAccount(false)}
                  className="flex-1 py-2.5 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer">Cancel</button>
                <button type="submit" disabled={isDeletingAccount || !deletePassword}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                  {isDeletingAccount ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
