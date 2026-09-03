import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Star, Shield, ArrowLeft, RefreshCw, Calendar, ShoppingBag, Check, Send, FileText, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import InteractiveMap from '../components/InteractiveMap';
import { formatAppDateOnly, formatAppTimeOnly } from '../utils/dateUtils';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import RestaurantFeedbackModal from '../components/RestaurantFeedbackModal';
import StoreFeedbackModal from '../components/StoreFeedbackModal';
import CancelOrderModal from '../components/CancelOrderModal';
import { 
  getContributingFoodRestaurants, 
  getContributingStoreSources, 
  getCustomerCancellationEligibility,
  getDeliveryFeeBreakdown,
  getOrderDeliveredAt,
  formatCurrency,
  formatDistance,
  formatRating
} from '../utils/orderUtils';
import { playStatusChangeSound, playCaptainAssignedSound, playDeliveredSound } from '../utils/audio';
import { io } from 'socket.io-client';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

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
  const [gpsStatus, setGpsStatus] = useState('locating'); // 'live' | 'locating' | 'unavailable'

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Review states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Rider review modal states
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const autoOpenTriggered = useRef(false);

  // Restaurant review modal states
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState(false);
  const [selectedRestaurantForReview, setSelectedRestaurantForReview] = useState(null);

  // Store review modal states (Grocery, Meat, Veg & Fruits, Bakery)
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedStoreForReview, setSelectedStoreForReview] = useState(null);

  const prevStatusRef = useRef(null);
  const prevAgentRef = useRef(null);

  useEffect(() => {
    if (order) {
      if (prevStatusRef.current && prevStatusRef.current !== order.status) {
        if (order.status === 'Delivered') {
          playDeliveredSound();
        } else {
          playStatusChangeSound();
        }
      }
      if (order.deliveryAgent && !prevAgentRef.current) {
        playCaptainAssignedSound();
      }
      
      prevStatusRef.current = order.status;
      if (order.deliveryAgent) {
        prevAgentRef.current = order.deliveryAgent;
      }
    }
  }, [order?.status, order?.deliveryAgent]);

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
  const fetchOrderDetails = React.useCallback(async () => {
    if (!id || !token) return;
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
        else if (data.status === 'Out for Delivery') setCountdown(isRide ? 5 : 10);
        else if (data.status === 'Delivered') setCountdown(0);
      }
    } catch (err) {
      console.error('Fetch tracking order error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  // Dynamic pickup progress calculation helper
  const pickupProgress = order ? {
    activeStops: (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled'),
    totalActive: (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled').length,
    collectedCount: (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled' && s.status === 'Collected').length,
    allCollected: (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled').length > 0 &&
                  (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled' && s.status === 'Collected').length ===
                  (order.pickupStops || []).filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled').length
  } : { activeStops: [], totalActive: 0, collectedCount: 0, allCollected: false };

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Fallback revalidation: Poll every 10 seconds ONLY while order is active
  useEffect(() => {
    if (!order || ['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status)) return;
    const pollInterval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(pollInterval);
  }, [order?.status, fetchOrderDetails]);

  // Re-fetch latest order data on window focus / tab visibility change
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchOrderDetails();
      }
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchOrderDetails]);

  // Socket.IO real-time status & pickupStops update subscription
  useEffect(() => {
    if (!id || !token) return;

    const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const joinRooms = () => {
      socket.emit('joinOrder', id);
      socket.emit('join', `order_${id}`);
      socket.emit('join', `order:${id}`);
    };

    joinRooms();

    const handleOrderUpdate = (data) => {
      console.log('[TRACKING SOCKET] Order update received:', data);
      if (!data) return;
      if (data.order && typeof data.order === 'object') {
        setOrder(data.order);
      } else if (data.orderId && String(data.orderId) === String(id)) {
        setOrder(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (data.status) updated.status = data.status;
          if (data.pickupStops) updated.pickupStops = data.pickupStops;
          return updated;
        });
      }
    };

    socket.on('statusUpdated', handleOrderUpdate);
    socket.on('pickupStopUpdated', handleOrderUpdate);
    socket.on('orderUpdated', handleOrderUpdate);
    socket.on('orderStatusChanged', handleOrderUpdate);

    socket.on('locationUpdated', ({ lat, lng, status }) => {
      console.log('[TRACKING SOCKET] Live rider location update:', lat, lng);
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setRiderLoc({ lat, lng });
        setGpsStatus('live');
      } else if (status) {
        setGpsStatus(status);
      }
    });

    socket.on('connect', () => {
      joinRooms();
      fetchOrderDetails();
    });

    return () => {
      socket.disconnect();
    };
  }, [id, token, fetchOrderDetails]);

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

  const isCatalogOrder = !order.restaurantId && Array.isArray(order.supplierDeliveries) && order.supplierDeliveries.length > 0;
  const isMixedOrder = order.restaurantId && Array.isArray(order.supplierDeliveries) && order.supplierDeliveries.length > 0;
  const cancelEligibility = getCustomerCancellationEligibility(order);

  const timelineSteps = order.orderType === 'ride' ? [
    { label: 'Booking Placed', mappedState: 0, desc: 'Finding nearest Ride Captain' },
    { label: 'Captain Assigned', mappedState: 1, desc: 'Captain accepted your ride request' },
    { label: 'Captain at Pickup', mappedState: 2, desc: 'Captain is waiting at pickup spot' },
    { label: 'Ride in Progress', mappedState: 3, desc: 'Captain is en route to destination' },
    { label: 'Completed', mappedState: 4, desc: 'Reached destination successfully!' }
  ] : [
    {
      label: 'Order Placed',
      mappedState: 0,
      desc: isCatalogOrder
        ? 'Finding a delivery partner for your order'
        : isMixedOrder
          ? 'Finding a delivery partner — restaurant is preparing'
          : 'Awaiting restaurant approval'
    },
    {
      label: isCatalogOrder ? 'Partner Assigned' : 'Preparing',
      mappedState: 1,
      desc: isCatalogOrder
        ? 'Delivery partner is heading to the store'
        : 'Accepted & being prepared'
    },
    {
      label: 'Out for Delivery',
      mappedState: 2,
      desc: isCatalogOrder ? 'Order has been picked up from store' : 'Food picked up & on the way'
    },
    {
      label: 'Delivered',
      mappedState: 3,
      desc: isCatalogOrder ? 'Delivered safely to customer' : 'Enjoy your meal!'
    }
  ];

  // Map order.status into step index
  let activeIndex = 0;
  if (order.status === 'Placed') activeIndex = 0;
  else if (['Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned'].includes(order.status)) activeIndex = 1;
  else if (['Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer'].includes(order.status)) activeIndex = 2;
  else if (['Delivered', 'Completed'].includes(order.status)) activeIndex = 3;

  // Active status color badge
  const isPending = ['Placed', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer'].includes(order.status);

  // Group all orders placed in this checkout session
  const allOrdersInSession = [order, ...siblingOrders];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pb-28 pt-4 flex flex-col gap-6 animate-fade-in w-full">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          to="/order-history" 
          className="flex items-center gap-1 text-xs text-muted hover:text-primary font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Orders</span>
        </Link>
        <div className="text-right">
          <p className="text-[10px] text-muted font-bold uppercase">Order ID</p>
          <p className="text-xs font-bold text-main font-mono">#{order._id.substr(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Hero Tracking Status Card */}
      <div className={`rounded-3xl p-6 border shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        order.orderType === 'ride' 
          ? 'bg-yellow-500/5 border-yellow-250' 
          : 'bg-surface border-line'
      }`}>
        <div>
          {['Delivered', 'Completed'].includes(order.status) ? (
            <h2 className={`font-display font-extrabold text-2xl ${order.orderType === 'ride' ? 'text-yellow-750' : 'text-green-700'}`}>
              {order.orderType === 'ride' ? 'Ride Completed! 🎉' : 'Order Delivered! 🎉'}
            </h2>
          ) : (
            <h2 className="font-display font-extrabold text-2xl text-main leading-tight">
              {order.orderType === 'ride' ? 'Captain arriving in' : 'Arriving in'}{' '}
              <span className={`${order.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'} font-black animate-pulse`}>
                {countdown} mins
              </span>
            </h2>
          )}
          <p className="text-xs text-muted font-semibold mt-1 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              ['Delivered', 'Completed'].includes(order.status) 
                ? 'bg-green-500' 
                : order.orderType === 'ride' 
                ? 'bg-yellow-500 animate-ping' 
                : 'bg-primary animate-ping'
            }`} />
            <span>Active Status: <strong className="text-main font-bold">{order.status === 'Preparing' && order.orderType === 'ride' ? t('ride.captainAtPickup', 'Captain at Pickup') : t(`orderStatus.${order.status}`, order.status)}</strong></span>
          </p>
        </div>

        {/* Actions & Live Feed Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {!['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status) && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted font-semibold bg-base px-3 py-1.5 rounded-xl border border-line">
              <RefreshCw className={`w-3.5 h-3.5 animate-spin ${order.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'}`} />
              <span>Polling Live Feed</span>
            </div>
          )}

          {/* Customer Cancellation Action */}
          {!['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status) && (
            cancelEligibility.canCancelAnything ? (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-extrabold text-red-600 bg-red-50 hover:bg-red-100 border border-red-300 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>{order.orderType === 'ride' ? 'Cancel Ride' : 'Cancel Order'}</span>
              </button>
            ) : (
              <span className="text-[10px] text-muted font-bold bg-base/80 border border-line px-2.5 py-1.5 rounded-xl">
                Cancellation unavailable
              </span>
            )
          )}
        </div>
      </div>

      {/* Sibling Orders Selector */}
      {allOrdersInSession.length > 1 && order.orderType !== 'ride' && (
        <div className="bg-surface border border-gray-150 rounded-3xl p-4 flex flex-col gap-2.5 shadow-2xs">
          <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider px-1">
            Track Sibling Kitchens (Placed in Same Order)
          </span>
          <div className="flex flex-wrap gap-2">
            {allOrdersInSession.map((sessionOrder) => {
              const isCurrent = sessionOrder._id === order._id;
              const restName = sessionOrder.restaurant?.name || 'Restaurant';
              return (
                <Link
                  key={sessionOrder._id}
                  to={`/order-tracking/${sessionOrder._id}`}
                  className={`px-3.5 py-2 rounded-2xl text-[11px] font-bold transition-all border flex items-center gap-2 ${
                    isCurrent
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface text-gray-650 border-line-strong hover:bg-base/50'
                  }`}
                >
                  <span className="truncate max-w-[150px]">{restName}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                    isCurrent
                      ? 'bg-surface/20 text-white'
                      : ['Delivered', 'Completed'].includes(sessionOrder.status)
                      ? 'bg-green-50 text-green-700 border border-green-150'
                      : 'bg-violet-50 text-primary border border-violet-150'
                  }`}>
                    {sessionOrder.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Real Google Maps tracking map */}
      {/* For rides:
           pickupLocation / customerLocation = pickup (where rider heads FIRST)
           dropLocation / restaurantLocation = destination (where rider heads AFTER pickup)
           We pass them as ridePickupLat/Lng and rideDropLat/Lng so GoogleMapContainer
           can route correctly for each phase without confusing food-order semantics.
      */}
      {!['Delivered', 'Completed'].includes(order.status) && (
        <InteractiveMap 
          status={order.status} 
          restaurantName={order.orderType === 'ride' ? 'Pickup Point' : (order.restaurant?.name || order.restaurantLocation?.formattedAddress || 'Restaurant')}
          restaurantAddress={order.orderType === 'ride' ? (order.pickupLocation?.formattedAddress || order.pickupAddress?.street || '') : (order.restaurantLocation?.formattedAddress || '')}
          restaurantLat={order.orderType !== 'ride' ? order.restaurantLocation?.lat : undefined}
          restaurantLng={order.orderType !== 'ride' ? order.restaurantLocation?.lng : undefined}
          customerName={order.customerName || order.user?.name || 'Customer Location'}
          customerAddress={order.orderType === 'ride' ? (order.dropLocation?.formattedAddress || order.address?.street || '') : (order.customerLocation?.formattedAddress || order.address?.street || '')}
          customerLat={order.orderType !== 'ride' ? order.customerLocation?.lat : undefined}
          customerLng={order.orderType !== 'ride' ? order.customerLocation?.lng : undefined}
          deliveryMethod={order.orderType === 'ride' ? 'Ride' : 'Standard'}
          orderId={order._id}
          isRide={order.orderType === 'ride'}
          ridePickupLat={order.orderType === 'ride' ? (order.pickupLocation?.lat ?? order.customerLocation?.lat) : undefined}
          ridePickupLng={order.orderType === 'ride' ? (order.pickupLocation?.lng ?? order.customerLocation?.lng) : undefined}
          rideDropLat={order.orderType === 'ride' ? (order.dropLocation?.lat ?? order.restaurantLocation?.lat) : undefined}
          rideDropLng={order.orderType === 'ride' ? (order.dropLocation?.lng ?? order.restaurantLocation?.lng) : undefined}
          riderLat={riderLoc?.lat}
          riderLng={riderLoc?.lng}
          gpsStatus={gpsStatus}
          supplierDeliveries={order.supplierDeliveries || []}
          pickupStops={order.pickupStops || []}
          routeSequence={order.routeSequence || []}
        />
      )}

      {/* ── YOUR FEEDBACK / RATINGS SECTION ── */}
      {['Delivered', 'Completed'].includes(order.status) && (
        <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-5 animate-scale-up">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐️</span>
              <div>
                <h3 className="font-display font-extrabold text-base text-main">
                  Your Feedback & Ratings
                </h3>
                <p className="text-xs text-muted font-medium mt-0.5">
                  Thank you for helping us maintain high quality standards
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. DELIVERY RIDER RATING */}
            {order.deliveryAgent && order.deliveryAgent.name && (
              <div className="bg-base border border-line rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                    {order.orderType === 'ride' ? 'Ride Captain' : 'Delivery Rider'}
                  </span>

                  <div className="flex items-center gap-3">
                    {order.deliveryAgent.profileImage ? (
                      <img
                        src={getImageUrl(order.deliveryAgent.profileImage, 'avatar')}
                        alt={order.deliveryAgent.name}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-11 h-11 rounded-xl object-cover border border-line"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-primary font-black text-base flex items-center justify-center border border-violet-200">
                        {order.deliveryAgent.name ? order.deliveryAgent.name[0].toUpperCase() : 'R'}
                      </div>
                    )}

                    <div className="flex flex-col">
                      <h4 className="font-bold text-sm text-main">{order.deliveryAgent.name}</h4>
                      {order.deliveryAgent.rating != null && (
                        <span className="text-[10px] text-yellow-500 font-bold">
                          ★ {formatRating(order.deliveryAgent.rating)} Current Rating
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {order.riderReview && Number(order.riderReview.rating) > 0 ? (
                  <div className="bg-green-50/50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-green-800 dark:text-green-300">
                        Your Rating:
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= order.riderReview.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {order.riderReview.comment && (
                      <p className="text-muted italic text-[11px]">
                        "{order.riderReview.comment}"
                      </p>
                    )}

                    {order.riderReview.tipAmount > 0 && (
                      <span className="text-[10px] font-bold text-green-700 dark:text-green-400">
                        Tip: ₹{order.riderReview.tipAmount}
                      </span>
                    )}

                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" /> Feedback submitted
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsRiderModalOpen(true)}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>Rate & Tip Rider</span>
                  </button>
                )}
              </div>
            )}

            {/* 2. RESTAURANT(S) RATINGS */}
            {order.orderType !== 'ride' && getContributingFoodRestaurants(order).length > 0 && (
              <div className="flex flex-col gap-3">
                {getContributingFoodRestaurants(order).map((rest) => {
                  const restReview = Array.isArray(order.restaurantReviews)
                    ? order.restaurantReviews.find((r) => String(r.restaurantId) === String(rest.id))
                    : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)) ? order.review : null);

                  return (
                    <div key={rest.id} className="bg-base border border-line rounded-2xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                          Restaurant Food & Packaging
                        </span>

                        <div className="flex items-center gap-3">
                          {rest.image ? (
                            <img
                              src={getImageUrl(rest.image, 'restaurant')}
                              alt={rest.name}
                              onError={(e) => handleImageError(e, 'restaurant')}
                              className="w-11 h-11 rounded-xl object-cover border border-line"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-primary text-white font-black text-base flex items-center justify-center">
                              🍽️
                            </div>
                          )}

                          <div className="flex flex-col">
                            <h4 className="font-bold text-sm text-main">{rest.name}</h4>
                            <span className="text-[10px] text-muted font-medium">Food Partner</span>
                          </div>
                        </div>
                      </div>

                      {restReview && Number(restReview.rating) > 0 ? (
                        <div className="bg-green-50/50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-green-800 dark:text-green-300">
                              Your Rating:
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= restReview.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {restReview.comment && (
                            <p className="text-muted italic text-[11px]">
                              "{restReview.comment}"
                            </p>
                          )}

                          <span className="text-[10px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1 mt-0.5">
                            <Check className="w-3 h-3" /> Feedback submitted
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRestaurantForReview(rest);
                            setIsRestaurantModalOpen(true);
                          }}
                          className="w-full bg-violet-50 hover:bg-violet-100 text-primary border border-violet-200 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Rate Restaurant</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. STORE / SUPPLIER(S) RATINGS (Grocery, Meat, Veg & Fruits, Bakery) */}
            {order.orderType !== 'ride' && getContributingStoreSources(order).length > 0 && (
              <div className="flex flex-col gap-3">
                {getContributingStoreSources(order).map((src) => {
                  const storeReview = Array.isArray(order.storeReviews)
                    ? order.storeReviews.find((r) => String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType)
                    : null;

                  return (
                    <div key={`${src.sourceId}_${src.serviceType}`} className="bg-base border border-line rounded-2xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                          {src.serviceLabel} Fulfillment & Quality
                        </span>

                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 flex items-center justify-center font-bold text-base border border-emerald-200">
                            🏪
                          </div>

                          <div className="flex flex-col">
                            <h4 className="font-bold text-sm text-main">{src.sourceName}</h4>
                            <span className="text-[10px] text-muted font-medium">{src.serviceLabel} Partner</span>
                          </div>
                        </div>
                      </div>

                      {storeReview && Number(storeReview.rating) > 0 ? (
                        <div className="bg-green-50/50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-green-800 dark:text-green-300">
                              Your Rating:
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= storeReview.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {storeReview.comment && (
                            <p className="text-muted italic text-[11px]">
                              "{storeReview.comment}"
                            </p>
                          )}

                          <span className="text-[10px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1 mt-0.5">
                            <Check className="w-3 h-3" /> Feedback submitted
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStoreForReview(src);
                            setIsStoreModalOpen(true);
                          }}
                          className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Rate {src.serviceLabel}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Left 3 cols: Status Timeline (ACTIVE ORDERS ONLY) or Completed Order Summary */}
        {!['Delivered', 'Completed'].includes(order.status) ? (
          <div className="md:col-span-3 bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-line pb-3 gap-2 flex-wrap">
              <h3 className="font-display font-extrabold text-base text-main">
                Delivery Timeline
              </h3>
              {cancelEligibility.canCancelAnything && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-red-600 bg-red-50 hover:bg-red-100 border border-red-300 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>{order.orderType === 'ride' ? 'Cancel Ride' : 'Cancel Order'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-6 relative pl-6 border-l-2 border-line">
              {order.status !== 'Rejected' && timelineSteps.map((step, idx) => {
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
                    
                    <h4 className={`text-sm font-bold transition-colors flex items-center gap-2 flex-wrap ${
                      isActive 
                        ? order.orderType === 'ride' ? 'text-yellow-600' : 'text-primary' 
                        : isCompleted ? 'text-green-700' : 'text-muted'
                    }`}>
                      <span>{step.label}</span>
                      {step.mappedState === 2 && Array.isArray(order.pickupStops) && order.pickupStops.length > 0 && (
                        <span className="text-[10px] font-extrabold text-primary bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                          {pickupProgress.collectedCount}/{pickupProgress.totalActive} Collected
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed font-semibold">
                      {step.mappedState === 2 && pickupProgress.allCollected && !['Out_for_Delivery', 'Out for Delivery', 'Delivered', 'Completed'].includes(order.status)
                        ? '3/3 Collected — All pickup items collected — Rider will start delivery shortly'
                        : step.desc}
                    </p>

                    {/* Multi-stop pickup sources progress breakdown */}
                    {step.mappedState === 2 && Array.isArray(order.pickupStops) && order.pickupStops.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5 bg-base/80 border border-line rounded-2xl p-3">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted">
                          Pickup Sources ({order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled' && s.status === 'Collected').length} of {order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled').length} Completed)
                        </span>
                        <div className="flex flex-col gap-1.5 mt-0.5">
                          {order.pickupStops.map((stop, sIdx) => {
                            const isSupplier = stop.sourceType === 'supplier';
                            const isCollected = stop.status === 'Collected';
                            const isArrived = stop.status === 'Rider_Arrived';
                            const isStopRejected = stop.status === 'Rejected' || stop.status === 'Cancelled';
                            const isReady = stop.status === 'Ready' || (isSupplier && stop.status !== 'Collected' && !isArrived && !isStopRejected);

                            const statusLabel = isStopRejected ? 'Cancelled' :
                              isCollected ? 'Collected ✓' :
                              isArrived ? (isSupplier ? 'Rider Reached Store' : 'Rider Reached Restaurant') :
                              isReady ? 'Ready for Pickup' :
                              stop.status === 'Preparing' ? 'Preparing' :
                              'Waiting for Restaurant';

                            const statusClass = isStopRejected ? 'bg-red-100 text-red-800' :
                              isCollected ? 'bg-green-100 text-green-800' :
                              isArrived ? 'bg-violet-100 text-violet-800' :
                              isReady ? 'bg-emerald-100 text-emerald-800' :
                              'bg-yellow-100 text-yellow-800';

                            return (
                              <div
                                key={stop._id || stop.stopId || sIdx}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                                  isStopRejected
                                    ? 'bg-red-50/60 border-red-200 text-red-800 opacity-80'
                                    : isCollected
                                    ? 'bg-green-50/70 border-green-200 text-green-900'
                                    : isArrived || isReady
                                    ? 'bg-violet-50/70 border-violet-200 text-violet-950'
                                    : 'bg-surface border-line text-main'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm flex-shrink-0">
                                    {isStopRejected ? '❌' : isCollected ? '✅' : isSupplier ? '🏪' : '🍽️'}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`font-bold truncate ${isStopRejected ? 'line-through text-red-700' : isCollected ? 'line-through text-green-800' : 'text-main'}`}>
                                      {stop.sourceName}
                                    </span>
                                    {stop.address && (
                                      <span className="text-[10px] text-muted truncate">{stop.address}</span>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize flex-shrink-0 ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* COMPLETED ORDER DETAILS (NO TIMELINE / NO MAP) */
          <div className="md:col-span-3 bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-main">
                  Completed Order Summary
                </h3>
                <p className="text-xs text-muted font-medium mt-0.5">
                  Delivered on {getOrderDeliveredAt(order) ? formatAppDateOnly(getOrderDeliveredAt(order)) : 'Delivery completed'}
                </p>
              </div>
              <span className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-extrabold text-xs px-3 py-1 rounded-full">
                Delivered
              </span>
            </div>

            {/* Order Items Table */}
            {order.orderType !== 'ride' && Array.isArray(order.items) && order.items.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                  Ordered Items ({order.items.length})
                </span>
                <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex justify-between items-center bg-base/20 text-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${item.isCancelled ? 'line-through text-red-600' : 'text-main'}`}>
                            {item.name}
                          </span>
                          {item.isCancelled && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-red-50 text-red-600 border border-red-200 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-primary font-semibold">
                          From: {item.sourceName || item.supplierName || (order.restaurant?.name || 'Restaurant')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${item.isCancelled ? 'line-through text-red-500' : 'text-main'}`}>
                          {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                        </span>
                        <span className="text-[10px] text-muted block">Qty: {item.quantity || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address & Bill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-base p-4 rounded-2xl border border-line flex flex-col gap-1 text-xs">
                <span className="text-[10px] font-extrabold uppercase text-muted tracking-wider">Delivery Destination</span>
                <span className="font-bold text-main">{order.customerName || order.user?.name || 'Customer'}</span>
                <p className="text-muted leading-relaxed font-medium">
                  {order.customerLocation?.formattedAddress || order.address?.street || 'Delivery Address'}
                </p>
              </div>

              <div className="bg-base p-4 rounded-2xl border border-line flex flex-col gap-2.5 text-xs">
                <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider border-b border-line pb-1">
                  DELIVERY & OTHER CHARGES
                </span>
                
                {(() => {
                  const db = getDeliveryFeeBreakdown(order);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-muted font-medium">
                        <span>Items Subtotal</span>
                        <span className="font-bold text-main">{formatCurrency(order.subtotal)}</span>
                      </div>

                      {db.lines.map(line => (
                        <div key={line.sequence} className="flex justify-between text-muted text-[11px]">
                          <span className="truncate pr-1">{line.label}</span>
                          <span className="font-bold text-main shrink-0">+{formatCurrency(line.amount)}</span>
                        </div>
                      ))}

                      {db.rainFee > 0 && (
                        <div className="flex justify-between text-muted text-[11px]">
                          <span>🌧️ Rain Surcharge</span>
                          <span className="font-bold text-main">+{formatCurrency(db.rainFee)}</span>
                        </div>
                      )}

                      {db.surgeFee > 0 && (
                        <div className="flex justify-between text-muted text-[11px]">
                          <span>⚡ Demand / Surge Fee</span>
                          <span className="font-bold text-main">+{formatCurrency(db.surgeFee)}</span>
                        </div>
                      )}

                      <div className="border-t border-line/60 pt-1 flex justify-between text-muted font-bold text-xs">
                        <span>Total Delivery Fees</span>
                        <span className="font-black text-main">{formatCurrency(db.totalDeliveryFees)}</span>
                      </div>

                      {db.platformFee > 0 && (
                        <div className="flex justify-between text-muted text-xs">
                          <span>Platform Fee</span>
                          <span className="font-bold text-main">+{formatCurrency(db.platformFee)}</span>
                        </div>
                      )}

                      {db.discount > 0 && (
                        <div className="flex justify-between text-green-600 font-bold text-xs">
                          <span>Coupon Discount</span>
                          <span>-{formatCurrency(db.discount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black text-sm text-main border-t border-line pt-2 mt-0.5">
                        <span>TOTAL PAYABLE</span>
                        <span className="text-primary">{formatCurrency(db.totalPayable)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Right 2 cols: Agent & Receipt info */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Delivery Instructions */}
          {order.instruction && (
            <div className="bg-violet-50/50 border border-violet-100 text-violet-900 rounded-3xl p-5 flex gap-2.5 text-xs leading-relaxed font-medium">
              <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-main">Your Delivery Instructions</h5>
                <p className="mt-0.5 text-gray-655 font-semibold">{order.instruction}</p>
              </div>
            </div>
          )}

          {/* Delivery Rider profile card */}
          {order.deliveryAgent && (
            <div className={`rounded-3xl p-5 border shadow-2xs flex flex-col gap-4 ${
              order.orderType === 'ride' ? 'bg-yellow-500/[0.02] border-yellow-200' : 'bg-surface border-line'
            }`}>
              <h3 className="font-display font-extrabold text-sm text-gray-855 border-b border-line pb-2">
                {order.orderType === 'ride' ? 'Your Ride Captain' : 'Your Delivery Valet'}
              </h3>

              <div className="flex items-center gap-3">
                {/* Rider Photo avatar */}
                {order.deliveryAgent.profileImage ? (
                  <img
                    src={getImageUrl(order.deliveryAgent.profileImage, 'avatar')}
                    alt={order.deliveryAgent.name}
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-12 h-12 rounded-2xl object-cover border border-line"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base border ${
                    order.orderType === 'ride' 
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-250' 
                      : 'bg-violet-50 text-primary border-violet-100'
                  }`}>
                    {order.deliveryAgent.name[0]}
                  </div>
                )}
                <div className="flex flex-col gap-0.5 flex-grow">
                  <h4 className="text-sm font-bold text-gray-755">{order.deliveryAgent.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-muted font-bold">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span>{formatRating(order.deliveryAgent.rating, { fallback: '5.0' })} Rating</span>
                  </div>
                </div>
              </div>

              {/* Call agent buttons — only show when delivery is still in progress */}
              <div className="flex flex-col gap-2">
                {!['Delivered', 'Completed'].includes(order.status) && (
                <div className="flex gap-2">
                  <a 
                    href={`tel:${order.deliveryAgent.phone}`}
                    className={`flex-grow text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      order.orderType === 'ride' 
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
                        : 'bg-primary/10 hover:bg-primary/15 text-primary'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {order.deliveryAgent.name.split(' ')[0]}</span>
                  </a>
                </div>
                )}

                {['Delivered', 'Completed'].includes(order.status) && (
                  order.riderReview ? (
                    <div className="bg-violet-50/40 border border-violet-100/35 rounded-2xl p-3 text-[11px] font-semibold text-main flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Rider Rating:</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= order.riderReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      {order.riderReview.tipAmount > 0 && (
                        <div className="flex justify-between items-center border-t border-violet-100/35 pt-1.5 mt-0.5">
                          <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Tipped:</span>
                          <span className="font-extrabold text-primary">₹{order.riderReview.tipAmount}</span>
                        </div>
                      )}
                      {order.riderReview.comment && (
                        <div className="border-t border-violet-100/35 pt-1.5 mt-0.5">
                          <span className="font-bold text-muted uppercase tracking-wider text-[9px] block mb-0.5">Comment:</span>
                          <p className="italic text-muted">"{order.riderReview.comment}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsRiderModalOpen(true)}
                      className={`w-full text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-xs ${
                        order.orderType === 'ride'
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

          {/* Live Chat Panel (ACTIVE ORDERS ONLY) */}
          {order.deliveryAgent && !['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status) && (
            <div className="rounded-3xl p-5 border shadow-2xs flex flex-col gap-3 bg-surface border-line">
              <h3 className="font-display font-extrabold text-sm text-main border-b border-line pb-2 flex items-center justify-between">
                <span>Live Chat with Rider</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </h3>

              {/* Scrollable messages container */}
              <div ref={chatContainerRef} className="h-64 overflow-y-auto flex flex-col gap-3.5 pr-1.5 scrollbar-thin">
                {order.messages && order.messages.length > 0 ? (
                  order.messages.map((msg, idx) => {
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
            order.orderType === 'ride' 
              ? 'bg-yellow-50/40 border border-yellow-200/50 text-yellow-900' 
              : 'bg-sky-50/50 border border-sky-100 text-sky-800'
          }`}>
            <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${order.orderType === 'ride' ? 'text-yellow-700' : 'text-sky-700'}`} />
            <div>
              <h5 className="font-bold text-xs">
                {order.orderType === 'ride' ? 'Ride Shield Protection' : 'Assurance Protection'}
              </h5>
              <p className="text-[9px] mt-0.5 leading-relaxed font-semibold">
                {order.orderType === 'ride' 
                  ? 'Your ride and packages are protected with instant insurance cover. Call customer care for ride safety guidelines.'
                  : 'Your food is covered under our premium safety policy. Call support at any point for dispatch details.'
                }
              </p>
            </div>
          </div>

        </div>
      </div>

      <RiderFeedbackModal
        isOpen={isRiderModalOpen}
        onClose={() => setIsRiderModalOpen(false)}
        orderId={order._id}
        deliveryAgent={order.deliveryAgent}
        token={token}
        isRide={order.orderType === 'ride'}
        onFeedbackSubmit={(updatedOrder) => setOrder(updatedOrder)}
        onProceedToRestaurant={
          order.orderType !== 'ride' && getContributingFoodRestaurants(order).some(rest => {
            const isRated = Array.isArray(order.restaurantReviews)
              ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
              : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)));
            return !isRated;
          }) ? () => {
            const firstUnrated = getContributingFoodRestaurants(order).find(rest => {
              const isRated = Array.isArray(order.restaurantReviews)
                ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)));
              return !isRated;
            });
            if (firstUnrated) {
              setSelectedRestaurantForReview(firstUnrated);
              setIsRestaurantModalOpen(true);
            }
          } : (
            order.orderType !== 'ride' && getContributingStoreSources(order).some(src => {
              const isRated = Array.isArray(order.storeReviews) && order.storeReviews.some(r =>
                String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
              );
              return !isRated;
            }) ? () => {
              const firstUnratedStore = getContributingStoreSources(order).find(src => {
                const isRated = Array.isArray(order.storeReviews) && order.storeReviews.some(r =>
                  String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                );
                return !isRated;
              });
              if (firstUnratedStore) {
                setSelectedStoreForReview(firstUnratedStore);
                setIsStoreModalOpen(true);
              }
            } : null
          )
        }
      />

      <RestaurantFeedbackModal
        isOpen={isRestaurantModalOpen}
        onClose={() => {
          setIsRestaurantModalOpen(false);
          setSelectedRestaurantForReview(null);
        }}
        order={order}
        restaurant={selectedRestaurantForReview}
        token={token}
        onFeedbackSubmit={(updatedOrder) => {
          setOrder(updatedOrder);
        }}
        onSkip={() => {
          setIsRestaurantModalOpen(false);
          setSelectedRestaurantForReview(null);
        }}
      />

      <StoreFeedbackModal
        isOpen={isStoreModalOpen}
        onClose={() => {
          setIsStoreModalOpen(false);
          setSelectedStoreForReview(null);
        }}
        order={order}
        source={selectedStoreForReview}
        token={token}
        onFeedbackSubmit={(updatedOrder) => {
          setOrder(updatedOrder);
        }}
        onSkip={() => {
          setIsStoreModalOpen(false);
          setSelectedStoreForReview(null);
        }}
      />

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        order={order}
        token={token}
        onCancelSuccess={(updatedOrder) => {
          setOrder(updatedOrder);
          fetchOrderDetails();
        }}
      />
    </div>
  );
}
