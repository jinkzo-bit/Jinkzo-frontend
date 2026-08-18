import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, ShoppingBag, Calendar, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import RiderFeedbackModal from '../components/RiderFeedbackModal';
import { formatAppDate } from '../utils/dateUtils';

export default function Orders() {
  const { token, user } = useAuthStore();
  const { addItem, clearCart, showToast } = useCartStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (!user && token) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 flex flex-col gap-6 w-full">
        <div className="h-8 skeleton-xl w-1/4" />
        <div className="h-64 skeleton-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-8 w-full min-h-screen pt-4">
      <div className="border-b border-line pb-4">
        <h1 className="font-display font-extrabold text-2xl text-main leading-tight flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          Order History
        </h1>
        <p className="text-xs text-muted font-medium mt-1">Trace past orders and rides</p>
      </div>

      <div className="flex flex-col gap-5">
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
                        : order.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                    <p className="text-xs font-bold text-main mt-0.5">₹{(order.total != null ? order.total : 0).toFixed(2)}</p>
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
                    {order.status === 'Delivered' && Number(order.riderReview?.rating) > 0 && (
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

                    {order.status === 'Delivered' && !(Number(order.riderReview?.rating) > 0) && order.deliveryAgent && (
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
    </div>
  );
}
