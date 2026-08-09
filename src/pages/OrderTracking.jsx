import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Star, Shield, ArrowLeft, RefreshCw, Calendar, ShoppingBag, Check, Send, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import InteractiveMap from '../components/InteractiveMap';
import { formatAppDateOnly, formatAppTimeOnly } from '../utils/dateUtils';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import { playStatusChangeSound, playCaptainAssignedSound, playDeliveredSound } from '../utils/audio';
import { io } from 'socket.io-client';

export default function OrderTracking() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [siblingOrders, setSiblingOrders] = useState([]);
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(30); // minutes

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
          if (data.status === 'Delivered' && !data.riderReview && !autoOpenTriggered.current) {
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
          
          // Fetch Restaurant details for address geocoding
          if (data.restaurantId && !restaurantAddress) {
            try {
              const restRes = await fetch(`${API_BASE}/restaurants/${data.restaurantId}`);
              if (restRes.ok) {
                const restData = await restRes.json();
                setRestaurantAddress(restData.address);
              }
            } catch (err) {
              console.error('Error fetching restaurant details for map:', err);
            }
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
    };

    fetchOrderDetails();
    
    // Poll every 5 seconds for real-time order status updates
    const pollInterval = setInterval(fetchOrderDetails, 5000);

    return () => clearInterval(pollInterval);
  }, [id, token, restaurantAddress]);

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

    socket.on('statusUpdated', ({ status, order: updatedOrder }) => {
      console.log('[TRACKING SOCKET] Status update received:', status);
      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        setOrder(prev => prev ? { ...prev, status } : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, token]);

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

  // Active status timeline markers
  const timelineSteps = order.orderType === 'ride' ? [
    { label: 'Booking Placed', state: 'Placed', desc: 'Finding nearest Ride Captain' },
    { label: 'Captain Assigned', state: 'Confirmed', desc: 'Captain accepted your ride request' },
    { label: 'Captain at Pickup', state: 'Preparing', desc: 'Captain is waiting at pickup spot' },
    { label: 'Ride in Progress', state: 'Out for Delivery', desc: 'Captain is en route to destination' },
    { label: 'Completed', state: 'Delivered', desc: 'Reached destination successfully!' }
  ] : [
    { label: 'Order Placed', state: 'Placed', desc: 'Awaiting restaurant approval' },
    { label: 'Confirmed', state: 'Confirmed', desc: 'Accepted by the kitchen' },
    { label: 'Preparing', state: 'Preparing', desc: 'Dishes are being cooked' },
    { label: 'Out for Delivery', state: 'Out for Delivery', desc: 'Rider is driving to you' },
    { label: 'Delivered', state: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  const getStepIndex = (currentStatus) => {
    return timelineSteps.findIndex(step => step.state === currentStatus);
  };

  const activeIndex = getStepIndex(order.status);
  const allOrdersInSession = [order, ...siblingOrders].sort((a, b) => String(a._id).localeCompare(String(b._id)));

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
          {order.status === 'Delivered' ? (
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
              order.status === 'Delivered' 
                ? 'bg-green-500' 
                : order.orderType === 'ride' 
                ? 'bg-yellow-500 animate-ping' 
                : 'bg-primary animate-ping'
            }`} />
            <span>Active Status: <strong className="text-main font-bold">{order.status === 'Preparing' && order.orderType === 'ride' ? 'Captain at Pickup' : order.status}</strong></span>
          </p>
        </div>

        {/* Re-poll indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted font-semibold bg-base px-3 py-1.5 rounded-xl border border-line">
          <RefreshCw className={`w-3.5 h-3.5 animate-spin ${order.orderType === 'ride' ? 'text-yellow-600' : 'text-primary'}`} />
          <span>Polling Live Feed</span>
        </div>
      </div>

      {/* Sibling Orders Selector */}
      {allOrdersInSession.length > 1 && (
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
                      : sessionOrder.status === 'Delivered'
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
      <InteractiveMap 
        status={order.status} 
        restaurantAddress={order.orderType === 'ride' 
          ? order.restaurantLocation?.formattedAddress || `${order.pickupAddress?.street}, ${order.pickupAddress?.city}` 
          : order.restaurantLocation?.formattedAddress || restaurantAddress
        }
        restaurantLat={order.restaurantLocation?.lat}
        restaurantLng={order.restaurantLocation?.lng}
        customerAddress={order.customerLocation?.formattedAddress || `${order.address?.street}, ${order.address?.city}`}
        customerLat={order.customerLocation?.lat}
        customerLng={order.customerLocation?.lng}
        deliveryMethod={order.orderType === 'ride' ? 'Ride' : 'Standard'}
        orderId={order._id}
      />

      {/* Review & Suggestion Box */}
      {order.status === 'Delivered' && (
        <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4 animate-scale-up">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="text-xl">⭐️</span>
            <div>
              <h3 className="font-display font-extrabold text-base text-main">
                {order.orderType === 'ride' ? 'Rate Your Ride Experience' : 'Rate Your Order & Delivery'}
              </h3>
              <p className="text-xs text-muted font-semibold mt-0.5">Your feedback helps us improve our service</p>
            </div>
          </div>

          {order.review ? (
            <div className="flex flex-col gap-3.5 bg-green-50/40 border border-green-100 rounded-2xl p-5 text-green-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Check className="w-5 h-5 text-green-600 bg-green-100 p-0.5 rounded-full" />
                  <span className="text-xs font-black uppercase text-green-700">Thank you for your feedback!</span>
                </div>
                <span className="text-[10px] text-muted font-bold">
                  {formatAppDateOnly(order.review.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= order.review.rating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              {order.review.comment && (
                <div className="bg-surface border border-green-100/30 p-3.5 rounded-xl text-xs font-semibold text-main leading-relaxed">
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-gray-450 mb-1">Your Suggestions</p>
                  "{order.review.comment}"
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-0.5">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cursor-pointer transition-transform active:scale-95 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400 scale-105'
                            : 'text-gray-300 hover:text-yellow-300'
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
                    order.orderType === 'ride' 
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Left 3 cols: Status Timeline */}
        <div className="md:col-span-3 bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-5">
          <h3 className="font-display font-extrabold text-base text-main border-b border-line pb-2">
            Delivery Timeline
          </h3>

          <div className="flex flex-col gap-6 relative pl-6 border-l-2 border-line">
            {timelineSteps.map((step, idx) => {
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
                      ? order.orderType === 'ride' ? 'text-yellow-600' : 'text-primary' 
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
                    src={order.deliveryAgent.profileImage} 
                    alt={order.deliveryAgent.name} 
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
                    <span>{order.deliveryAgent.rating.toFixed(1)} Rating</span>
                  </div>
                </div>
              </div>

              {/* Call agent buttons — only show when delivery is still in progress */}
              <div className="flex flex-col gap-2">
                {order.status !== 'Delivered' && (
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

                {order.status === 'Delivered' && (
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

          {/* Live Chat Panel */}
          {order.deliveryAgent && (
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
        onFeedbackSubmit={(updatedOrder) => setOrder(updatedOrder)}
      />
    </div>
  );
}
