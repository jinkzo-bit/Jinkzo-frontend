import { API_BASE } from '../config/api';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, ChevronRight, Check, AlertCircle, Sparkles, User, ShoppingBag, FileText } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import RazorpaySim from '../components/RazorpaySim';
import { playOrderPlacedSound } from '../utils/audio';
import GoogleMapContainer from '../components/GoogleMapContainer';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { getRoute } from '../services/routingService';

export default function Checkout() {
  const { items, restaurant, getCalculations, clearCart, showToast, promoCode, cashbackAmount, fetchPlatformSettings, platformSettings } = useCartStore();
  const { user, token, addAddress } = useAuthStore();
  const navigate = useNavigate();

  // Address State
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');
  const [newLat, setNewLat] = useState(null);
  const [newLng, setNewLng] = useState(null);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressSelectMode, setAddressSelectMode] = useState('autocomplete'); // 'autocomplete' or 'map'

  // Payment State
  const [paymentMethod] = useState('COD');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isRiderAvailable, setIsRiderAvailable] = useState(true);
  const [isCheckingRiders, setIsCheckingRiders] = useState(true);
  
  // Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Route Info State
  const [routeInfo, setRouteInfo] = useState(null);

  React.useEffect(() => {
    fetchPlatformSettings();
    const checkRiderAvailability = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/riders/check?type=food`);
        if (res.ok) {
          const data = await res.json();
          setIsRiderAvailable(data.available);
          if (!data.available) {
            setErrorMsg("Riders or delivery partners not available. We can't confirm your order.");
          }
        }
      } catch (err) {
        console.error('Rider availability check error:', err);
      } finally {
        setIsCheckingRiders(false);
      }
    };
    checkRiderAvailability();
    
    const fetchWallet = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Wallet fetch error:', err);
      }
    };
    if (token) fetchWallet();
  }, [token]);

  React.useEffect(() => {
    const activeAddress = user?.addresses?.[selectedAddressIndex];
    const restAddress = restaurant?.address || '';
    
    if (activeAddress && restAddress) {
      const fetchRouteInfo = async () => {
        let restPos = (restaurant?.lat && restaurant?.lng) ? { lat: restaurant.lat, lng: restaurant.lng } : null;
        if (!restPos) {
          try {
            const res = await fetch(`${API_BASE}/maps/geocode?address=${encodeURIComponent(restAddress)}`);
            const data = await res.json();
            if (data.success && data.data) restPos = { lat: data.data.lat, lng: data.data.lng };
          } catch (err) { console.error('Failed to geocode restaurant address:', err); }
        }

        let custPos = (activeAddress?.lat && activeAddress?.lng) ? { lat: activeAddress.lat, lng: activeAddress.lng } : null;
        if (!custPos) {
          const fullCustAddress = `${activeAddress.street}, ${activeAddress.city}, ${activeAddress.state} ${activeAddress.zip}`;
          try {
            const res = await fetch(`${API_BASE}/maps/geocode?address=${encodeURIComponent(fullCustAddress)}`);
            const data = await res.json();
            if (data.success && data.data) custPos = { lat: data.data.lat, lng: data.data.lng };
          } catch (err) { console.error('Failed to geocode customer address:', err); }
        }

        if (restPos && custPos) {
          const route = await getRoute(restPos, custPos);
          if (route && route.success === true) {
            setRouteInfo({ distanceKm: route.distanceKm, durationMinutes: route.durationMinutes });
          }
        }
      };
      fetchRouteInfo();
    }
  }, [restaurant?.lat, restaurant?.lng, user?.addresses?.[selectedAddressIndex]?.lat, user?.addresses?.[selectedAddressIndex]?.lng]); // eslint-disable-line

  const { subtotal, deliveryFee, platformFee, promoDiscount, total, restaurantFees } = getCalculations();
  
  const walletAmountUsed = useWallet ? Math.min(walletBalance, total) : 0;
  const finalPayable = Math.max(0, total - walletAmountUsed);

  // Group items by restaurant
  const groupedItems = items.reduce((acc, item) => {
    const rId = item.restaurantId || 'unknown';
    if (!acc[rId]) {
      acc[rId] = {
        restaurantId: rId,
        restaurantName: item.restaurantName || 'Unknown Restaurant',
        items: []
      };
    }
    acc[rId].items.push(item);
    return acc;
  }, {});

  const groupedList = Object.values(groupedItems);

  // Safeguard: Redirect to cart if empty
  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const activeAddresses = user?.addresses || [];

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newStreet || !newCity || !newState || !newZip) return;
    setIsAddressSaving(true);
    const res = await addAddress({ street: newStreet, city: newCity, state: newState, zip: newZip, isDefault: true, lat: newLat ?? null, lng: newLng ?? null });
    setIsAddressSaving(false);
    if (res.success) {
      setShowAddressForm(false);
      setSelectedAddressIndex(user?.addresses ? user.addresses.length : 0);
      setNewStreet(''); setNewCity(''); setNewState(''); setNewZip('');
      setNewLat(null); setNewLng(null);
    }
  };

  const handlePlaceOrderSubmit = async () => {
    setErrorMsg('');
    if (!activeAddresses[selectedAddressIndex]) {
      return setErrorMsg('Please select or add a delivery address.');
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/riders/check?type=food`);
      if (res.ok) {
        const data = await res.json();
        setIsRiderAvailable(data.available);
        if (!data.available) {
          setErrorMsg("Riders or delivery partners not available. We can't confirm your order.");
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.error('Rider availability check error:', err);
    }
    setIsSubmitting(false);

    // Direct placement via Cash on Delivery
    await completeOrderPlacement(null);
  };

  const completeOrderPlacement = async (paymentId = null) => {
    setIsSubmitting(true);
    try {
      const activeAddress = activeAddresses[selectedAddressIndex] || activeAddresses[0];

      const orderPayload = {
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          isVeg: i.isVeg,
          restaurantId: i.restaurantId
        })),
        address: {
          street: activeAddress.street,
          city: activeAddress.city,
          state: activeAddress.state,
          zip: activeAddress.zip
        },
        ...(activeAddress?.lat != null && activeAddress?.lng != null
          ? { deliveryLocation: { lat: activeAddress.lat, lng: activeAddress.lng } }
          : {}),
        restaurantId: items[0]?.restaurantId || restaurant?._id,
        paymentMethod,
        subtotal,
        deliveryFee,
        promoCode: promoCode || '',
        promoDiscount,
        total,
        instruction: deliveryInstructions,
        walletAmountUsed
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to place order');
      }

      showToast('Order placed successfully!', 'success');
      
      // Update local user usedPromos in authStore
      if (promoCode) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          const updatedUsedPromos = [...(currentUser.usedPromos || []), promoCode.toUpperCase()];
          useAuthStore.setState({
            user: {
              ...currentUser,
              usedPromos: updatedUsedPromos
            }
          });
        }
      }

      clearCart(); // Reset cart state
      playOrderPlacedSound();
      navigate(`/order-tracking/${data._id}`); // Route to tracking with active timeline

    } catch (err) {
      setErrorMsg(err.message || 'Server error occurred during checkout');
    } finally {
      setIsSubmitting(false);
      setIsRazorpayOpen(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      <div className="border-b border-line pb-4">
        <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
          Secure Checkout
        </h1>
        <p className="text-xs text-muted font-medium">Verify your address and choose a payment method</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Address and payment section */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {!isRiderAvailable && !isCheckingRiders && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex gap-3 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-805">Delivery Services Suspended</h4>
                <p className="mt-0.5 leading-relaxed font-semibold text-red-700">Riders or delivery partners are currently not available. We cannot confirm or process your order.</p>
              </div>
            </div>
          )}
          
          {/* Section 1: Address */}
          <section className="bg-surface rounded-2xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm md:text-base text-main flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>1. Delivery Address</span>
            </h3>

            {/* Saved Addresses list */}
            {activeAddresses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {activeAddresses.map((addr, idx) => (
                  <div
                    key={addr._id}
                    onClick={() => setSelectedAddressIndex(idx)}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                      selectedAddressIndex === idx
                        ? 'border-primary bg-violet-50/20'
                        : 'border-line hover:border-line-strong bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAddressIndex === idx ? 'border-primary' : 'border-line-strong'}`}>
                        {selectedAddressIndex === idx && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-main">Address Option #{idx + 1}</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed font-medium">
                          {addr.street}, {addr.city}, {addr.state} - {addr.zip}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 flex gap-2.5 text-primary text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="font-semibold">No saved addresses found. Please add a shipping address to place your order.</p>
              </div>
            )}

            {/* Address Toggle Form */}
            {!showAddressForm ? (
              <button
                onClick={() => setShowAddressForm(true)}
                className="text-xs font-bold text-primary hover:text-primary-hover flex items-center justify-start gap-1 cursor-pointer w-max px-1"
              >
                + Add New Address
              </button>
            ) : (
              <form onSubmit={handleAddAddress} className="border-t border-line pt-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <h4 className="text-xs font-bold text-main">Add New Shipping Address</h4>
                  <span className="text-[10px] text-primary font-bold">
                    {addressSelectMode === 'autocomplete'
                      ? '✨ Search location or use GPS'
                      : '✨ Drag map pin to select location'}
                  </span>
                </div>

                {/* Switcher */}
                <div className="flex bg-base p-1 rounded-xl border border-line w-full md:w-max mb-1">
                  <button
                    type="button"
                    onClick={() => setAddressSelectMode('autocomplete')}
                    className={`flex-1 md:flex-initial text-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      addressSelectMode === 'autocomplete'
                        ? 'bg-surface text-primary shadow-xs border border-line'
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    ⌨️ Type Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressSelectMode('map')}
                    className={`flex-1 md:flex-initial text-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      addressSelectMode === 'map'
                        ? 'bg-surface text-primary shadow-xs border border-line'
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    🗺️ Drop Pin
                  </button>
                </div>

                {addressSelectMode === 'autocomplete' ? (
                  <div className="w-full mb-1">
                    <AddressAutocomplete
                      onAddressSelect={(addr) => {
                        setNewStreet(addr.street);
                        setNewCity(addr.city);
                        setNewState(addr.state);
                        setNewZip(addr.zip);
                        setNewLat(addr.lat ?? null);
                        setNewLng(addr.lng ?? null);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[200px] rounded-2xl overflow-hidden border border-line shadow-inner mb-1">
                    <GoogleMapContainer
                      mode="picker"
                      onAddressSelect={(addr) => {
                        setNewStreet(addr.street);
                        setNewCity(addr.city);
                        setNewState(addr.state);
                        setNewZip(addr.zip);
                        setNewLat(addr.lat ?? null);
                        setNewLng(addr.lng ?? null);
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Street Address (e.g. 123 Main St)"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="City (e.g. Bengaluru)"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State (e.g. Karnataka)"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="ZIP Code (e.g. 560001)"
                    value={newZip}
                    onChange={(e) => setNewZip(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="bg-gray-100 hover:skeleton text-main text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddressSaving}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4.5 py-2 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isAddressSaving ? 'Saving...' : 'Save & Select'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Section 1.5: Delivery Instructions */}
          <section className="bg-surface rounded-2xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm md:text-base text-main flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Delivery Instructions (Optional)</span>
            </h3>
            <input
              type="text"
              placeholder="e.g. Leave at door, ring bell, call upon arrival"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none w-full"
            />
          </section>

          {/* Section 2: Payments selection */}
          <section className="bg-surface rounded-2xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm md:text-base text-main flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>2. Payment Method</span>
            </h3>

            <div className="p-4 rounded-xl border border-primary bg-violet-50/20 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold text-main uppercase flex items-center gap-2">
                  💵 Cash On Delivery (COD)
                </span>
                <span className="text-[11px] text-muted font-medium">
                  Pay cash at your doorstep when your food arrives
                </span>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
          </section>

          {/* Section 3: Digital Wallet */}
          {walletBalance > 0 && (
            <section className="bg-surface rounded-2xl p-5 border border-line shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm md:text-base text-main flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span>Digital Wallet</span>
                </h3>
                <div className="text-xs font-bold text-muted bg-base px-3 py-1 rounded-full border border-line">
                  Balance: <span className="text-primary">₹{walletBalance}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="checkbox"
                  id="useWallet"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  className="w-4.5 h-4.5 border-line-strong rounded text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="useWallet" className="text-xs text-main font-bold cursor-pointer select-none">
                  Use wallet balance to pay for this order
                </label>
              </div>
            </section>
          )}

        </div>

        {/* Order billing panel */}
        <div className="flex flex-col gap-4 sticky top-24">
          <div className="bg-surface rounded-2xl p-4 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm text-main border-b border-line pb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-4.5 h-4.5 text-muted" />
              <span>Order Summary</span>
            </h3>

            {/* Collapsed Item list preview */}
            <div className="flex flex-col gap-3 border-b border-line pb-3">
              {groupedList.map((group) => (
                <div key={group.restaurantId} className="flex flex-col gap-1.5">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                    {group.restaurantName}
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    {group.items.map((i) => (
                      <div key={i.menuItemId} className="flex justify-between items-center text-muted font-semibold">
                        <span className="truncate max-w-[70%]">{i.name} <strong className="text-muted font-medium">x{i.quantity}</strong></span>
                        <span className="text-main font-bold">₹{i.price * i.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice Breakdown */}
            <div className="flex flex-col gap-2 text-xs text-muted font-medium border-b border-line pb-3.5">
              {routeInfo && (
                <div className="flex items-center justify-between text-blue-700 bg-blue-50 p-2 rounded-lg mb-1 border border-blue-100">
                  <span className="font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Estimated Delivery Distance:
                  </span>
                  <span className="font-bold">{routeInfo.distanceKm} km ({routeInfo.durationMinutes} mins)</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="text-main font-bold">₹{subtotal}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-b border-line py-1.5 my-0.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Delivery Fee</span>
                  <span className="text-main font-bold">₹{deliveryFee}</span>
                </div>
                {groupedList.map(group => {
                  const fee = restaurantFees?.[group.restaurantId] || 0;
                  return (
                    <div key={group.restaurantId} className="flex items-center justify-between text-[10px] text-muted pl-2">
                      <span className="truncate max-w-[180px] font-medium">• {group.restaurantName}</span>
                      <span className="font-bold">₹{fee}</span>
                    </div>
                  );
                })}
              </div>
              {platformFee > 0 && (
                <div className="flex items-center justify-between font-medium">
                  <span>Platform Fee</span>
                  <span className="text-main font-bold">₹{platformFee}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex items-center justify-between text-green-700 font-bold bg-green-50 p-1.5 rounded-lg">
                  <span>Promo Discount</span>
                  <span>-₹{promoDiscount}</span>
                </div>
              )}
              {cashbackAmount > 0 && (
                <div className="flex items-center justify-between text-yellow-700 font-bold bg-yellow-50 p-1.5 rounded-lg mt-1 border border-yellow-200">
                  <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Promo Cashback</span>
                  <span>+₹{cashbackAmount} to Wallet</span>
                </div>
              )}
              {walletAmountUsed > 0 && (
                <div className="flex items-center justify-between text-blue-700 font-bold bg-blue-50 p-1.5 rounded-lg mt-1">
                  <span>Paid from Wallet</span>
                  <span>-₹{walletAmountUsed}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm font-bold text-main">
              <span>Total Payable</span>
              <span className="text-primary text-base">₹{finalPayable.toFixed(2)}</span>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold p-2.5 rounded-xl flex gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Place Order submit */}
            <button
              onClick={handlePlaceOrderSubmit}
              disabled={isSubmitting || (!isRiderAvailable && !isCheckingRiders)}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Razorpay Simulation Dialog Overlay */}
      <RazorpaySim
        amount={finalPayable}
        isOpen={isRazorpayOpen}
        onClose={() => setIsRazorpayOpen(false)}
        onSuccess={completeOrderPlacement}
      />
    </div>
  );
}
