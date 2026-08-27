import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, ShoppingBag, Calendar, Star, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../store/languageStore';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import { formatAppDate } from '../utils/dateUtils';
import { io } from 'socket.io-client';
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

  // Rider review modal states
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);

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

    fetchOrderHistory();
  }, [token, navigate]);

  // Real-time synchronization for status updates
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
    });

    socket.on('orderStatusChanged', (data) => {
      if (data && data.orderId) {
        setOrders(prev => prev.map(o => o._id === data.orderId ? { ...o, status: data.status, ...(data.order || {}) } : o));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?._id]);

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
      const reorderItem = {
        _id: item.menuItemId,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg
      };
      for (let q = 0; q < item.quantity; q++) {
        addItem(reorderItem, actualRestaurant);
      }
    });

    showToast('Reordered items successfully loaded back into cart!', 'success');
    navigate('/cart');
  };

  const formatDate = (dateStr) => {
    return formatAppDate(dateStr);
  };

  const getOrderCategoryInfo = (order) => {
    if (order.orderType === 'ride') {
      return {
        type: 'RIDE',
        label: 'Ride',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    }
    const rawService = order.serviceType || (order.items && order.items[0]?.serviceType);
    const sType = String(rawService || (order.orderType === 'store' ? 'GROCERY' : 'FOOD')).toUpperCase();
    switch (sType) {
      case 'GROCERY':
        return {
          type: 'GROCERY',
          label: 'Grocery',
          badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'BAKERY':
        return {
          type: 'BAKERY',
          label: 'Bakery',
          badgeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800'
        };
      case 'VEG_FRUITS':
        return {
          type: 'VEG_FRUITS',
          label: 'Veg & Fruits',
          badgeClass: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800'
        };
      case 'MEAT':
        return {
          type: 'MEAT',
          label: 'Meat',
          badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'FOOD':
      default:
        return {
          type: 'FOOD',
          label: 'Food',
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
    }
  };

  const categoryFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'food', label: 'Food' },
    { id: 'grocery', label: 'Grocery' },
    { id: 'bakery', label: 'Bakery' },
    { id: 'veg_fruits', label: 'Veg & Fruits' },
    { id: 'meat', label: 'Meat' },
    { id: 'ride', label: 'Rides' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="border-b border-line pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-main leading-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            {t('profile.orderHistory', 'Order History')}
          </h1>
          <p className="text-xs text-muted font-medium mt-0.5">
            Your food orders, grocery, bakery, fresh produce, meat & rides in one place
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      {orders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categoryFilterOptions.map((cat) => {
            const isSelected = historyFilter.typeFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => historyFilter.setTypeFilter(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap shadow-3xs ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface border-line text-muted hover:text-main hover:border-primary/40'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

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
              ? 'Clear Food Order History'
              : 'Clear History'
          }
          availableYears={historyFilter.availableYears}
          selectedYear={historyFilter.dateFilter.type === 'year' ? historyFilter.dateFilter.year : null}
          onSelectYear={(yr) => (yr ? historyFilter.selectYear(yr) : historyFilter.resetFilters())}
          typeFilter={historyFilter.typeFilter}
          typeOptions={[
            { id: 'all', label: 'All Orders & Rides' },
            { id: 'food', label: 'Food Orders' },
            { id: 'grocery', label: 'Grocery' },
            { id: 'bakery', label: 'Bakery' },
            { id: 'veg_fruits', label: 'Veg & Fruits' },
            { id: 'meat', label: 'Meat' },
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
            When you place orders across food, groceries, bakery, meat, or book rides, your receipt catalog and histories will appear right here.
          </p>
        </div>
      ) : historyFilter.filteredItems.length === 0 ? (
        <HistoryEmptyState
          dateLabel={historyFilter.dateLabel}
          onReset={historyFilter.resetFilters}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {historyFilter.filteredItems.map((order) => {
            const isStoreOrder = order.orderType === 'store' || ['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT', 'STORE'].includes(String(order.serviceType || '').toUpperCase());
            const catInfo = getOrderCategoryInfo(order);
            const isActiveOrder = !['Delivered', 'Completed', 'Rejected', 'Cancelled', 'Rider_Rejected'].includes(order.status);
            const orderDisplayId = order.displayId || `#ORD${order._id.slice(-6).toUpperCase()}`;
            const totalItemsCount = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

            const storeCategorySummary = (() => {
              if (!isStoreOrder || !Array.isArray(order.items) || order.items.length === 0) return null;
              const counts = {};
              order.items.forEach(it => {
                let s = String(it.serviceType || 'GROCERY').trim().toUpperCase();
                if (['BAKERY', 'BAKERY & BEVERAGES', 'BEVERAGES', 'COOL_HOT', 'HOT_COOL'].includes(s)) s = 'Bakery';
                else if (['VEG_FRUITS', 'FRUITS-VEGETABLES', 'FRUITS_VEGETABLES', 'VEGETABLES', 'FRUITS & VEGETABLES', 'VEG & FRUITS'].includes(s)) s = 'Veg & Fruits';
                else if (['MEAT', 'NON-VEG', 'MEAT & SEAFOOD'].includes(s)) s = 'Meat';
                else s = 'Grocery';

                counts[s] = (counts[s] || 0) + (it.quantity || 1);
              });

              return Object.entries(counts).map(([cat, count]) => `${cat} • ${count} ${count === 1 ? 'item' : 'items'}`).join(' | ');
            })();

            const storeOrRestName = order.restaurant?.name || (isStoreOrder ? 'Jinkzo Central Store' : null);

            return (
              <div key={order._id} className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Row 1: Order ID, Category Badge, Restaurant/Store, Date & Status */}
                <div className="flex justify-between items-start border-b border-line pb-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-black text-xs text-primary bg-primary-light/60 px-2 py-0.5 rounded-md">
                        {orderDisplayId}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isStoreOrder ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' : catInfo.badgeClass
                      }`}>
                        {isStoreOrder ? '🏬 Jinkzo Store' : catInfo.label}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-base text-main mt-0.5">
                      {order.orderType === 'ride' ? (
                        'Bike Ride Hailing'
                      ) : isStoreOrder ? (
                        `Jinkzo Store (${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'})`
                      ) : (
                        (order.items && order.items.length > 0)
                          ? (order.items.length === 1 ? order.items[0].name : `${order.items[0].name} +${order.items.length - 1} items`)
                          : 'Order'
                      )}
                    </h4>

                    {storeCategorySummary && (
                      <p className="text-[11px] font-bold text-primary dark:text-primary-light">
                        {storeCategorySummary}
                      </p>
                    )}

                    <p className="text-[11px] text-muted font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Placed on {formatDate(order.createdAt)}</span>
                      {storeOrRestName && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-main font-bold">
                            {storeOrRestName}
                          </span>
                        </>
                      )}
                    </p>
                  </div>


                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      order.status === 'Delivered' || order.status === 'Completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                        : order.status === 'Placed' || order.status === 'Preparing' || order.status === 'Packing' || order.status === 'Out_for_Delivery' || order.status === 'Out for Delivery'
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 animate-pulse'
                        : order.status === 'Rejected' || order.status === 'Cancelled'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    }`}>
                      {t('orderStatus.' + order.status.toLowerCase(), order.status)}
                    </span>
                    <p className="text-sm font-black text-main mt-0.5">₹{(order.total != null ? order.total : 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Row 2: Items Details List / Ride Route */}
                <div className="text-xs text-muted font-medium flex flex-col gap-1">
                  {order.orderType === 'ride' ? (
                    <p className="text-[11px] text-main font-semibold">
                      Pickup: <span className="text-muted">{order.pickupAddress?.street || 'Customer Location'}</span> ➔ Drop: <span className="text-muted">{order.address?.street || 'Destination Address'}</span>
                    </p>
                  ) : (
                    order.items && order.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((it, idx) => (
                          <span key={idx} className="bg-base border border-line px-2 py-0.5 rounded-lg text-[11px] text-main font-bold">
                            {it.name} <span className="text-primary font-black">×{it.quantity}</span>
                            {it.weight || it.unit || it.packSize ? ` (${it.weight || it.unit || it.packSize})` : ''}
                          </span>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Delivery Agent Info if assigned */}
                {order.deliveryAgent && order.deliveryAgent.name && (
                  <div className="bg-base border border-line/60 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted font-semibold">Delivery Partner:</span>
                      <span className="font-bold text-main">{order.deliveryAgent.name}</span>
                      {order.deliveryAgent.phone && (
                        <span className="text-muted">({order.deliveryAgent.phone})</span>
                      )}
                    </div>
                    {order.deliveryAgent.rating && (
                      <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{order.deliveryAgent.rating}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection Reason (if rejected) */}
                {order.status === 'Rejected' && order.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl p-3 -mt-1">
                    <p className="text-[10px] text-red-800 dark:text-red-300 font-bold uppercase tracking-wider mb-0.5">Rejection Reason:</p>
                    <p className="text-xs text-red-900 dark:text-red-200 font-semibold">{order.rejectionReason}</p>
                  </div>
                )}

                {/* Row 3: Action Buttons */}
                <div className="flex justify-between items-center gap-3 pt-1 border-t border-line">
                  <div className="flex items-center gap-2">
                    {order.status === 'Delivered' && Number(order.riderReview?.rating) > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-xl border border-green-200 dark:border-green-800">
                        {order.riderReview.tipAmount > 0 && (
                          <span>Tipped ₹{order.riderReview.tipAmount} •&nbsp;</span>
                        )}
                        <span className="flex items-center">
                          {order.riderReview.rating}
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 ml-0.5" />
                        </span>
                      </div>
                    )}

                    {order.status === 'Delivered' && !(Number(order.riderReview?.rating) > 0) && order.deliveryAgent && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReviewOrder(order);
                          setIsRiderModalOpen(true);
                        }}
                        className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 text-primary font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Rate & Tip Rider
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Track Order (for active orders) / View Details (for completed/cancelled) */}
                    <Link
                      to={`/order-tracking/${order._id}`}
                      className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActiveOrder
                          ? 'bg-primary text-white hover:bg-primary-hover shadow-sm shadow-purple-500/25 animate-pulse'
                          : 'bg-primary-light text-primary hover:bg-violet-100 dark:hover:bg-violet-950/60'
                      }`}
                    >
                      {isActiveOrder ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>Track Order</span>
                        </>
                      ) : (
                        <span>{t('common.viewDetails', 'View Details')}</span>
                      )}
                    </Link>

                    {order.orderType !== 'ride' && (
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="bg-base hover:bg-surface border border-line text-main font-bold text-xs px-4 py-2.5 rounded-xl shadow-3xs transition-colors cursor-pointer hover:border-primary/40"
                      >
                        {t('common.reorder', 'Reorder')}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

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
