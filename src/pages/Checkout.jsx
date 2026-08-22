import { API_BASE } from '../config/api';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, ChevronRight, Check, AlertCircle, Sparkles, User, ShoppingBag, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import { playOrderPlacedSound } from '../utils/audio';
import LocationPickerModal from '../components/LocationPickerModal';
import { getRoute } from '../services/routingService';

export default function Checkout() {
  const { items, restaurant, getCalculations, clearCart, showToast, promoCode, fetchPlatformSettings, platformSettings } = useCartStore();
  const { user, token, addAddress, deleteAddress } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Address State
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);

  // Location Picker Modal State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddressInitial, setEditingAddressInitial] = useState(null);

  // Payment State
  const [paymentMethod] = useState('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isRiderAvailable, setIsRiderAvailable] = useState(true);
  const [isCheckingRiders, setIsCheckingRiders] = useState(true);
  


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

  const {
    subtotal,
    baseFoodDeliveryFee,
    foodHotelChangeFee,
    foodHotelChangeFeeRate,
    foodExtraItemCharge,
    selectedHotelsCount,
    deliveryFee,
    platformFee,
    promoDiscount,
    total,
    activeSurcharges
  } = getCalculations(routeInfo?.distanceKm);

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

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setEditingAddressInitial(null);
    setShowLocationPicker(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr._id);
    setEditingAddressInitial(addr);
    setShowLocationPicker(true);
  };

  const handleLocationPickerConfirm = async (addrDetails) => {
    setIsAddressSaving(true);
    
    const normalizedAddr = {
      houseNo: addrDetails.houseNo || '',
      street: addrDetails.street || '',
      area: addrDetails.area || '',
      city: addrDetails.city || '',
      state: addrDetails.state || '',
      zip: addrDetails.zip || '',
      lat: addrDetails.lat,
      lng: addrDetails.lng,
      formattedAddress: addrDetails.formattedAddress || '',
      placeId: addrDetails.placeId || ''
    };

    try {
      if (editingAddressId) {
        if (useAuthStore.getState().editAddress) {
          await useAuthStore.getState().editAddress(editingAddressId, normalizedAddr);
        } else {
          await useAuthStore.getState().deleteAddress(editingAddressId);
          await useAuthStore.getState().addAddress({ ...normalizedAddr, isDefault: true });
        }
        showToast('Address updated successfully', 'success');
      } else {
        const res = await useAuthStore.getState().addAddress({ ...normalizedAddr, isDefault: true });
        if (res.success) {
          showToast('Address added successfully', 'success');
        } else {
          showToast(res.message || 'Failed to add address', 'error');
        }
      }
      setShowLocationPicker(false);
    } catch (err) {
      showToast(err.message || 'Error saving address', 'error');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handlePlaceOrderSubmit = async () => {
    setErrorMsg('');
    if (!activeAddresses[selectedAddressIndex]) {
      return setErrorMsg('Please select or add a delivery address.');
    }
    
    const serviceRadiusKm = platformSettings?.globalServiceRadiusKm || 5;
    if (routeInfo?.distanceKm != null && routeInfo.distanceKm > serviceRadiusKm) {
      return setErrorMsg(`Sorry, this restaurant is outside our current ${serviceRadiusKm} KM delivery service area.`);
    }

    const selectedAddress = activeAddresses[selectedAddressIndex];
    if (typeof selectedAddress.lat !== 'number' || typeof selectedAddress.lng !== 'number' || isNaN(selectedAddress.lat) || isNaN(selectedAddress.lng)) {
      return setErrorMsg('Selected address lacks a precise location. Please delete it and add a new one with GPS.');
    }

    // Category Service Availability Check
    try {
      const catRes = await fetch(`${API_BASE}/restaurants/category-services`);
      if (catRes.ok) {
        const catList = await catRes.json();
        for (const itm of items) {
          const itmCat = (itm.category || '').toLowerCase();
          let cId = 'food';
          if (itmCat.includes('cake') || itmCat.includes('puff') || itmCat.includes('sweet') || itmCat.includes('lassi') || itmCat.includes('ice cream') || itmCat.includes('golisoda') || itmCat.includes('milk shake') || itmCat.includes('beverage') || itmCat.includes('cool') || itmCat.includes('bakery')) {
            cId = 'bakery_beverages';
          } else if (itmCat.includes('atta') || itmCat.includes('oil') || itmCat.includes('dairy') || itmCat.includes('grocery') || itmCat.includes('masala')) {
            cId = 'grocery';
          } else if (itmCat.includes('chicken') || itmCat.includes('mutton') || itmCat.includes('fish') || itmCat.includes('meat') || itmCat.includes('prawn') || itmCat.includes('egg') || itmCat.includes('seafood')) {
            cId = 'meat';
          } else if (itmCat.includes('vegetable') || itmCat.includes('fruit') || itmCat.includes('palak') || itmCat.includes('spinach') || itmCat.includes('organic')) {
            cId = 'veg_fruits';
          }
          const found = catList.find(c => c.id === cId);
          if (found && found.isEnabled === false) {
            return setErrorMsg("We are not providing this service currently.");
          }
        }
      }
    } catch (e) {
      // fallback to backend enforcement
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
        addressId: activeAddress._id,
        restaurantId: items[0]?.restaurantId || restaurant?._id,
        paymentMethod,
        promoCode: promoCode || '',
        instruction: deliveryInstructions
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

      clearCart();
      playOrderPlacedSound();
      navigate(`/order-tracking/${data._id}`);

    } catch (err) {
      setErrorMsg(err.message || 'Server error occurred during checkout');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      <div className="border-b border-line pb-4">
        <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
          {t('checkout.title', 'Secure Checkout')}
        </h1>
        <p className="text-xs text-muted font-medium">{t('checkout.subtitle', 'Verify your address and choose a payment method')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
          
          <section className="bg-surface rounded-2xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm md:text-base text-main flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>1. {t('checkout.deliveryAddress', 'Delivery Address')}</span>
            </h3>

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
                        {(!addr.lat || !addr.lng) && (
                          <div className="mt-2.5 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center justify-between text-[11px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" />
                              <span>Missing exact location coordinates</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditAddress(addr);
                              }}
                              className="bg-white text-red-700 px-2.5 py-1 rounded-md border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              Edit Location
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm('Delete this address?')) {
                           deleteAddress(addr._id);
                           if(selectedAddressIndex === idx) setSelectedAddressIndex(0);
                        }
                      }}
                      className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 flex gap-2.5 text-primary text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="font-semibold">{t('profile.noAddresses', 'No saved addresses found. Please add a shipping address to place your order.')}</p>
              </div>
            )}

            {/* Address Toggle Form */}
            <button
              onClick={handleOpenAddAddress}
              className="text-[13px] font-extrabold text-violet-600 hover:text-violet-700 flex items-center justify-start gap-1 cursor-pointer w-max px-1 bg-violet-50 hover:bg-violet-100 py-2.5 px-4 rounded-xl transition-colors"
            >
              + {t('profile.addNewAddress', 'Add New Delivery Location')}
            </button>
          </section>

          {/* Location Picker Modal */}
          <LocationPickerModal
            isOpen={showLocationPicker}
            onClose={() => setShowLocationPicker(false)}
            onConfirm={handleLocationPickerConfirm}
            initialAddress={editingAddressInitial}
            title={editingAddressId ? 'Update Delivery Location' : 'Set Delivery Location'}
          />

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
              <span>2. {t('checkout.paymentMethod', 'Payment Method')}</span>
            </h3>

            <div className="p-4 rounded-xl border border-primary bg-violet-50/20 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold text-main uppercase flex items-center gap-2">
                  💵 {t('checkout.cod', 'Cash On Delivery (COD)')}
                </span>
                <span className="text-[11px] text-muted font-medium">
                  {t('checkout.codDesc', 'Pay cash at your doorstep when your food arrives')}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
          </section>

        </div>

        {/* Order billing panel */}
        <div className="flex flex-col gap-4 sticky top-24">
          <div className="bg-surface rounded-2xl p-4 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm text-main border-b border-line pb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-4.5 h-4.5 text-muted" />
              <span>{t('checkout.orderSummary', 'Order Summary')}</span>
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
                <span>{t('cart.itemSubtotal', 'Subtotal')}</span>
                <span className="text-main font-bold">₹{subtotal}</span>
              </div>
              {selectedHotelsCount >= 1 && (
                <div className="flex items-center justify-between">
                  <span>First Hotel Delivery Fee</span>
                  <span className="text-main font-bold">+₹{baseFoodDeliveryFee}</span>
                </div>
              )}
              {selectedHotelsCount >= 2 && (
                <div className="flex items-center justify-between">
                  <span>Second Hotel Delivery Fee</span>
                  <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                </div>
              )}
              {selectedHotelsCount >= 3 && (
                <div className="flex items-center justify-between">
                  <span>Third Hotel Delivery Fee</span>
                  <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                </div>
              )}
              {selectedHotelsCount > 3 && Array.from({ length: selectedHotelsCount - 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>Hotel {idx + 4} Delivery Fee</span>
                  <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                </div>
              ))}
              {foodExtraItemCharge > 0 && (
                <div className="flex items-center justify-between">
                  <span>Food Extra Item Charge</span>
                  <span className="text-main font-bold">+₹{foodExtraItemCharge}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-b border-line py-1.5 font-semibold">
                <span>Total Food Delivery Fees</span>
                <span className="text-main font-bold">₹{deliveryFee}</span>
              </div>
              {activeSurcharges && activeSurcharges.map((sc, idx) => (
                <div key={idx} className="flex items-center justify-between font-semibold">
                  <span>{sc.name}</span>
                  <span className="text-main font-bold">+₹{sc.fee}</span>
                </div>
              ))}
              {platformFee > 0 && (
                <div className="flex items-center justify-between font-medium">
                  <span>{t('cart.platformFee', 'Platform Fee')}</span>
                  <span className="text-main font-bold">+₹{platformFee}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex items-center justify-between text-green-700 font-bold bg-green-50 p-1.5 rounded-lg">
                  <span>{t('cart.promoDiscount', 'Promo Discount')}</span>
                  <span>-₹{promoDiscount}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg text-primary font-bold mt-1.5 pt-2 border-t border-line">
                <span>{t('checkout.totalPayable', 'Total to Pay')}</span>
                <span>₹{total}</span>
              </div>
            </div>

            {routeInfo && routeInfo.distanceKm > (platformSettings?.globalServiceRadiusKm || 5) && !errorMsg && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>Sorry, this restaurant is outside our current {platformSettings?.globalServiceRadiusKm || 5} KM delivery service area.</span>
              </div>
            )}

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
                  <span>{t('checkout.processing', 'Processing Order...')}</span>
                </>
              ) : (
                <>
                  <span>{t('checkout.placeOrder', 'Place Order')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
