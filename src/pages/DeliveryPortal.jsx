import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bike, MapPin, Store, DollarSign, Clock, ShieldCheck, CheckCircle, AlertCircle, Phone, Navigation, Camera, X, MessageSquare, Send, Bell, ChevronRight, RefreshCw, ShoppingBag, FileText } from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';
import { useAuthStore } from '../store/authStore';
import { io } from 'socket.io-client';
import { formatAppTimeOnly } from '../utils/dateUtils';

export default function DeliveryPortal() {
  const { user, token } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'completed'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/orders/${selectedOrder._id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: messageText,
          sender: 'rider'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
        setMessageText('');
        fetchOrders();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/delivery/all`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Fetch all delivery orders error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll orders list on mount
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000); // refresh every 6s
    return () => clearInterval(interval);
  }, []);

  // Update selectedOrder when orders list updates, without infinite loop
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o._id === selectedOrder._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updated);
      }
    }
  }, [orders, selectedOrder]);

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
    console.log('[GPS SOCKET] Live coordinate streaming activated in Portal for order:', selectedOrder._id);

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[GPS SOCKET] Dispatching coordinate update from Portal:', latitude, longitude);
          socket.emit('updateLocation', {
            orderId: selectedOrder._id,
            lat: latitude,
            lng: longitude
          });
        },
        (err) => {
          console.error('[GPS SOCKET] Geolocation error in Portal:', err);
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

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        // Update local list
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        setSelectedOrder(updatedOrder);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter orders by tab
  const pendingOrders = orders.filter(o => o.status !== 'Delivered');
  const completedOrders = orders
    .filter(o => o.status === 'Delivered')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentOrders = activeTab === 'pending' ? pendingOrders : completedOrders;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Placed':
        return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Preparing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Out for Delivery':
        return 'bg-purple-100 text-purple-700 border-purple-200 animate-pulse';
      case 'Delivered':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-main';
    }
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'Placed':
        return { next: 'Confirmed', label: 'Accept & Confirm Order' };
      case 'Confirmed':
        return { next: 'Preparing', label: 'Start Preparing Food' };
      case 'Preparing':
        return { next: 'Out for Delivery', label: 'Pick Up & Start Delivery' };
      case 'Out for Delivery':
        return { next: 'Delivered', label: 'Mark as Delivered' };
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary-light text-primary rounded-xl">
              <Bike className="w-6 h-6" />
            </span>
            <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
              Delivery Agent Dashboard
            </h1>
          </div>
          <p className="text-xs text-muted font-medium mt-1">
            Accept active orders, update status milestones, and simulate delivery routing maps.
          </p>
        </div>

        {/* Agent Profile or Guest badge */}
        <div className="flex items-center gap-4 flex-wrap">
          {user ? (
            <div className="bg-surface border border-gray-150 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm relative">
                {user.name[0].toUpperCase()}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="text-left leading-none">
                <h4 className="text-[9px] font-extrabold text-primary uppercase tracking-wider">Active Partner</h4>
                <p className="text-xs font-black text-main mt-0.5">{user.name}</p>
                <p className="text-[9px] text-muted font-semibold mt-0.5">{user.phone}</p>
              </div>
            </div>
          ) : (
            <div className="bg-violet-50/40 border border-violet-100 rounded-2xl p-2.5 flex items-center gap-3">
              <span className="text-[10px] text-violet-600 font-semibold">Simulation Mode (Guest)</span>
              <Link 
                to="/login?redirect=/delivery"
                className="bg-primary hover:bg-primary-hover text-white text-[9px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition-all"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary font-bold bg-surface border border-line-strong rounded-xl px-3.5 py-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Status</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 1 Column: Orders List */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 bg-surface p-1 rounded-2xl border border-line shadow-2xs">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedOrder(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-muted'
              }`}
            >
              Pending Tasks ({pendingOrders.length})
            </button>
            <button
              onClick={() => { setActiveTab('completed'); setSelectedOrder(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-muted'
              }`}
            >
              Completed ({completedOrders.length})
            </button>
          </div>

          {/* Orders List Container */}
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-24 skeleton-2xl" />
                <div className="h-24 skeleton-2xl" />
              </div>
            ) : currentOrders.length > 0 ? (
              currentOrders.map((order) => {
                const action = getNextStatusAction(order.status);
                return (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                      selectedOrder?._id === order._id
                        ? 'border-primary bg-violet-50/15 shadow-sm'
                        : 'border-line hover:border-line-strong bg-surface hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-muted font-bold">
                        #{order._id.substr(-8).toUpperCase()}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-main">
                        <Store className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        <span className="font-bold line-clamp-1">{order.restaurant?.name || 'Restaurant'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted">
                        <MapPin className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        <span className="font-semibold line-clamp-1">{order.customerLocation?.formattedAddress || order.address?.street || 'Customer Address'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-line pt-2 text-[10px] font-bold text-muted">
                      <span>Total: ₹{order.total.toFixed(2)}</span>
                      <span className="text-primary flex items-center gap-0.5">
                        Manage <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-surface rounded-2xl border border-line p-8 text-center flex flex-col items-center justify-center gap-3">
                <Bike className="w-8 h-8 text-gray-300" />
                <h4 className="font-display font-extrabold text-sm text-main">No Orders in this Section</h4>
                <p className="text-[11px] text-muted max-w-xs leading-relaxed">
                  {activeTab === 'pending' 
                    ? 'All placements are currently accepted. New orders placed by customers will stream here.' 
                    : 'Completed dispatches will show up in this folder.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Order Detail & Status Manager */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-6 animate-scale-up">
              
              {/* Top Banner */}
              <div className="flex justify-between items-start border-b border-line pb-4 gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-main">
                    Order Details
                  </h3>
                  <p className="text-[10px] text-muted font-mono mt-0.5">ID: {selectedOrder._id}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(selectedOrder.status)}`}>
                  Status: {selectedOrder.status}
                </span>
              </div>

              {/* Vector Map Preview (Active visual progression) */}
              <InteractiveMap 
                status={selectedOrder.status} 
                orderId={selectedOrder._id} 
                restaurantAddress={selectedOrder.restaurantLocation?.formattedAddress || selectedOrder.pickupAddress?.street || ''}
                restaurantLat={selectedOrder.restaurantLocation?.lat}
                restaurantLng={selectedOrder.restaurantLocation?.lng}
                customerAddress={selectedOrder.customerLocation?.formattedAddress || selectedOrder.address?.street || ''}
                customerLat={selectedOrder.customerLocation?.lat}
                customerLng={selectedOrder.customerLocation?.lng}
                deliveryMethod={selectedOrder.orderType === 'ride' ? 'Ride' : 'Standard'}
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

              {/* Status Action triggers */}
              <div className="bg-base border border-gray-150 p-4 rounded-2xl flex flex-col gap-3">
                <h4 className="text-xs font-bold text-main uppercase tracking-wider">Milestone Controller</h4>
                {getNextStatusAction(selectedOrder.status) ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateStatus(selectedOrder._id, getNextStatusAction(selectedOrder.status).next)}
                      disabled={updatingId === selectedOrder._id}
                      className="flex-grow bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {updatingId === selectedOrder._id ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Bike className="w-4.5 h-4.5" />
                          <span>{getNextStatusAction(selectedOrder.status).label}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-100 text-green-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>This order has been completed and delivered successfully!</span>
                  </div>
                )}
              </div>

              {/* Delivery Addresses info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-line p-4 rounded-2xl flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-muted font-bold mb-1">
                    <Store className="w-4 h-4 text-primary" />
                    <span>PICKUP RESTAURANT</span>
                  </div>
                  <h5 className="text-xs font-bold text-main">{selectedOrder.restaurant?.name || 'Restaurant'}</h5>
                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed font-semibold flex-grow">
                    {selectedOrder.restaurantLocation?.formattedAddress || selectedOrder.pickupAddress?.street || 'Address not available'}
                  </p>
                  {selectedOrder.restaurantLocation?.lat && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.restaurantLocation.lat},${selectedOrder.restaurantLocation.lng}`} 
                      target="_blank" rel="noreferrer"
                      className="mt-3 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Navigate to Restaurant
                    </a>
                  )}
                </div>
                <div className="border border-line p-4 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted font-bold mb-1">
                      <MapPin className="w-4 h-4 text-green-700" />
                      <span>DROP CUSTOMER</span>
                    </div>
                    <h5 className="text-xs font-bold text-main">{selectedOrder.user?.name || 'Customer'}</h5>
                    <p className="text-[11px] text-muted mt-0.5 leading-relaxed font-semibold">
                      {selectedOrder.customerLocation?.formattedAddress || (selectedOrder.address ? `${selectedOrder.address.street}, ${selectedOrder.address.city}` : 'Customer Address')}
                    </p>
                  </div>
                  {selectedOrder.customerLocation?.lat && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.customerLocation.lat},${selectedOrder.customerLocation.lng}`} 
                      target="_blank" rel="noreferrer"
                      className="mt-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Navigate to Customer
                    </a>
                  )}
                  <a 
                    href={`tel:${selectedOrder.user?.phone || selectedOrder.customerPhone || '+919876543210'}`}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Customer ({selectedOrder.user?.phone || selectedOrder.customerPhone || '+91 98765 43210'})</span>
                  </a>
                </div>
              </div>

              {/* Items Summary list */}
              <div className="border border-gray-150 rounded-2xl p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-main uppercase tracking-wider border-b border-line pb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-muted" />
                  <span>Items to Deliver</span>
                </h4>
                <div className="flex flex-col gap-2.5">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold text-main">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted font-medium">x{item.quantity}</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="text-muted">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="border-t border-line pt-3 flex justify-between items-center text-xs font-black text-main">
                  <span>Grand Total to Collect</span>
                  <span className="text-primary text-sm">₹{selectedOrder.total.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase tracking-wider mt-1 px-1">
                  <span>Payment Method: {selectedOrder.paymentDetails.method}</span>
                  <span className={selectedOrder.paymentDetails.status === 'Paid' ? 'text-green-600 font-black' : 'text-violet-500 font-black'}>
                    {selectedOrder.paymentDetails.status}
                  </span>
                </div>
              </div>

              {/* Live Chat Panel */}
              <div className="rounded-2xl p-4 border border-gray-150 flex flex-col gap-3 bg-surface mt-1">
                <h4 className="font-display font-extrabold text-xs text-gray-855 uppercase tracking-wider pb-1 border-b border-line flex items-center justify-between">
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

            </div>
          ) : (
            <div className="bg-surface rounded-3xl border border-line p-20 text-center flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
              <div className="w-14 h-14 rounded-full bg-violet-50 text-primary flex items-center justify-center mb-2">
                <Bike className="w-7 h-7" />
              </div>
              <h4 className="font-display font-extrabold text-sm text-main">No active selection</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">
                Click on any order card from the left side panel to load its routing path and milestone triggers.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
