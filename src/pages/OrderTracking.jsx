import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Star, Shield, ArrowLeft, RefreshCw, Calendar, ShoppingBag, Check, Send, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import InteractiveMap from '../components/InteractiveMap';
import { formatAppDateOnly, formatAppTimeOnly } from '../utils/dateUtils';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import { playStatusChangeSound, playCaptainAssignedSound, playDeliveredSound } from '../utils/audio';
import { io } from 'socket.io-client';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import { getUnifiedTrackingOrder } from '../utils/unifiedOrder';

export default function OrderTracking() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [siblingOrders, setSiblingOrders] = useState([]);
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(30); // minutes
  const [riderLoc, setRiderLoc] = useState(null); // Socket GPS stream

  // Review states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Rider review modal states
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const autoOpenTriggered = useRef(false);

  const prevStatusRef = useRef(null);
  const prevAgentRef = useRef(null);

  // Compute presentation-layer unified tracking model
  const unifiedOrder = React.useMemo(() => {
    return getUnifiedTrackingOrder(order, siblingOrders);
  }, [order, siblingOrders]);

  useEffect(() => {
    if (unifiedOrder) {
      if (prevStatusRef.current && prevStatusRef.current !== unifiedOrder.status) {
        if (unifiedOrder.status === 'Delivered') {
          playDeliveredSound();
        } else {
          playStatusChangeSound();
        }
      }
      if (unifiedOrder.deliveryAgent && !prevAgentRef.current) {
        playCaptainAssignedSound();
      }

      prevStatusRef.current = unifiedOrder.status;
      if (unifiedOrder.deliveryAgent) {
        prevAgentRef.current = unifiedOrder.deliveryAgent;
      }
    }
  }, [unifiedOrder?.status, unifiedOrder?.deliveryAgent]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setReviewError('Please select a rating score.');
      return;
    }
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrder(updatedOrder);
      } else {
        const errData = await res.json();
        setReviewError(errData.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      setReviewError('Connection error. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (order?.messages && order.messages.length > 0) {
      scrollToBottom();
    }
  }, [order?.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: messageText,
          sender: 'customer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setMessageText('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Active polling function
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);

          // Auto-open rider review modal if delivered and not yet reviewed
          if (data.status === 'Delivered' && !(Number(data.riderReview?.rating) > 0) && !autoOpenTriggered.current) {
            autoOpenTriggered.current = true;
            setIsRiderModalOpen(true);
          }

          // Fetch Sibling orders if present in multi-restaurant checkout
          if (data.siblingOrderIds && data.siblingOrderIds.length > 0) {
            try {
              const sibsPromises = data.siblingOrderIds.map(sibId =>
                fetch(`${API_BASE}/orders/${sibId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json())
              );
              const sibsData = await Promise.all(sibsPromises);
              setSiblingOrders(sibsData.filter(o => o && o._id));
            } catch (sibErr) {
              console.error('Error fetching sibling orders:', sibErr);
            }
          } else {
            setSiblingOrders([]);
          }

          // Adjust countdown based on status
          const isRide = data.orderType === 'ride';
          if (data.status === 'Placed') setCountdown(isRide ? 12 : 28);
          else if (data.status === 'Confirmed') setCountdown(isRide ? 10 : 25);
          else if (data.status === 'Preparing') setCountdown(isRide ? 8 : 20);
          else if (data.status === 'Out for Delivery' || data.status === 'Out_for_Delivery') setCountdown(isRide ? 5 : 10);
          else if (data.status === 'Delivered') setCountdown(0);
        }
      } catch (err) {
        console.error('Fetch tracking order error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();

    const pollInterval = setInterval(fetchOrderDetails, 30000);
    return () => clearInterval(pollInterval);
  }, [id, token]);

  // Socket.IO real-time status update subscription
  useEffect(() => {
    if (!id || !token) return;

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.emit('joinOrder', id);
    if (order?.siblingOrderIds) {
      order.siblingOrderIds.forEach(sibId => socket.emit('joinOrder', sibId));
    }

    socket.on('statusUpdated', ({ status, order: updatedOrder }) => {
      console.log('[TRACKING SOCKET] Status update received:', status);
      if (updatedOrder) {
        if (updatedOrder._id === id) {
          setOrder(updatedOrder);
        } else {
          setSiblingOrders(prev => prev.map(s => s._id === updatedOrder._id ? updatedOrder : s));
        }
      } else {
        setOrder(prev => prev ? { ...prev, status } : null);
      }
    });

    socket.on('orderStatusChanged', (data) => {
      if (data && data.orderId) {
        if (data.orderId === id) {
          setOrder(prev => prev ? { ...prev, status: data.status, ...(data.order || {}) } : null);
        } else {
          setSiblingOrders(prev => prev.map(s => s._id === data.orderId ? { ...s, status: data.status, ...(data.order || {}) } : s));
        }
      }
    });

    socket.on('locationUpdated', ({ lat, lng }) => {
      console.log('[TRACKING SOCKET] Live rider location update:', lat, lng);
      setRiderLoc({ lat, lng });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, token, order?.siblingOrderIds]);

  // Handle countdown decrement simulation
  useEffect(() => {
    if (countdown <= 0) return;
    const countInterval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 60000); // Decrement every minute
    return () => clearInterval(countInterval);
  }, [countdown]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-6">
        <div className="h-6 skeleton w-1/4" />
        <div className="h-[280px] skeleton-3xl" />
        <div className="h-16 skeleton w-full" />
        <div className="h-32 skeleton w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center py-20 px-4 gap-4 pb-24">
        <h3 className="font-display font-extrabold text-xl text-main">Order not found</h3>
        <p className="text-xs text-muted max-w-xs font-medium">This order link might be expired or unauthorized.</p>
        <Link to="/" className="bg-primary text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md">Go Home</Link>
      </div>
    );
  }

  const isStore = unifiedOrder.orderType === 'store' || ['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT', 'STORE'].includes(String(unifiedOrder.serviceType || '').toUpperCase());

  // Active status timeline markers
  const timelineSteps = unifiedOrder.orderType === 'ride' ? [
    { label: 'Booking Placed', mappedState: 0, desc: 'Finding nearest Ride Captain' },
    { label: 'Captain Assigned', mappedState: 1, desc: 'Captain accepted your ride request' },
    { label: 'Captain at Pickup', mappedState: 2, desc: 'Captain is waiting at pickup spot' },
    { label: 'Ride in Progress', mappedState: 3, desc: 'Captain is en route to destination' },
    { label: 'Completed', mappedState: 4, desc: 'Reached destination successfully!' }
  ] : unifiedOrder.isUnified ? [
    { label: 'Order Placed', mappedState: 0, desc: 'Combined order placed successfully' },
    { label: 'Confirmed', mappedState: 1, desc: 'All pickup sources confirmed' },
    { label: 'Preparing & Packing', mappedState: 2, desc: 'Kitchens & packing stations notified' },
    { label: 'Collecting Items', mappedState: 3, desc: 'Rider is picking up from all locations' },
    { label: 'Out for Delivery', mappedState: 4, desc: 'Rider is en route to your address' },
    { label: 'Delivered', mappedState: 5, desc: 'All your items delivered together!' }
  ] : isStore ? [
    { label: 'Order Placed', mappedState: 0, desc: 'Order received at Jinkzo Store' },
    { label: 'Rider Assigned', mappedState: 1, desc: 'Active rider auto-assigned for delivery' },
    { label: 'Ready for Pickup', mappedState: 2, desc: 'Items packed & awaiting rider collection' },
    { label: 'Out for Delivery', mappedState: 3, desc: 'Rider is en route to your address' },
    { label: 'Delivered', mappedState: 4, desc: 'Order delivered successfully!' }
  ] : [
    { label: 'Order Placed', mappedState: 0, desc: 'Awaiting restaurant approval' },
    { label: 'Preparing', mappedState: 1, desc: 'Accepted & being cooked' },
    { label: 'Awaiting Pickup', mappedState: 2, desc: 'Rider is assigned and on the way' },
    { label: 'Out for Delivery', mappedState: 3, desc: 'Rider is driving to you' },
    { label: 'Delivered', mappedState: 4, desc: 'Enjoy your meal!' }
  ];

  const getStepIndex = (currentStatus, type) => {
    if (type === 'ride') {
      if (currentStatus === 'Placed') return 0;
      if (['Confirmed', 'Rider_Assigned', 'Rider_Accepted'].includes(currentStatus)) return 1;
      if (currentStatus === 'Rider_At_Pickup') return 2;
      if (currentStatus === 'Picked_Up') return 3;
      if (['Delivered', 'Completed'].includes(currentStatus)) return 4;
      return 0;
    } else if (unifiedOrder.isUnified) {
      if (currentStatus === 'Placed') return 0;
      if (currentStatus === 'Confirmed' || currentStatus === 'Accepted') return 1;
      if (['Preparing', 'Packing'].includes(currentStatus)) return 2;
      if (['Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up'].includes(currentStatus)) return 3;
      if (['Out for Delivery', 'Out_for_Delivery', 'Rider_At_Customer'].includes(currentStatus)) return 4;
      if (['Delivered', 'Completed'].includes(currentStatus)) return 5;
      return 0;
    } else if (isStore) {
      if (currentStatus === 'Placed') return 0;
      if (['Rider_Assigned', 'Rider_Accepted'].includes(currentStatus)) return 1;
      if (['Ready_for_Pickup', 'Packing', 'Accepted', 'Rider_At_Restaurant', 'Picked_Up'].includes(currentStatus)) return 2;
      if (['Out for Delivery', 'Out_for_Delivery', 'Rider_At_Customer'].includes(currentStatus)) return 3;
      if (['Delivered', 'Completed'].includes(currentStatus)) return 4;
      return 0;
    } else {
      // Food / Parcel — UNCHANGED
      if (currentStatus === 'Placed') return 0;
      if (currentStatus === 'Confirmed' || currentStatus === 'Accepted' || currentStatus === 'Preparing') return 1;
      if (['Ready_for_Pickup', 'Rider_Assigned', 'Rider_At_Restaurant', 'Picked_Up'].includes(currentStatus)) return 2;
      if (['Out for Delivery', 'Out_for_Delivery', 'Rider_At_Customer'].includes(currentStatus)) return 3;
      if (currentStatus === 'Delivered' || currentStatus === 'Completed') return 4;
      return 0;
    }
  };
  const activeIndex = getStepIndex(unifiedOrder.status, unifiedOrder.orderType);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      {/* Back button */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link
          to="/profile"
          className="flex items-center gap-1 text-xs text-muted hover:text-primary font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Orders</span>
        </Link>
        <div className="text-right">
          <p className="text-[10px] text-muted font-bold uppercase">Order ID</p>
          <p className="text-xs font-bold text-main font-mono">{unifiedOrder.displayId}</p>
        </div>
      </div>

      {/* Hero Tracking Status Card */}
      <div className={`rounded-3xl p-6 border shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        unifiedOrder.orderType === 'ride'
          ? 'bg-yellow-500/5 border-yellow-250'
          : 'bg-surface border-line'
      }`}>
        <div>
          {['Delivered', 'Completed'].includes(unifiedOrder.status) ? (
            <h2 className={`font-display font-extrabold text-2xl ${unifiedOrder.orderType === 'ride' ? 'text-yellow-750' : 'text-green-700'}`}>
              {unifiedOrder.orderType === 'ride' ? 'Ride Completed! 🎉' : 'Order Delivered! 🎉'}
            </h2>
          ) : (
            <h2 className="font-display font-extrabold text-2xl text-main leading-tight">
              {unifiedOrder.orderType === 'ride' ? 'Captain arriving in' : 'Estimated Delivery in'}{' '}
              <span className={`${unifiedOrder.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'} font-black animate-pulse`}>
                {countdown} mins
              </span>
            </h2>
          )}
          <p className="text-xs text-muted font-semibold mt-1 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              ['Delivered', 'Completed'].includes(unifiedOrder.status)
                ? 'bg-green-500'
                : unifiedOrder.orderType === 'ride'
                ? 'bg-yellow-500 animate-ping'
                : 'bg-primary animate-ping'
            }`} />
            <span>
              Active Status: <strong className="text-main font-bold">
                {unifiedOrder.status === 'Preparing' && unifiedOrder.orderType === 'ride'
                  ? t('ride.captainAtPickup', 'Captain at Pickup')
                  : unifiedOrder.status === 'Preparing' && unifiedOrder.isUnified
                  ? 'Your rider is collecting your items'
                  : t(`orderStatus.${unifiedOrder.status}`, unifiedOrder.status?.replace(/_/g, ' '))}
              </strong>
            </span>
          </p>
        </div>

        {/* Re-poll indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted font-semibold bg-base px-3 py-1.5 rounded-xl border border-line">
          <RefreshCw className={`w-3.5 h-3.5 animate-spin ${unifiedOrder.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'}`} />
          <span>Live Tracking Active</span>
        </div>
      </div>

      {/* Real Google Maps tracking map */}
      {!['Delivered', 'Completed'].includes(unifiedOrder.status) && (
        <InteractiveMap
          status={unifiedOrder.status}
          restaurantLat={unifiedOrder.orderType !== 'ride' ? unifiedOrder.restaurantLocation?.lat : undefined}
          restaurantLng={unifiedOrder.orderType !== 'ride' ? unifiedOrder.restaurantLocation?.lng : undefined}
          customerLat={unifiedOrder.orderType !== 'ride' ? unifiedOrder.customerLocation?.lat : undefined}
          customerLng={unifiedOrder.orderType !== 'ride' ? unifiedOrder.customerLocation?.lng : undefined}
          deliveryMethod={unifiedOrder.orderType === 'ride' ? 'Ride' : 'Standard'}
          orderId={unifiedOrder._id}
          isRide={unifiedOrder.orderType === 'ride'}
          ridePickupLat={unifiedOrder.orderType === 'ride' ? (unifiedOrder.pickupLocation?.lat ?? unifiedOrder.customerLocation?.lat) : undefined}
          ridePickupLng={unifiedOrder.orderType === 'ride' ? (unifiedOrder.pickupLocation?.lng ?? unifiedOrder.customerLocation?.lng) : undefined}
          rideDropLat={unifiedOrder.orderType === 'ride' ? (unifiedOrder.dropLocation?.lat ?? unifiedOrder.restaurantLocation?.lat) : undefined}
          rideDropLng={unifiedOrder.orderType === 'ride' ? (unifiedOrder.dropLocation?.lng ?? unifiedOrder.restaurantLocation?.lng) : undefined}
          riderLat={riderLoc?.lat}
          riderLng={riderLoc?.lng}
        />
      )}

      {/* Review & Suggestion Box */}
      {['Delivered', 'Completed'].includes(unifiedOrder.status) && (
        <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4 animate-scale-up">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="text-xl">⭐️</span>
            <div>
              <h3 className="font-display font-extrabold text-base text-main">
                {unifiedOrder.orderType === 'ride' ? 'Rate Your Ride Experience' : 'Rate Your Order & Delivery'}
              </h3>
              <p className="text-xs text-muted font-semibold mt-0.5">Your feedback helps us improve our service</p>
            </div>
          </div>

          {Number(unifiedOrder.review?.rating) > 0 ? (
            <div className="flex flex-col gap-3.5 bg-green-50/40 border border-green-100 rounded-2xl p-5 text-green-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Check className="w-5 h-5 text-green-600 bg-green-100 p-0.5 rounded-full" />
                  <span className="font-bold text-sm">Review Submitted</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= unifiedOrder.review.rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {unifiedOrder.review.comment && (
                <p className="text-xs text-gray-700 italic border-t border-green-200/50 pt-2.5 mt-0.5">
                  "{unifiedOrder.review.comment}"
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-0.5">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reviewComment" className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-0.5">Suggestions & Comments</label>
                <textarea
                  id="reviewComment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    unifiedOrder.orderType === 'ride'
                      ? 'Tell us about the captain, vehicle, safety or suggestions...'
                      : 'How was the food taste, packaging, delivery speed, and suggestions...'
                  }
                  className="bg-base border border-line-strong focus:border-primary focus:bg-surface rounded-2xl px-4 py-3 text-xs text-main outline-none resize-none leading-relaxed transition-all"
                />
              </div>

              {reviewError && (
                <p className="text-xs font-bold text-red-500">{reviewError}</p>
              )}

              <button
                type="submit"
                disabled={rating === 0 || isSubmittingReview}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-6 rounded-2xl cursor-pointer shadow-md disabled:opacity-50 transition-all w-full md:w-max md:self-end"
              >
                {isSubmittingReview ? 'Submitting Review...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* YOUR ORDER BREAKDOWN SECTION (Food & Store Multi-Source) */}
      {unifiedOrder.orderType !== 'ride' && (
        <div className="bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display font-extrabold text-base text-main flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span>Your Order ({unifiedOrder.totalItemCount} {unifiedOrder.totalItemCount === 1 ? 'item' : 'items'})</span>
            </h3>
            {unifiedOrder.isUnified && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-100 text-primary dark:bg-violet-950/40 dark:text-violet-300">
                One Order • {unifiedOrder.sources.length} Pickups
              </span>
            )}
          </div>

          {/* Sources with items */}
          <div className="flex flex-col gap-4">
            {unifiedOrder.sources.map((source, sIdx) => (
              <div key={sIdx} className="bg-base/70 rounded-2xl p-4 border border-line flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{source.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm text-main">{source.name}</h4>
                      <p className="text-[10px] text-muted font-medium">{source.items.length} {source.items.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    source.isPickedUp
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                      : source.isReadyForPickup
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {source.statusText}
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-line/40">
                  {source.items.map((it, itIdx) => (
                    <div key={itIdx} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {it.image && (
                          <img
                            src={getImageUrl(it.image, 'dish')}
                            alt={it.name}
                            onError={(e) => handleImageError(e, 'dish')}
                            className="w-9 h-9 rounded-lg object-cover border border-line"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-main">{it.name} <span className="text-primary font-black">×{it.quantity}</span></span>
                          {(it.weight || it.unit || it.packSize) && (
                            <span className="text-[10px] text-muted">{it.weight || it.unit || it.packSize}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold font-mono text-main">₹{((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-2 mt-1">
            <div className="flex justify-between text-xs text-muted font-semibold">
              <span>Items Total</span>
              <span className="text-main font-bold">₹{(unifiedOrder.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted font-semibold">
              <span>Delivery Fees</span>
              <span className="text-main font-bold">₹{(unifiedOrder.deliveryFee || 0).toFixed(2)}</span>
            </div>
            {unifiedOrder.platformFee > 0 && (
              <div className="flex justify-between text-xs text-muted font-semibold">
                <span>Platform Fee</span>
                <span className="text-main font-bold">₹{(unifiedOrder.platformFee || 0).toFixed(2)}</span>
              </div>
            )}
            {unifiedOrder.promoDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-bold">
                <span>Promo Discount</span>
                <span>-₹{unifiedOrder.promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-line pt-2 flex justify-between items-center">
              <span className="font-extrabold text-sm text-main uppercase">Total Payable</span>
              <span className="font-display font-black text-lg text-primary">₹{(unifiedOrder.total || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl p-3.5 text-center">
            <p className="text-xs font-bold text-primary dark:text-primary-light flex items-center justify-center gap-1.5">
              <span>🛵</span>
              <span>All your items will be delivered together in one single delivery.</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Left 3 cols: Status Timeline */}
        <div className="md:col-span-3 bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-5">
          <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">
            Delivery Timeline
          </h3>

          <div className="flex flex-col gap-6 relative pl-6 border-l-2 border-line">
            {unifiedOrder.status !== 'Rejected' && timelineSteps.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;

              let bulletColor = 'bg-surface border-line-strong text-gray-300';
              if (isCompleted) bulletColor = 'bg-green-600 border-green-600 text-white';
              if (isActive) bulletColor = 'bg-primary border-primary text-white ring-4 ring-violet-50';

              return (
                <div key={idx} className="relative flex flex-col gap-0.5">
                  {/* Timeline Bullet */}
                  <div className={`absolute -left-9.5 top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${bulletColor}`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <h4 className={`text-sm font-bold transition-colors ${
                    isActive
                      ? unifiedOrder.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'
                      : isCompleted ? 'text-green-700' : 'text-muted'
                  }`}>
                    {step.label}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed font-semibold">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 cols: Agent & Receipt info */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* Delivery Instructions */}
          {unifiedOrder.instruction && (
            <div className="bg-violet-50/50 border border-violet-100 text-violet-900 rounded-3xl p-5 flex gap-2.5 text-xs leading-relaxed font-medium">
              <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-main">Your Delivery Instructions</h5>
                <p className="mt-0.5 text-gray-655 font-semibold">{unifiedOrder.instruction}</p>
              </div>
            </div>
          )}

          {/* Delivery Rider profile card */}
          {unifiedOrder.deliveryAgent && (
            <div className={`rounded-3xl p-5 border shadow-2xs flex flex-col gap-4 ${
              unifiedOrder.orderType === 'ride' ? 'bg-yellow-500/[0.02] border-yellow-200' : 'bg-surface border-line'
            }`}>
              <h3 className="font-display font-extrabold text-sm text-gray-855 border-b border-line pb-2">
                {unifiedOrder.orderType === 'ride' ? 'Your Ride Captain' : 'Your Delivery Valet'}
              </h3>

              <div className="flex items-center gap-3">
                {/* Rider Photo avatar */}
                {unifiedOrder.deliveryAgent.profileImage ? (
                  <img
                    src={getImageUrl(unifiedOrder.deliveryAgent.profileImage, 'avatar')}
                    alt={unifiedOrder.deliveryAgent.name}
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-12 h-12 rounded-2xl object-cover border border-line"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base border ${
                    unifiedOrder.orderType === 'ride'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-250'
                      : 'bg-violet-50 text-primary border-violet-100'
                  }`}>
                    {unifiedOrder.deliveryAgent.name[0]}
                  </div>
                )}
                <div className="flex flex-col gap-0.5 flex-grow">
                  <h4 className="text-sm font-bold text-gray-755">{unifiedOrder.deliveryAgent.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-muted font-bold">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span>{(unifiedOrder.deliveryAgent.rating || 5.0).toFixed(1)} Rating</span>
                  </div>
                </div>
              </div>

              {/* Call agent buttons — only show when delivery is still in progress */}
              <div className="flex flex-col gap-2">
                {!['Delivered', 'Completed'].includes(unifiedOrder.status) && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${unifiedOrder.deliveryAgent.phone}`}
                    className={`flex-grow text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      unifiedOrder.orderType === 'ride'
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                        : 'bg-primary/10 hover:bg-primary/15 text-primary'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {unifiedOrder.deliveryAgent.name.split(' ')[0]}</span>
                  </a>
                </div>
                )}

                {['Delivered', 'Completed'].includes(unifiedOrder.status) && (
                  unifiedOrder.riderReview ? (
                    <div className="bg-violet-50/40 border border-violet-100/35 rounded-2xl p-3 text-[11px] font-semibold text-main flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Rider Rating:</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= unifiedOrder.riderReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      {unifiedOrder.riderReview.tipAmount > 0 && (
                        <div className="flex justify-between items-center border-t border-violet-100/35 pt-1.5 mt-0.5">
                          <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Tipped:</span>
                          <span className="font-extrabold text-primary">₹{unifiedOrder.riderReview.tipAmount}</span>
                        </div>
                      )}
                      {unifiedOrder.riderReview.comment && (
                        <div className="border-t border-violet-100/35 pt-1.5 mt-0.5">
                          <span className="font-bold text-muted uppercase tracking-wider text-[9px] block mb-0.5">Comment:</span>
                          <p className="italic text-muted">"{unifiedOrder.riderReview.comment}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsRiderModalOpen(true)}
                      className={`w-full text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-xs ${
                        unifiedOrder.orderType === 'ride'
                          ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                          : 'bg-primary hover:bg-primary-hover text-white'
                      }`}
                    >
                      Rate & Tip Rider
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Live Chat Panel */}
          {unifiedOrder.deliveryAgent && (
            <div className="rounded-3xl p-5 border shadow-2xs flex flex-col gap-3 bg-surface border-line">
              <h3 className="font-display font-extrabold text-sm text-main border-b border-line pb-2 flex items-center justify-between">
                <span>Live Chat with Rider</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </h3>

              {/* Scrollable messages container */}
              <div ref={chatContainerRef} className="h-64 overflow-y-auto flex flex-col gap-3.5 pr-1.5 scrollbar-thin">
                {unifiedOrder.messages && unifiedOrder.messages.length > 0 ? (
                  unifiedOrder.messages.map((msg, idx) => {
                    if (msg.sender === 'system') {
                      return (
                        <div key={idx} className="text-[10px] text-muted font-bold text-center bg-base/70 py-1.5 px-3 rounded-lg w-max mx-auto max-w-[85%] border border-line">
                          {msg.text}
                        </div>
                      );
                    }

                    const isMe = msg.sender === 'customer';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-1 max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <div className={`px-3.5 py-2 rounded-2xl text-xs font-semibold leading-relaxed ${
                          isMe
                            ? 'bg-primary text-white rounded-tr-none shadow-3xs'
                            : 'bg-gray-100 text-main rounded-tl-none border border-gray-150'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[8px] text-muted font-medium">
                          {formatAppTimeOnly(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center text-muted gap-1.5 py-12">
                    <span className="text-xl">💬</span>
                    <p className="text-xs font-bold text-muted">No messages yet</p>
                    <p className="text-[10px] max-w-[160px] leading-tight">Send a message to coordinate directions with your Rider.</p>
                  </div>
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-line pt-3 mt-1">
                <input
                  type="text"
                  placeholder="Type a message to Rider..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="bg-base border border-line-strong focus:border-primary focus:bg-surface rounded-xl px-3.5 py-2.5 text-xs text-main outline-none flex-grow"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="bg-primary hover:bg-primary-hover text-white p-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          )}

          {/* Secure Safe Badge */}
          <div className={`rounded-3xl p-4 flex gap-2.5 ${
            unifiedOrder.orderType === 'ride'
              ? 'bg-yellow-50/40 border border-yellow-200/50 text-yellow-900'
              : 'bg-sky-50/50 border border-sky-100 text-sky-800'
          }`}>
            <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${unifiedOrder.orderType === 'ride' ? 'text-yellow-700' : 'text-sky-700'}`} />
            <div>
              <h5 className="font-bold text-xs">
                {unifiedOrder.orderType === 'ride' ? 'Ride Shield Protection' : 'Assurance Protection'}
              </h5>
              <p className="text-[9px] mt-0.5 leading-relaxed font-semibold">
                {unifiedOrder.orderType === 'ride'
                  ? 'Your ride and packages are protected with instant insurance cover. Call customer care for ride safety guidelines.'
                  : 'Your delivery is covered under our premium safety policy. Call support at any point for dispatch details.'
                }
              </p>
            </div>
          </div>

        </div>
      </div>

      <RiderFeedbackModal
        isOpen={isRiderModalOpen}
        onClose={() => setIsRiderModalOpen(false)}
        orderId={unifiedOrder._id}
        deliveryAgent={unifiedOrder.deliveryAgent}
        token={token}
        onFeedbackSubmit={(updatedOrder) => setOrder(updatedOrder)}
      />
    </div>
  );
}
