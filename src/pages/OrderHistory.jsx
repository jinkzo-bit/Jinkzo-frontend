import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, ShoppingBag, Calendar, Star, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../store/languageStore';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import RestaurantFeedbackModal from '../components/RestaurantFeedbackModal';
import StoreFeedbackModal from '../components/StoreFeedbackModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import CancelOrderModal from '../components/CancelOrderModal';
import { formatAppDate } from '../utils/dateUtils';
import { getContributingFoodRestaurants, getContributingStoreSources, getCustomerCancellationEligibility, formatCurrency } from '../utils/orderUtils';
import {
  useHistoryFilter,
  HistoryFilterToolbar,
  HistoryCalendarModal,
  ClearHistoryModal,
  HistoryEmptyState
} from '../components/history';

export default function OrderHistory() {
  const { user, token } = useAuthStore();
  const { addItem, clearCart, showToast } = useCartStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);

  // Restaurant review states
  const [selectedRestaurantReview, setSelectedRestaurantReview] = useState(null);
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState(false);

  // Store review states (Grocery, Meat, Veg & Fruits, Bakery)
  const [selectedStoreReview, setSelectedStoreReview] = useState(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Global History Filter
  const historyFilter = useHistoryFilter(orders, {
    dateKey: 'createdAt',
    typeKey: 'orderType',
    statusKey: 'status',
  });
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const handleClearHistory = async () => {
    const typeParam = historyFilter.typeFilter;
    const res = await fetch(`${API_BASE}/orders/history?type=${typeParam}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to clear history');
    }
    setOrders((prev) => {
      if (typeParam === 'ride') {
        return prev.filter(o => o.orderType !== 'ride' || !['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(o.status));
      } else if (typeParam === 'food') {
        return prev.filter(o => o.orderType === 'ride' || !['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(o.status));
      } else {
        return prev.filter(o => !['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(o.status));
      }
    });
  };


  const fetchOrderHistory = React.useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchOrderHistory();
  }, [token, navigate, fetchOrderHistory]);

  // Safeguard: Wait for redirect
  if (!user) {
    if (token) {
      return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 flex flex-col gap-6 w-full">
          <div className="h-8 skeleton-xl w-1/4" />
          <div className="h-24 skeleton-3xl" />
          <div className="h-24 skeleton-3xl" />
        </div>
      );
    }
    return null;
  }

  const handleReorder = async (order) => {
    clearCart();

    let actualRestaurant = null;
    try {
      const restId = order.items.find(i => i.restaurantId)?.restaurantId;
      if (restId) {
        const res = await fetch(`${API_BASE}/restaurants/${restId}`);
        if (res.ok) {
          actualRestaurant = await res.json();
        }
      }
    } catch (err) {
      console.error('Failed to fetch actual restaurant for reorder:', err);
    }

    if (!actualRestaurant) {
      actualRestaurant = {
        _id: '607f1f77bcf86cd799439021',
        name: 'Burger Point',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80',
        address: 'Shop 4, Linking Road, Mumbai',
        lat: 19.06,
        lng: 72.8347
      };
    }

    order.items.forEach(item => {
      const isCatalog = item.itemModel === 'CatalogItem' || Boolean(item.supplierId) || (item.service && item.service !== 'food') || ['grocery', 'meat', 'veg_fruits', 'fruits-vegetables', 'veg & fruits', 'bakery_beverages', 'bakery & beverages', 'cool_hot', 'hot_cool'].includes((item.category || '').toLowerCase());

      const reorderItem = {
        _id: item.menuItemId || item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg,
        unit: item.unit || '',
        category: item.category || '',
        itemModel: isCatalog ? 'CatalogItem' : 'MenuItem',
        supplierId: item.supplierId || null,
        supplierName: item.supplierName || null,
        supplierAddress: item.supplierAddress || '',
        supplierLatitude: item.supplierLatitude || null,
        supplierLongitude: item.supplierLongitude || null,
      };
      for (let q = 0; q < (item.quantity || 1); q++) {
        addItem(reorderItem, isCatalog ? null : actualRestaurant);
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
      {/* Page Header */}
      <div className="border-b border-line pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-main leading-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            {t('profile.orderHistory', 'Order History')}
          </h1>
          <p className="text-xs text-muted font-medium mt-0.5">Your food orders and ride history</p>
        </div>
      </div>

      {/* Global History Filter Toolbar */}
      {orders.length > 0 && (
        <HistoryFilterToolbar
          dateLabel={historyFilter.dateLabel}
          isFiltered={historyFilter.isFiltered}
          onOpenCalendar={() => setShowCalendarModal(true)}
          onReset={historyFilter.resetFilters}
          onClearHistory={() => setShowClearModal(true)}
          clearHistoryLabel={
            historyFilter.typeFilter === 'ride'
              ? 'Clear All Ride History'
              : historyFilter.typeFilter === 'food'
              ? 'Clear All Order History'
              : 'Clear All History'
          }
          availableYears={historyFilter.availableYears}
          selectedYear={historyFilter.dateFilter.type === 'year' ? historyFilter.dateFilter.year : null}
          onSelectYear={(yr) => (yr ? historyFilter.selectYear(yr) : historyFilter.resetFilters())}
          typeFilter={historyFilter.typeFilter}
          typeOptions={[
            { id: 'all', label: 'All Orders & Rides' },
            { id: 'food', label: 'Food Orders' },
            { id: 'ride', label: 'Bike Rides' },
          ]}
          onTypeChange={historyFilter.setTypeFilter}
          statusFilter={historyFilter.statusFilter}
          statusOptions={[
            { id: 'all', label: 'All Statuses' },
            { id: 'completed', label: 'Delivered / Completed' },
            { id: 'ongoing', label: 'In-Progress / Ongoing' },
            { id: 'cancelled', label: 'Cancelled / Rejected' },
          ]}
          onStatusChange={historyFilter.setStatusFilter}
          totalCount={orders.length}
          filteredCount={historyFilter.filteredItems.length}
        />
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="h-24 skeleton-3xl" />
          <div className="h-24 skeleton-3xl" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-surface rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
          <h4 className="font-display font-extrabold text-sm text-main">No past orders yet</h4>
          <p className="text-xs text-muted max-w-xs leading-relaxed">
            When you make purchases or book rides, your receipt catalog and histories will populate right here.
          </p>
        </div>
      ) : historyFilter.filteredItems.length === 0 ? (
        <HistoryEmptyState
          dateLabel={historyFilter.dateLabel}
          onReset={historyFilter.resetFilters}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {historyFilter.filteredItems.map((order) => (
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
                          From: {order.restaurant.name}
                        </span>
                      </>
                    )}
                    {['Delivered', 'Completed'].includes(order.status) && (order.deliveryAgent?.name || order.deliveryAgentName) && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          Delivered by: {order.deliveryAgent?.name || order.deliveryAgentName}
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
                      : order.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status === 'Placed' && order.orderType === 'food'
                      ? 'Awaiting Restaurant Confirmation'
                      : t('orderStatus.' + order.status.toLowerCase(), order.status)}
                  </span>
                  <p className="text-xs font-bold text-main mt-0.5">{formatCurrency(order.total ?? order.fare)}</p>
                </div>
              </div>

              {/* Rejection Reason (if rejected) */}
              {order.status === 'Rejected' && order.rejectionReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 -mt-1">
                  <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider mb-0.5">Rejection Reason:</p>
                  <p className="text-xs text-red-900 font-semibold">{order.rejectionReason}</p>
                </div>
              )}

              {/* Row 2: Actions */}
              <div className="flex justify-between items-center gap-4">
                {/* Items text summary */}
                <p className="text-[11px] text-muted font-semibold truncate max-w-[60%]">
                  {order.orderType === 'ride' ? (
                    `Pickup: ${order.pickupAddress?.street || 'Customer Location'} ➔ Drop: ${order.address?.street || 'Destination Address'}`
                  ) : (
                    (order.items && order.items.length > 0)
                      ? order.items.map(i => `${i.name || i.itemName || i.productName || i.title || i.foodName || 'Item'} (${i.quantity})`).join(', ')
                      : '—'
                  )}
                </p>

                <div className="flex items-center gap-2">
                  {/* Compact Rider rating badge */}
                  {['Delivered', 'Completed'].includes(order.status) && Number(order.riderReview?.rating) > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-2 py-1 rounded-xl border border-green-200">
                      <span>{order.orderType === 'ride' ? 'Captain:' : 'Rider:'}</span>
                      <span className="flex items-center">
                        {order.riderReview.rating}
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 ml-0.5" />
                      </span>
                    </div>
                  )}

                  {/* Compact Restaurant rating badge */}
                  {order.status === 'Delivered' && order.orderType !== 'ride' && getContributingFoodRestaurants(order).length > 0 && (
                    (() => {
                      const foodRests = getContributingFoodRestaurants(order);
                      const allRated = foodRests.every(rest => 
                        Array.isArray(order.restaurantReviews)
                          ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                          : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id)))
                      );
                      const firstUnrated = foodRests.find(rest => 
                        !(Array.isArray(order.restaurantReviews)
                          ? order.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                          : (order.review && (!order.restaurantId || String(order.restaurantId) === String(rest.id))))
                      );

                      if (allRated) {
                        return (
                          <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-2 py-1 rounded-xl border border-green-200">
                            <span>Food: Rated ✓</span>
                          </div>
                        );
                      } else if (firstUnrated) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedRestaurantReview({ order, restaurant: firstUnrated });
                              setIsRestaurantModalOpen(true);
                            }}
                            className="bg-violet-50 hover:bg-violet-100 text-primary font-bold text-xs px-2.5 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span>Rate Food</span>
                          </button>
                        );
                      }
                      return null;
                    })()
                  )}

                  {/* Compact Store / Supplier rating badge */}
                  {order.status === 'Delivered' && order.orderType !== 'ride' && getContributingStoreSources(order).length > 0 && (
                    (() => {
                      const storeSources = getContributingStoreSources(order);
                      const allRated = storeSources.every(src => 
                        Array.isArray(order.storeReviews) && order.storeReviews.some(r => 
                          String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                        )
                      );
                      const firstUnrated = storeSources.find(src => 
                        !(Array.isArray(order.storeReviews) && order.storeReviews.some(r => 
                          String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                        ))
                      );

                      if (allRated) {
                        return (
                          <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-2 py-1 rounded-xl border border-green-200">
                            <span>Stores: Rated ✓</span>
                          </div>
                        );
                      } else if (firstUnrated) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedStoreReview({ order, source: firstUnrated });
                              setIsStoreModalOpen(true);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span>Rate {firstUnrated.serviceLabel}</span>
                          </button>
                        );
                      }
                      return null;
                    })()
                  )}

                  {['Delivered', 'Completed'].includes(order.status) && !(Number(order.riderReview?.rating) > 0) && order.deliveryAgent && (
                    <button
                      onClick={() => {
                        setSelectedReviewOrder(order);
                        setIsRiderModalOpen(true);
                      }}
                      className="bg-violet-50 hover:bg-violet-100 text-primary font-bold text-xs px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                    >
                      {order.orderType === 'ride' ? 'Rate Captain' : 'Rate Rider'}
                    </button>
                  )}

                  {/* Active tracking or View details button */}
                  {!['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(order.status) && (
                    <>
                      {getCustomerCancellationEligibility(order).canCancelAnything && (
                        <button
                          onClick={() => {
                            setSelectedCancelOrder(order);
                            setIsCancelModalOpen(true);
                          }}
                          className="border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                          <span>{order.orderType === 'ride' ? 'Cancel Ride' : 'Cancel Order'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDetailsOrder(order)}
                        className="bg-base text-main border border-line hover:bg-gray-100 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {t('common.viewDetails', 'View details')}
                      </button>

                      <Link
                        to={`/order-tracking/${order._id}`}
                        className="bg-primary-light text-primary hover:bg-violet-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {t('common.trackLive', 'Track Live')}
                      </Link>
                    </>
                  )}

                  {['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(order.status) && (
                    <button
                      onClick={() => setSelectedDetailsOrder(order)}
                      className="bg-primary-light text-primary hover:bg-violet-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      {t('common.viewDetails', 'View details')}
                    </button>
                  )}

                  {order.orderType !== 'ride' && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      {t('common.reorder', 'Reorder')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UNIFIED ORDER DETAILS MODAL ─── */}
      <OrderDetailsModal
        isOpen={Boolean(selectedDetailsOrder)}
        onClose={() => setSelectedDetailsOrder(null)}
        order={selectedDetailsOrder}
        role="customer"
        token={token}
        onReorder={handleReorder}
        onOrderUpdated={fetchOrderHistory}
        onRateRider={(ord) => {
          setSelectedReviewOrder(ord);
          setIsRiderModalOpen(true);
        }}
        onRateRestaurant={(ord, rest) => {
          setSelectedRestaurantReview({ order: ord, restaurant: rest });
          setIsRestaurantModalOpen(true);
        }}
        onRateStore={(ord, src) => {
          setSelectedStoreReview({ order: ord, source: src });
          setIsStoreModalOpen(true);
        }}
      />

      {/* ── CUSTOMER CANCEL ORDER MODAL ─── */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedCancelOrder(null);
        }}
        order={selectedCancelOrder}
        token={token}
        onCancelSuccess={(updatedOrder) => {
          fetchOrderHistory();
          if (selectedDetailsOrder && selectedDetailsOrder._id === updatedOrder._id) {
            setSelectedDetailsOrder(updatedOrder);
          }
          showToast('Order updated successfully', 'success');
        }}
      />

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
          isRide={selectedReviewOrder.orderType === 'ride'}
          onFeedbackSubmit={(updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            if (selectedDetailsOrder && selectedDetailsOrder._id === updatedOrder._id) {
              setSelectedDetailsOrder(updatedOrder);
            }
          }}
          onProceedToRestaurant={
            selectedReviewOrder.orderType !== 'ride' && getContributingFoodRestaurants(selectedReviewOrder).some(rest => {
              const isRated = Array.isArray(selectedReviewOrder.restaurantReviews)
                ? selectedReviewOrder.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                : (selectedReviewOrder.review && (!selectedReviewOrder.restaurantId || String(selectedReviewOrder.restaurantId) === String(rest.id)));
              return !isRated;
            }) ? () => {
              const firstUnrated = getContributingFoodRestaurants(selectedReviewOrder).find(rest => {
                const isRated = Array.isArray(selectedReviewOrder.restaurantReviews)
                  ? selectedReviewOrder.restaurantReviews.some(r => String(r.restaurantId) === String(rest.id))
                  : (selectedReviewOrder.review && (!selectedReviewOrder.restaurantId || String(selectedReviewOrder.restaurantId) === String(rest.id)));
                return !isRated;
              });
              if (firstUnrated) {
                setSelectedRestaurantReview({ order: selectedReviewOrder, restaurant: firstUnrated });
                setIsRestaurantModalOpen(true);
              }
            } : (
              selectedReviewOrder.orderType !== 'ride' && getContributingStoreSources(selectedReviewOrder).some(src => {
                const isRated = Array.isArray(selectedReviewOrder.storeReviews) && selectedReviewOrder.storeReviews.some(r =>
                  String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                );
                return !isRated;
              }) ? () => {
                const firstUnratedStore = getContributingStoreSources(selectedReviewOrder).find(src => {
                  const isRated = Array.isArray(selectedReviewOrder.storeReviews) && selectedReviewOrder.storeReviews.some(r =>
                    String(r.sourceId) === String(src.sourceId) && r.serviceType === src.serviceType
                  );
                  return !isRated;
                });
                if (firstUnratedStore) {
                  setSelectedStoreReview({ order: selectedReviewOrder, source: firstUnratedStore });
                  setIsStoreModalOpen(true);
                }
              } : null
            )
          }
        />
      )}

      {/* ── RESTAURANT FEEDBACK MODAL ─── */}
      {selectedRestaurantReview && (
        <RestaurantFeedbackModal
          isOpen={isRestaurantModalOpen}
          onClose={() => {
            setIsRestaurantModalOpen(false);
            setSelectedRestaurantReview(null);
          }}
          order={selectedRestaurantReview.order}
          restaurant={selectedRestaurantReview.restaurant}
          token={token}
          onFeedbackSubmit={(updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            if (selectedDetailsOrder && selectedDetailsOrder._id === updatedOrder._id) {
              setSelectedDetailsOrder(updatedOrder);
            }
          }}
          onSkip={() => {
            setIsRestaurantModalOpen(false);
            setSelectedRestaurantReview(null);
          }}
        />
      )}

      {/* ── STORE FEEDBACK MODAL (Grocery, Meat, Veg & Fruits, Bakery) ─── */}
      {selectedStoreReview && (
        <StoreFeedbackModal
          isOpen={isStoreModalOpen}
          onClose={() => {
            setIsStoreModalOpen(false);
            setSelectedStoreReview(null);
          }}
          order={selectedStoreReview.order}
          source={selectedStoreReview.source}
          token={token}
          onFeedbackSubmit={(updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            if (selectedDetailsOrder && selectedDetailsOrder._id === updatedOrder._id) {
              setSelectedDetailsOrder(updatedOrder);
            }
          }}
          onSkip={() => {
            setIsStoreModalOpen(false);
            setSelectedStoreReview(null);
          }}
        />
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

      {/* ── CLEAR HISTORY CONFIRMATION MODAL ─── */}
      <ClearHistoryModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearHistory}
        title={
          historyFilter.typeFilter === 'ride'
            ? 'Clear All Ride History?'
            : historyFilter.typeFilter === 'food'
            ? 'Clear All Order History?'
            : 'Clear All History?'
        }
        description="This will permanently remove your history from this history view. Active orders, rides, and account data will not be affected."
        confirmButtonText="Yes, Clear All"
      />
    </div>
  );
}
