import React, { useEffect, useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  RotateCcw, 
  Star, 
  Phone, 
  Store, 
  User, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Car,
  Package,
  Heart,
  FileText,
  ShieldAlert,
  ChevronDown,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { Link } from 'react-router-dom';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import { 
  getContributingFoodRestaurants, 
  getContributingStoreSources, 
  getCustomerCancellationEligibility, 
  getOrderFinancialBreakdown, 
  getDeliveryFeeBreakdown, 
  getOrderPlacedAt, 
  getOrderDeliveredAt, 
  getOrderCancelledAt, 
  getOrderSourceDisplayNames, 
  buildSourceObjMap, 
  formatCurrency, 
  formatDistance, 
  formatRating 
} from '../utils/orderUtils';
import CancelOrderModal from './CancelOrderModal';

export default function OrderDetailsModal({
  isOpen,
  onClose,
  order: initialOrder,
  role = 'customer', // 'customer' | 'restaurant' | 'rider' | 'admin' | 'store'
  token,
  onReorder,
  onRateRider,
  onRateOrder,
  onRateRestaurant,
  onRateStore,
  onOrderUpdated,
  onAssignRider,
  onMarkHandled
}) {
  const [order, setOrder] = useState(initialOrder);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeliveryBreakdownExpanded, setIsDeliveryBreakdownExpanded] = useState(false);

  const financials = getOrderFinancialBreakdown(order);
  const deliveryBreakdown = getDeliveryFeeBreakdown(order);

  // Sync initial order state whenever modal opens or initialOrder changes
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder, isOpen]);

  // Silently refresh fresh order details from backend if order ID and token are available
  useEffect(() => {
    if (!isOpen || !initialOrder?._id || !token) return;

    let isMounted = true;
    const fetchFreshDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${initialOrder._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const freshData = await res.json();
          if (isMounted) {
            setOrder((prev) => ({ ...prev, ...freshData }));
          }
        }
      } catch (err) {
        // Fall back to initial order seamlessly
      }
    };

    fetchFreshDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialOrder?._id, token]);

  if (!isOpen || !order) return null;

  const isRide = order.orderType === 'ride';
  const isDelivered = ['Delivered', 'Completed'].includes(order.status);
  const isCancelled = ['Cancelled', 'Rejected'].includes(order.status);
  const isRejected = order.status === 'Rejected';

  // Format Order ID for display
  const shortId = (order._id ? String(order._id).slice(-8) : '00000000').toUpperCase();

  // Helper to determine order type badge
  const getOrderTypeDisplay = () => {
    if (isRide) {
      return order.vehicleType === 'auto' ? 'Auto Ride' : 'Bike Ride';
    }
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return 'Food Order';

    const categories = new Set(items.map(i => (i.category || '').toLowerCase()));
    const hasFood = items.some(i => !i.itemModel || i.itemModel === 'MenuItem' || (!i.supplierId && (i.service === 'food' || !i.service)));
    const hasCatalog = items.some(i => i.itemModel === 'CatalogItem' || Boolean(i.supplierId) || (i.service && i.service !== 'food'));

    if (hasFood && hasCatalog) return 'Combined Delivery';
    if (hasCatalog) {
      if ([...categories].some(c => c.includes('grocery'))) return 'Grocery';
      if ([...categories].some(c => c.includes('veg') || c.includes('fruit'))) return 'Veg & Fruits';
      if ([...categories].some(c => c.includes('meat'))) return 'Meat';
      if ([...categories].some(c => c.includes('bakery') || c.includes('beverage'))) return 'Bakery & Beverages';
      return 'Store Order';
    }
    return 'Food Order';
  };

  // Format Masked Payment Method
  const getPaymentMethodDisplay = () => {
    const rawMethod = order.paymentDetails?.method || 'COD';
    if (rawMethod === 'COD') return 'Cash on Delivery';
    if (rawMethod === 'UPI') return 'UPI •••• 3567';
    if (rawMethod === 'Card') return 'Card •••• 4242';
    return rawMethod;
  };

  // Pure Safe Source Lookup Map (Pure function, 0 React hooks - guarantees 0 hook order violations)
  const sourceObjMap = buildSourceObjMap(order);

  // Resolve distinct pickup sources
  const getDistinctSources = () => {
    const sourcesInfo = getOrderSourceDisplayNames(order);
    return sourcesInfo.sources.length > 0 ? sourcesInfo.sources : [order?.restaurant?.name || 'Jinkzo Partner'];
  };

  const distinctSources = getDistinctSources();

  // Rider snapshot safety
  const hasRider = Boolean(
    order.deliveryAgent && 
    order.deliveryAgent.name && 
    !isCancelled
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-scale-up relative border border-line overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              {isRide ? <Car className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-base text-main">
                  Order Details
                </h3>
                <span className="font-mono text-xs font-bold text-muted bg-base px-2 py-0.5 rounded-md border border-line">
                  #{shortId}
                </span>
              </div>
              <p className="text-[11px] text-muted font-medium mt-0.5">
                {role === 'restaurant' 
                  ? 'Restaurant Order Summary' 
                  : role === 'rider' 
                  ? 'Rider Run Information' 
                  : role === 'admin' 
                  ? 'Master System Record' 
                  : 'Complete Purchase Receipt'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-muted hover:text-main p-2 hover:bg-base rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE CONTENT BODY ── */}
        <div className="overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-main text-xs scrollbar-thin">

          {/* 1. ORDER SUMMARY BANNER / HEADER CARD */}
          <div className="bg-base border border-line rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isDelivered
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                    : isCancelled
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-violet-100 text-primary dark:bg-violet-950/40 dark:text-primary-light'
                }`}>
                  {order.status}
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface border border-line text-muted">
                  {getOrderTypeDisplay()}
                </span>

                {order.parentOrderId && (
                  <span className="text-[10px] font-mono text-muted bg-surface px-2 py-0.5 rounded border border-line">
                    Parent: #{String(order.parentOrderId).slice(-8).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Order Timestamps */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted font-medium mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Placed: <strong className="text-main font-semibold">{formatAppDate(getOrderPlacedAt(order))}</strong>
                </span>

                {isDelivered && (
                  <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Delivered: {getOrderDeliveredAt(order) ? formatAppDate(getOrderDeliveredAt(order)) : 'Delivery time unavailable'}
                  </span>
                )}

                {isCancelled && (
                  <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelled: {getOrderCancelledAt(order) ? formatAppDate(getOrderCancelledAt(order)) : 'Time unavailable'}
                  </span>
                )}
              </div>
            </div>

            {/* Total Paid / Cost Pill */}
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
              <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider">
                {role === 'rider' ? 'Rider Earning' : role === 'restaurant' ? 'Total Payable to Restaurant' : 'Total Paid'}
              </span>
              <span className="font-display font-black text-lg sm:text-xl text-primary">
                {role === 'rider' 
                  ? formatCurrency(isRide ? (order.total ?? order.fare) : (order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? ((order.deliveryFee || 40) + 20)))
                  : role === 'restaurant'
                  ? (() => {
                      const rFin = financials.restaurant?.byRestaurant?.find(r => (!order.restaurantId || String(r.restaurantId) === String(order.restaurantId)));
                      const displayPayable = rFin ? rFin.restaurantPayable : (financials.restaurant?.restaurantPayable > 0 ? financials.restaurant.restaurantPayable : (order.subtotal ?? order.total));
                      return formatCurrency(displayPayable);
                    })()
                  : formatCurrency(order.total ?? order.subtotal)
                }
              </span>
              <span className="text-[10px] text-muted font-medium mt-0.5">
                {getPaymentMethodDisplay()}
              </span>
            </div>
          </div>

          {/* RIDER ASSIGNMENT / REJECTION SECTION */}
          {(order.hasRiderRejection || (Array.isArray(order.riderRejections) && order.riderRejections.length > 0)) && (() => {
            const latestRejection = (order.riderRejections || []).slice().reverse().find(r => r.status === 'Pending_Admin_Review') || (order.riderRejections || []).slice().reverse()[0];
            if (!latestRejection) return null;
            const isPending = latestRejection.status === 'Pending_Admin_Review';

            return (
              <div className="bg-red-50/80 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/60 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-red-200/60 pb-2.5 flex-wrap gap-2">
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className={`w-4 h-4 ${isPending ? 'text-red-600 animate-pulse' : 'text-gray-500'}`} />
                    RIDER ASSIGNMENT / REJECTION
                  </h4>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    isPending
                      ? 'bg-red-600 text-white animate-pulse'
                      : latestRejection.status === 'Reassigned'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isPending ? 'Admin Action Required' : latestRejection.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-muted">Rejected Rider:</span>
                    <p className="font-bold text-main">{latestRejection.riderName || 'Rider'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-muted">Rejected At:</span>
                    <p className="font-bold text-main">{formatAppDateTime(latestRejection.rejectedAt)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-muted">Reason:</span>
                    <p className="font-bold text-red-700">{latestRejection.reasonText || latestRejection.reasonCode}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-muted">Dispatch Status:</span>
                    <p className="font-bold text-main">{isPending ? 'Admin Action Required' : latestRejection.status}</p>
                  </div>
                </div>

                {latestRejection.note && (
                  <div className="bg-surface/80 p-2.5 rounded-xl border border-red-200/50 text-xs">
                    <span className="text-[10px] uppercase font-extrabold text-muted block">Additional Note:</span>
                    <p className="italic text-main mt-0.5">"{latestRejection.note}"</p>
                  </div>
                )}

                {role === 'admin' && isPending && (
                  <div className="flex items-center gap-2 pt-1 border-t border-red-200/60 flex-wrap">
                    {onAssignRider && (
                      <button
                        type="button"
                        onClick={() => onAssignRider(order)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Rider</span>
                      </button>
                    )}
                    {onMarkHandled && (
                      <button
                        type="button"
                        onClick={() => onMarkHandled(order)}
                        className="px-4 py-2 bg-base hover:bg-surface border border-line-strong text-main text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Mark Handled
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Cancellation / Rejection banner if applicable */}
          {isCancelled && order.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 flex gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs text-red-700 dark:text-red-300">
                  {order.status === 'Cancelled' ? 'Order Cancelled' : 'Order Rejected'}
                </h5>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                  Reason: {order.rejectionReason}
                </p>
              </div>
            </div>
          )}

          {/* 2. SOURCES PILL (MULTI-STORE vs SINGLE RESTAURANT) */}
          {distinctSources.length > 0 && !isRide && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                {distinctSources.length > 1 ? `Multiple Pickup Sources (${distinctSources.length} Outlets)` : 'Pickup Source'}
              </span>
              <div className="flex flex-wrap gap-2">
                {distinctSources.map((source, sIdx) => {
                  const isSupplier = Boolean(sourceObjMap[source]?.isSupplier);
                  return (
                    <span 
                      key={sIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-base border border-line text-main"
                    >
                      <span>🏪 {source}</span>
                      {order.restaurant?.rating > 0 && distinctSources.length === 1 && (
                        <span className="text-[10px] text-yellow-500 font-bold ml-1">
                          (★ {formatRating(order.restaurant.rating)})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DELIVERED BY RIDER (Customer, Restaurant, Admin views) */}
          {hasRider && (
            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {order.deliveryAgent.profileImage ? (
                  <img
                    src={getImageUrl(order.deliveryAgent.profileImage, 'avatar')}
                    alt={order.deliveryAgent.name}
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-12 h-12 rounded-2xl object-cover border border-line shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-primary font-black text-lg flex items-center justify-center border border-violet-200 shrink-0">
                    {order.deliveryAgent.name ? order.deliveryAgent.name[0].toUpperCase() : 'R'}
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                    {isRide ? 'Delivered By Ride Captain' : 'Delivered By Rider'}
                  </span>
                  <h4 className="font-bold text-sm text-main">
                    {order.deliveryAgent.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted font-medium">
                    {order.deliveryAgent.vehicleNumber && (
                      <span className="bg-base px-2 py-0.5 rounded border border-line font-mono font-bold text-main">
                        Vehicle: {order.deliveryAgent.vehicleNumber}
                      </span>
                    )}
                    {order.deliveryAgent.rating != null && (
                      <span className="flex items-center text-yellow-500 font-bold">
                        Average: ★ {formatRating(order.deliveryAgent.rating)}
                      </span>
                    )}
                    {/* Authorized roles only can see phone */}
                    {(role === 'admin' || role === 'customer') && order.deliveryAgent.phone && (
                      <span className="flex items-center gap-0.5 text-muted">
                        <Phone className="w-3 h-3" /> {order.deliveryAgent.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rider tip/rating pill if submitted by customer */}
              {order.riderReview && Number(order.riderReview.rating) > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-1.5 flex flex-col sm:items-end">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 dark:text-green-400">
                    <span>Rated {order.riderReview.rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  {order.riderReview.tipAmount > 0 && (
                    <span className="text-[10px] text-green-600 dark:text-green-300 font-extrabold">
                      Tipped ₹{order.riderReview.tipAmount}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3b. YOUR RATINGS (Delivery Rider & Restaurants) */}
          {(role === 'customer' || role === 'admin') && isDelivered && (
            <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted flex items-center gap-1.5 border-b border-line pb-2">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                Your Ratings & Feedback
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rider Rating Card */}
                {hasRider && (
                  <div className="bg-base border border-line rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-muted tracking-wider">
                        {isRide ? 'Ride Captain' : 'Delivery Rider'}
                      </span>
                      <span className="font-bold text-main">{order.deliveryAgent.name}</span>
                    </div>

                    {order.riderReview && Number(order.riderReview.rating) > 0 ? (
                      <div className="bg-green-50/60 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-green-800 dark:text-green-300">Your Rating:</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= order.riderReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {order.riderReview.comment && (
                          <p className="text-muted italic text-[10px]">"{order.riderReview.comment}"</p>
                        )}
                        {order.riderReview.tipAmount > 0 && (
                          <span className="text-[10px] font-bold text-green-700 dark:text-green-400">
                            Tip: ₹{order.riderReview.tipAmount}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Feedback submitted
                        </span>
                      </div>
                    ) : (
                      role === 'customer' && onRateRider && (
                        <button
                          onClick={() => {
                            onClose();
                            onRateRider(order);
                          }}
                          className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{isRide ? 'Rate Ride Captain' : 'Rate & Tip Rider'}</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Restaurant Ratings Card */}
                {!isRide && getContributingFoodRestaurants(order).length > 0 && (
                  <div className="flex flex-col gap-2">
                    {getContributingFoodRestaurants(order).map((rest) => {
                      const restReview = Array.isArray(order.restaurantReviews)
                        ? order.restaurantReviews.find((r) => String(r.restaurantId) === String(rest.id))
                        : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)) ? order.review : null);

                      return (
                        <div key={rest.id} className="bg-base border border-line rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-muted tracking-wider">
                              Restaurant Food
                            </span>
                            <span className="font-bold text-main">{rest.name}</span>
                          </div>

                          {restReview && Number(restReview.rating) > 0 ? (
                            <div className="bg-green-50/60 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-green-800 dark:text-green-300">Your Rating:</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3 h-3 ${
                                        s <= restReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {restReview.comment && (
                                <p className="text-muted italic text-[10px]">"{restReview.comment}"</p>
                              )}
                              <span className="text-[9px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Feedback submitted
                              </span>
                            </div>
                          ) : (
                            role === 'customer' && onRateRestaurant && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onRateRestaurant(order, rest);
                                }}
                                className="w-full bg-violet-50 hover:bg-violet-100 text-primary border border-violet-200 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>Rate Restaurant</span>
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Store / Supplier Ratings Card (Grocery, Meat, Veg & Fruits, Bakery) */}
                {!isRide && getContributingStoreSources(order).length > 0 && (
                  <div className="flex flex-col gap-2">
                    {getContributingStoreSources(order).map((src) => {
                      const storeReview = Array.isArray(order.storeReviews)
                        ? order.storeReviews.find((r) => String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType)
                        : null;

                      return (
                        <div key={`${src.sourceId}_${src.serviceType}`} className="bg-base border border-line rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-muted tracking-wider">
                              {src.serviceLabel}
                            </span>
                            <span className="font-bold text-main">{src.sourceName}</span>
                          </div>

                          {storeReview && Number(storeReview.rating) > 0 ? (
                            <div className="bg-green-50/60 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-green-800 dark:text-green-300">Your Rating:</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3 h-3 ${
                                        s <= storeReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {storeReview.comment && (
                                <p className="text-muted italic text-[10px]">"{storeReview.comment}"</p>
                              )}
                              <span className="text-[9px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Feedback submitted
                              </span>
                            </div>
                          ) : (
                            role === 'customer' && onRateStore && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onRateStore(order, src);
                                }}
                                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>Rate {src.serviceLabel}</span>
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Restaurant Role Specific Review View */}
          {role === 'restaurant' && order.review && Number(order.review.rating) > 0 && (
            <div className="bg-green-50/40 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-green-800 dark:text-green-300">
                  Customer Review for Your Restaurant
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= order.review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {order.review.comment && (
                <p className="text-main italic bg-surface p-2 rounded-lg border border-line mt-1">
                  "{order.review.comment}"
                </p>
              )}
            </div>
          )}

          {/* 4. RIDE ORDER SPECIFIC VIEW (NO FOOD ITEMS) */}
          {isRide && (
            <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
              <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-muted border-b border-line pb-2">
                Ride Route & Fare Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 bg-base p-3 rounded-xl border border-line">
                  <span className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pickup Location
                  </span>
                  <p className="text-xs font-semibold text-main leading-relaxed">
                    {order.pickupLocation?.formattedAddress || order.pickupAddress?.street || 'Pickup Point'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 bg-base p-3 rounded-xl border border-line">
                  <span className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Destination / Drop
                  </span>
                  <p className="text-xs font-semibold text-main leading-relaxed">
                    {order.dropLocation?.formattedAddress || order.address?.street || 'Destination Point'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-base p-2.5 rounded-xl border border-line">
                  <span className="text-[9px] uppercase font-bold text-muted block">Distance</span>
                  <span className="font-black text-sm text-main">{formatDistance(order.distance, { fallback: '2.00 km' })}</span>
                </div>
                <div className="bg-base p-2.5 rounded-xl border border-line">
                  <span className="text-[9px] uppercase font-bold text-muted block">Base Fare</span>
                  <span className="font-black text-sm text-main">{formatCurrency(order.pricing?.baseFare ?? order.subtotal)}</span>
                </div>
                <div className="bg-base p-2.5 rounded-xl border border-line">
                  <span className="text-[9px] uppercase font-bold text-muted block">Surcharges</span>
                  <span className="font-black text-sm text-main">{formatCurrency((Number(order.pricing?.rainSurcharge) || 0) + (Number(order.pricing?.otherSurcharges) || 0))}</span>
                </div>
                <div className="bg-base p-2.5 rounded-xl border border-line">
                  <span className="text-[9px] uppercase font-bold text-muted block">Total Paid</span>
                  <span className="font-black text-sm text-primary">{formatCurrency(order.total ?? order.fare)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. FOOD / STORE / COMBINED ITEMS LIST GROUPED BY SOURCE */}
          {!isRide && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>Items & Source Breakdown ({(() => {
                    const displayed = role === 'restaurant'
                      ? (Array.isArray(order.items) ? order.items.filter(i => !(i.itemModel === 'CatalogItem' || Boolean(i.supplierId)) && (!order.restaurantId || !i.restaurantId || String(i.restaurantId) === String(order.restaurantId))) : [])
                      : (order.items || []);
                    return displayed.length;
                  })()})</span>
                </h4>
                {role === 'restaurant' && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Restaurant Items Only
                  </span>
                )}
              </div>

              {Array.isArray(order.items) && order.items.length > 0 ? (
                (() => {
                  const relevantItems = role === 'restaurant'
                    ? order.items.filter(i => !(i.itemModel === 'CatalogItem' || Boolean(i.supplierId)) && (!order.restaurantId || !i.restaurantId || String(i.restaurantId) === String(order.restaurantId)))
                    : order.items;

                  // Group items by fulfillment source
                  const groupsMap = new Map();

                  relevantItems.forEach((item) => {
                    let sourceName = item.sourceName || item.supplierName || item.restaurantName;
                    if (!sourceName) {
                      if (item.service === 'food' || (!item.service && !item.supplierId)) {
                        sourceName = order.restaurant?.name || 'Restaurant Partner';
                      } else {
                        sourceName = 'Store Partner';
                      }
                    }

                    const service = item.service || (item.itemModel === 'CatalogItem' ? 'store' : 'food');
                    const groupKey = `${sourceName}___${service}`;

                    if (!groupsMap.has(groupKey)) {
                      groupsMap.set(groupKey, {
                        sourceName,
                        service,
                        items: [],
                        subtotal: 0
                      });
                    }

                    const group = groupsMap.get(groupKey);
                    group.items.push(item);

                    if (!item.isCancelled) {
                      const price = parseFloat(item.price) || 0;
                      const qty = parseInt(item.quantity, 10) || 1;
                      group.subtotal += price * qty;
                    }
                  });

                  const sourceGroups = Array.from(groupsMap.values());

                  return (
                    <div className="flex flex-col gap-3">
                      {sourceGroups.map((group, gIdx) => {
                        const getCategoryBadgeStyle = (srv) => {
                          switch (srv) {
                            case 'food': return 'bg-orange-100 text-orange-800 border-orange-200';
                            case 'grocery': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                            case 'meat': return 'bg-red-100 text-red-800 border-red-200';
                            case 'bakery':
                            case 'bakery_beverages': return 'bg-pink-100 text-pink-800 border-pink-200';
                            case 'veg_fruits': return 'bg-green-100 text-green-800 border-green-200';
                            default: return 'bg-violet-100 text-primary border-violet-200';
                          }
                        };

                        return (
                          <div key={gIdx} className="bg-surface border border-line rounded-2xl overflow-hidden shadow-2xs flex flex-col">
                            {/* Source Card Header */}
                            <div className="px-4 py-2.5 bg-base/60 border-b border-line flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">🏪</span>
                                <h4 className="font-bold text-xs sm:text-sm text-main truncate">{group.sourceName}</h4>
                              </div>
                              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${getCategoryBadgeStyle(group.service)}`}>
                                {group.service.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Source Items */}
                            <div className="divide-y divide-line p-3 sm:p-4 flex flex-col gap-2">
                              {group.items.map((item, iIdx) => {
                                const unitPrice = parseFloat(item.price) || 0;
                                const qty = parseInt(item.quantity, 10) || 1;
                                const itemTotal = unitPrice * qty;

                                return (
                                  <div key={iIdx} className="flex items-center justify-between py-1.5 text-xs gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {item.isVeg !== undefined && (
                                        <span className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                                          item.isVeg ? 'border-green-600' : 'border-red-600'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                                        </span>
                                      )}
                                      <span className={`font-semibold truncate ${item.isCancelled ? 'line-through text-red-500' : 'text-main'}`}>
                                        {item.name}
                                      </span>
                                      {item.isCancelled && (
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-red-50 text-red-600 border border-red-200 rounded shrink-0">
                                          Cancelled
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-right">
                                      <span className="text-[11px] text-muted font-medium">
                                        Qty: {qty} × {formatCurrency(unitPrice)} =
                                      </span>
                                      <span className={`font-bold text-xs ${item.isCancelled ? 'line-through text-red-500' : 'text-main'}`}>
                                        {formatCurrency(itemTotal)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Source Subtotal Footer */}
                            <div className="px-4 py-2.5 bg-base/40 border-t border-line flex justify-between items-center text-xs">
                              <span className="text-muted font-bold">Source subtotal</span>
                              <span className="font-extrabold text-main">{formatCurrency(group.subtotal)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-muted italic px-1">No items details available.</p>
              )}
            </div>
          )}

          {/* 6. FINANCIAL BREAKDOWN CARD & PAYMENT DETAILS */}
          {role !== 'rider' ? (
            <div className="bg-base/70 border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
              <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-muted border-b border-line pb-2">
                {role === 'restaurant' ? 'Restaurant Earnings & Bill' : 'Payment Summary'}
              </h4>

              {role === 'restaurant' ? (
                (() => {
                  const relevantItems = Array.isArray(order.items)
                    ? order.items.filter(i => !(i.itemModel === 'CatalogItem' || Boolean(i.supplierId)) && (!order.restaurantId || !i.restaurantId || String(i.restaurantId) === String(order.restaurantId)))
                    : [];
                  const restaurantFoodSubtotal = relevantItems.reduce((sum, it) => {
                    if (it.isCancelled) return sum;
                    const p = parseFloat(it.price) || 0;
                    const q = parseInt(it.quantity, 10) || 1;
                    return sum + (p * q);
                  }, 0);
                  const rFin = financials.restaurant?.byRestaurant?.find(r => (!order.restaurantId || String(r.restaurantId) === String(order.restaurantId)));
                  const displayPayable = rFin ? rFin.restaurantPayable : (financials.restaurant?.restaurantPayable > 0 ? financials.restaurant.restaurantPayable : (restaurantFoodSubtotal > 0 ? restaurantFoodSubtotal : (order.subtotal || financials.customer.itemsSubtotal)));

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Restaurant Items Total</span>
                        <span className="font-bold text-main">{formatCurrency(displayPayable)}</span>
                      </div>
                      <div className="border-t border-line pt-2.5 flex justify-between items-center text-sm font-extrabold">
                        <span className="text-main">Total Payable to Restaurant</span>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-primary font-black text-base">
                            {formatCurrency(displayPayable)}
                          </span>
                          <span className="text-[10px] text-muted font-bold">
                            {getPaymentMethodDisplay()}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted italic">Cash / Manual operational handling</p>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-medium">Items Subtotal</span>
                    <span className="font-bold text-main">{formatCurrency(financials.customer.itemsSubtotal)}</span>
                  </div>

                  {/* STANDARDIZED DELIVERY & OTHER CHARGES BREAKDOWN CARD */}
                  <div className="bg-surface/90 border border-line/80 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-line/70 pb-2">
                      <h5 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary">
                        DELIVERY & OTHER CHARGES
                      </h5>
                      <span className="text-[10px] font-bold text-muted bg-base px-2 py-0.5 rounded border border-line">
                        {deliveryBreakdown.lines.length} {deliveryBreakdown.lines.length === 1 ? 'Source' : 'Sources'}
                      </span>
                    </div>

                    {/* Individual Pickup Fee Rows */}
                    {!isRide && deliveryBreakdown.lines.length > 0 && (
                      <div className="flex flex-col gap-2 py-0.5">
                        {deliveryBreakdown.lines.map((line) => (
                          <div key={line.sequence} className="flex justify-between items-center text-xs">
                            <span className="text-muted font-medium flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="text-sm shrink-0">
                                {line.sourceType === 'restaurant' ? '🍽️' : line.sourceType === 'supplier' ? '🏪' : '📍'}
                              </span>
                              <span className="truncate">{line.label}</span>
                            </span>
                            <span className="font-bold text-main shrink-0 ml-auto">+{formatCurrency(line.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rain Fee if > 0 */}
                    {deliveryBreakdown.rainFee > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium flex items-center gap-1.5">
                          <span>🌧️ Rain Surcharge</span>
                        </span>
                        <span className="font-bold text-main">+{formatCurrency(deliveryBreakdown.rainFee)}</span>
                      </div>
                    )}

                    {/* Surge Fee if > 0 */}
                    {deliveryBreakdown.surgeFee > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium flex items-center gap-1.5">
                          <span>⚡ Demand / Surge Fee</span>
                        </span>
                        <span className="font-bold text-main">+{formatCurrency(deliveryBreakdown.surgeFee)}</span>
                      </div>
                    )}

                    {/* Extra Item Fee if > 0 */}
                    {deliveryBreakdown.extraItemFee > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Extra Item Handling Fee</span>
                        <span className="font-bold text-main">+{formatCurrency(deliveryBreakdown.extraItemFee)}</span>
                      </div>
                    )}

                    {/* Total Delivery Fees */}
                    <div className="border-t border-b border-line/70 py-2 flex justify-between items-center text-xs font-bold">
                      <span className="text-main">Total Delivery Fees</span>
                      <span className="text-main font-black">{formatCurrency(deliveryBreakdown.totalDeliveryFees)}</span>
                    </div>

                    {/* Platform Fee */}
                    {deliveryBreakdown.platformFee > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Platform Fee</span>
                        <span className="font-bold text-main">+{formatCurrency(deliveryBreakdown.platformFee)}</span>
                      </div>
                    )}

                    {/* Coupon Discount */}
                    {deliveryBreakdown.discount > 0 && (
                      <div className="flex justify-between items-center text-xs text-green-600 dark:text-green-400 font-bold">
                        <span>Coupon Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                        <span>-{formatCurrency(deliveryBreakdown.discount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-line pt-2.5 flex justify-between items-center text-sm font-extrabold">
                    <span className="text-main">TOTAL PAYABLE</span>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-primary font-black text-base">
                        {formatCurrency(deliveryBreakdown.totalPayable)}
                      </span>
                      <span className="text-[10px] text-muted font-bold">
                        {getPaymentMethodDisplay()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Rider Panel Section: Operational Payment Collection vs Delivery Earnings */
            <div className="flex flex-col gap-4">
              {/* A. CUSTOMER PAYMENT COLLECTION */}
              <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-muted border-b border-line pb-1.5 flex justify-between items-center">
                  <span>CUSTOMER PAYMENT</span>
                  <span className="text-[9px] font-bold text-muted bg-base px-2 py-0.5 rounded border border-line uppercase">
                    {order.paymentDetails?.method || (order.paymentMethod === 'COD' || !order.paymentMethod ? 'Cash on Delivery' : order.paymentMethod)}
                  </span>
                </h4>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">Amount to Collect</span>
                  <span className="font-black text-main text-base">{formatCurrency(order.total ?? order.fare)}</span>
                </div>
              </div>

              {/* B. RIDER DELIVERY EARNINGS SUMMARY */}
              <div className="bg-base/70 border border-line rounded-2xl p-4 flex flex-col gap-2.5">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-muted border-b border-line pb-1.5 flex justify-between items-center">
                  <span>{isRide ? 'RIDER CAPTAIN EARNINGS' : 'RIDER DELIVERY EARNINGS'}</span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 uppercase">
                    Wallet Payout
                  </span>
                </h4>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">{isRide ? 'Ride Payout' : 'Base Delivery Earning'}</span>
                  <span className="font-bold text-main">
                    {formatCurrency(isRide ? (order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare) : financials.rider.basePayout)}
                  </span>
                </div>

                {!isRide && financials.rider.additionalStopPayout > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-medium">Additional Pickup Stops</span>
                    <span className="font-bold text-main">{formatCurrency(financials.rider.additionalStopPayout)}</span>
                  </div>
                )}

                {order.riderReview?.tipAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-green-600 dark:text-green-400 font-bold">
                    <span>Customer Tip</span>
                    <span>+{formatCurrency(order.riderReview.tipAmount)}</span>
                  </div>
                )}

                <div className="border-t border-line pt-2 flex justify-between items-center text-sm font-extrabold">
                  <span className="text-main">Total {isRide ? 'Captain' : 'Delivery'} Earning</span>
                  <span className="text-green-600 dark:text-green-400 font-black text-base">
                    {formatCurrency(
                      isRide 
                        ? ((Number(order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare) || 0) + (Number(order.riderReview?.tipAmount) || 0))
                        : ((Number(financials.rider.totalRiderPayout) || 0) + (Number(order.riderReview?.tipAmount) || 0))
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Admin Financial Reconciliation View */}
          {role === 'admin' && (
            <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 flex flex-col gap-2">
              <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary border-b border-violet-200/60 pb-1.5">
                Platform Delivery Financial Reconciliation
              </h4>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Customer Delivery Charge</span>
                <span className="font-bold text-main">{formatCurrency(financials.platform.customerDeliveryFee)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Rider Delivery Payout</span>
                <span className="font-bold text-main">{formatCurrency(financials.platform.riderPayout)}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-violet-200/50">
                <span className="text-muted">Platform Delivery Difference / Subsidy</span>
                <span className={financials.platform.platformMargin >= 0 ? 'text-green-600' : 'text-amber-600'}>
                  {financials.platform.platformMargin >= 0
                    ? `+${formatCurrency(financials.platform.platformMargin)} (Platform Margin)`
                    : `-${formatCurrency(Math.abs(financials.platform.platformMargin))} (Platform Subsidized)`}
                </span>
              </div>
            </div>
          )}

          {/* 8. DELIVERY ADDRESS & CUSTOMER DETAILS */}
          {!isRide && (
            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Delivery Address
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-main">
                    {order.customerName || order.user?.name || 'Customer'}
                  </span>
                  {order.address?.label && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {order.address.label}
                    </span>
                  )}
                  {/* Phone for authorized roles */}
                  {(role === 'admin' || role === 'rider') && order.customerPhone && (
                    <span className="text-[10px] text-muted font-medium ml-1">
                      ({order.customerPhone})
                    </span>
                  )}
                </div>

                <p className="text-muted leading-relaxed font-medium">
                  {order.customerLocation?.formattedAddress || 
                    [order.address?.street, order.address?.city, order.address?.state, order.address?.zip]
                      .filter(Boolean)
                      .join(', ') || 
                    'Customer Address'}
                </p>
              </div>
            </div>
          )}

          {/* Admin authorized technical log view */}
          {role === 'admin' && (
            <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-2 text-[11px]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                Admin Diagnostic Snapshot
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted font-medium">
                <div>User ID: <span className="text-main font-mono">{String(order.userId || 'N/A')}</span></div>
                <div>Payment Status: <span className="text-main font-bold">{order.paymentDetails?.status || 'Pending'}</span></div>
                <div>Txn Ref: <span className="text-main font-mono">{order.paymentDetails?.transactionId || 'None'}</span></div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="border-t border-line px-5 py-3.5 bg-surface flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line text-muted hover:text-main hover:bg-base text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Customer Reorder Button (Food / Store) */}
            {role === 'customer' && !isRide && onReorder && (
              <button
                onClick={() => {
                  onClose();
                  onReorder(order);
                }}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reorder Items</span>
              </button>
            )}

            {/* Customer Rate Rider Button (if delivered and not rated) */}
            {role === 'customer' && isDelivered && onRateRider && hasRider && !(Number(order.riderReview?.rating) > 0) && (
              <button
                onClick={() => {
                  onClose();
                  onRateRider(order);
                }}
                className="bg-violet-50 hover:bg-violet-100 text-primary border border-violet-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>{isRide ? 'Rate Ride Captain' : 'Rate & Tip Rider'}</span>
              </button>
            )}

            {/* Customer Rate Restaurant Button (if delivered and unrated food restaurants exist) */}
            {role === 'customer' && isDelivered && onRateRestaurant && !isRide && getContributingFoodRestaurants(order).some(rest => {
              const isRated = Array.isArray(order.restaurantReviews)
                ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)));
              return !isRated;
            }) && (
              <button
                onClick={() => {
                  const unrated = getContributingFoodRestaurants(order).find(rest => {
                    const isRated = Array.isArray(order.restaurantReviews)
                      ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                      : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)));
                    return !isRated;
                  });
                  onClose();
                  onRateRestaurant(order, unrated);
                }}
                className="bg-violet-50 hover:bg-violet-100 text-primary border border-violet-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>Rate Restaurant</span>
              </button>
            )}

            {/* Customer Rate Store Button (if delivered and unrated store sources exist) */}
            {role === 'customer' && isDelivered && onRateStore && !isRide && getContributingStoreSources(order).some(src => {
              const isRated = Array.isArray(order.storeReviews) && order.storeReviews.some(r => 
                String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
              );
              return !isRated;
            }) && (
              <button
                onClick={() => {
                  const unrated = getContributingStoreSources(order).find(src => {
                    const isRated = Array.isArray(order.storeReviews) && order.storeReviews.some(r => 
                      String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                    );
                    return !isRated;
                  });
                  onClose();
                  onRateStore(order, unrated);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>Rate Store</span>
              </button>
            )}

            {/* Active order customer actions: Cancel Order + Track Live */}
            {role === 'customer' && !isDelivered && !isCancelled && !isRejected && (
              <>
                {getCustomerCancellationEligibility(order).canCancelAnything && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span>{isRide ? 'Cancel Ride' : 'Cancel Order'}</span>
                  </button>
                )}

                <Link
                  to={`/order-tracking/${order._id}`}
                  onClick={onClose}
                  className="bg-primary-light text-primary hover:bg-violet-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Track Live</span>
                </Link>
              </>
            )}

            {/* Support button */}
            {role === 'customer' && (
              <a
                href="mailto:support@jinkzo.com?subject=Help with Order #"
                className="bg-base hover:bg-base/80 text-muted hover:text-main border border-line text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Support</span>
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Customer Cancel Order Modal */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        order={order}
        token={token}
        onCancelSuccess={(updatedOrder) => {
          setOrder(updatedOrder);
          if (onOrderUpdated) onOrderUpdated(updatedOrder);
        }}
      />
    </div>
  );
}
