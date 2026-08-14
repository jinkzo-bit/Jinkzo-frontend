import { API_BASE } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Package, MapPin, ArrowRight, CreditCard, Sparkles, AlertCircle, Check, HelpCircle, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { getRoute } from '../services/routingService';
import LocationPickerModal from '../components/LocationPickerModal';

export default function RideBooking() {
  const { user, token } = useAuthStore();
  const { showToast, platformSettings, fetchPlatformSettings } = useCartStore();
  const navigate = useNavigate();
  const routeRequestIdRef = React.useRef(0);

  // Booking Type: 'ride' or 'parcel'
  const [serviceType, setServiceType] = useState('ride');
  const [vehicleType, setVehicleType] = useState('bike');

  const isParcelEnabled = platformSettings?.rideServices?.parcelEnabled !== false;

  useEffect(() => {
    if (serviceType === 'parcel' && !isParcelEnabled) {
      setServiceType('ride');
    }
  }, [serviceType, isParcelEnabled]);

  // Pickup Address
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupZip, setPickupZip] = useState('');
  const [pickupLat, setPickupLat] = useState(null);
  const [pickupLng, setPickupLng] = useState(null);
  const [pickupFormattedAddress, setPickupFormattedAddress] = useState('');

  // Destination Address
  const [destStreet, setDestStreet] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destState, setDestState] = useState('');
  const [destZip, setDestZip] = useState('');
  const [destLat, setDestLat] = useState(null);
  const [destLng, setDestLng] = useState(null);
  const [destFormattedAddress, setDestFormattedAddress] = useState('');

  // Active inputs
  // Modal states for Location Pickers
  const [isPickupPickerOpen, setIsPickupPickerOpen] = useState(false);
  const [isDestPickerOpen, setIsDestPickerOpen] = useState(false);

  // Calculations
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);

  // General State
  const [paymentMethod] = useState('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rideInstructions, setRideInstructions] = useState('');
  const [isRiderAvailable, setIsRiderAvailable] = useState(true);
  const [isCheckingRiders, setIsCheckingRiders] = useState(true);

  useEffect(() => {
    const checkRiderAvailability = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/riders/check?type=ride`);
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
  }, []);

  // Saved Addresses
  const savedAddresses = user?.addresses || [];

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  React.useEffect(() => {
    fetchPlatformSettings();
  }, []);

  React.useEffect(() => {
    const fetchRoute = async () => {
      if (pickupLat && pickupLng && destLat && destLng) {
        routeRequestIdRef.current += 1;
        const currentRequestId = routeRequestIdRef.current;
        
        setDistance(null); // indicating 'Calculating...'
        try {
          const res = await getRoute({ lat: pickupLat, lng: pickupLng }, { lat: destLat, lng: destLng });
          
          if (currentRequestId !== routeRequestIdRef.current) return;
          
          if (res && res.success && res.distanceKm != null) {
            const calculatedDistance = res.distanceKm;
            setDistance(calculatedDistance);
            
            // Fare preview calculation (matches backend logic)

            let computedFare;
            if (vehicleType === 'bike') {
              const p = platformSettings?.rideBikePricing || {
                tier1: { maxDistanceKm: 2, fee: 20 },
                tier2: { maxDistanceKm: 3.5, fee: 25 },
                tier3: { maxDistanceKm: 6, fee: 40 },
                tier4: { maxDistanceKm: 12, fee: 80 },
                tier5: { maxDistanceKm: 20, fee: 120 }
              };
              if (calculatedDistance <= p.tier1.maxDistanceKm) computedFare = p.tier1.fee;
              else if (calculatedDistance <= p.tier2.maxDistanceKm) computedFare = p.tier2.fee;
              else if (calculatedDistance <= p.tier3.maxDistanceKm) computedFare = p.tier3.fee;
              else if (calculatedDistance <= p.tier4.maxDistanceKm) computedFare = p.tier4.fee;
              else computedFare = p.tier5.fee;
            } else {
              const p = platformSettings?.rideAutoPricing || {
                tier1: { maxDistanceKm: 2, fee: 30 },
                tier2: { maxDistanceKm: 3.5, fee: 40 },
                tier3: { maxDistanceKm: 6, fee: 70 },
                tier4: { maxDistanceKm: 12, fee: 120 },
                tier5: { maxDistanceKm: 20, fee: 200 },
                tier6: { maxDistanceKm: 40, fee: 400 }
              };
              if (calculatedDistance <= p.tier1.maxDistanceKm) computedFare = p.tier1.fee;
              else if (calculatedDistance <= p.tier2.maxDistanceKm) computedFare = p.tier2.fee;
              else if (calculatedDistance <= p.tier3.maxDistanceKm) computedFare = p.tier3.fee;
              else if (calculatedDistance <= p.tier4.maxDistanceKm) computedFare = p.tier4.fee;
              else if (calculatedDistance <= p.tier5.maxDistanceKm) computedFare = p.tier5.fee;
              else computedFare = p.tier6.fee;
            }
            let rainSurcharge = 0;
            if (platformSettings?.surcharges?.rain?.enabled) {
              rainSurcharge = platformSettings.surcharges.rain.fee || 10;
            }
            setFare(computedFare + rainSurcharge);
            setErrorMsg('');
          } else {
            if (currentRequestId !== routeRequestIdRef.current) return;
            setDistance('error');
            setFare(0);
            setErrorMsg("Unable to calculate route. Please try selecting the locations again.");
          }
        } catch (err) {
          if (currentRequestId !== routeRequestIdRef.current) return;
          console.error("Failed to preview route distance", err);
          setDistance('error');
          setFare(0);
          setErrorMsg(err.message || "Unable to calculate route. Please try selecting the locations again.");
        }
      } else {
        setDistance(0);
        setFare(0);
        setErrorMsg('');
      }
    };
    fetchRoute();
  }, [pickupLat, pickupLng, destLat, destLng, vehicleType]);

  const selectSavedAddress = (addr, type) => {
    if (type === 'pickup') {
      setPickupStreet(addr.street || '');
      setPickupCity(addr.city || '');
      setPickupState(addr.state || '');
      setPickupZip(addr.zip || '');
      setPickupLat(addr.lat ?? null);
      setPickupLng(addr.lng ?? null);
    } else {
      setDestStreet(addr.street || '');
      setDestCity(addr.city || '');
      setDestState(addr.state || '');
      setDestZip(addr.zip || '');
      setDestLat(addr.lat ?? null);
      setDestLng(addr.lng ?? null);
    }
  };

  const handleBookNow = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pickupLat || !pickupLng) {
      setErrorMsg('Please select your Pickup Location on the map.');
      return;
    }
    if (!destLat || !destLng) {
      setErrorMsg('Please select your Destination Location on the map.');
      return;
    }

    setIsSubmitting(true);
    try {
      const checkRes = await fetch(`${API_BASE}/orders/riders/check?type=ride`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        setIsRiderAvailable(checkData.available);
        if (!checkData.available) {
          setErrorMsg("Riders or delivery partners not available. We can't confirm your order.");
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.error('Rider availability check error:', err);
    }

    try {
      const payload = {
        orderType: serviceType, // Send actual service type ('ride' or 'parcel')
        vehicleType: vehicleType,
        pickupAddress: {
          street: pickupStreet,
          city: pickupCity,
          state: pickupState || 'Andhra Pradesh',
          zip: pickupZip,
          lat: pickupLat,
          lng: pickupLng,
        },
        address: {
          street: destStreet,
          city: destCity,
          state: destState || 'Andhra Pradesh',
          zip: destZip,
          lat: destLat,
          lng: destLng,
        },
        paymentMethod,
        instruction: rideInstructions
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to place booking');
      }

      showToast(`${serviceType === 'ride' ? 'Ride booked' : 'Parcel dispatched'} successfully!`, 'success');
      navigate(`/order-tracking/${data._id}`);

    } catch (err) {
      setErrorMsg(err.message || 'Server error occurred during booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-400 text-black rounded-2xl shadow-sm">
            <Bike className="w-8 h-8 fill-black" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-main leading-tight">
              Ride Instant Taxi & Parcels
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Book a Captain or dispatch packages across the city in minutes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted font-bold uppercase">Pricing:</span>
          <span className="text-[10px] font-extrabold bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-full">
            Starting at ₹20
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: Form options */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {!isRiderAvailable && !isCheckingRiders && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex gap-3 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <div>
                <h4 className="font-bold text-red-805">Service Suspended</h4>
                <p className="mt-0.5 leading-relaxed font-semibold text-red-700">Riders or delivery partners are currently not available. We cannot confirm or process your booking.</p>
              </div>
            </div>
          )}
          
          {/* Service toggle selection */}
          <div className={`grid ${isParcelEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-4 bg-surface p-2 rounded-2xl border border-line shadow-2xs`}>
            <button
              onClick={() => setServiceType('ride')}
              className={`p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-xs cursor-pointer transition-all ${
                serviceType === 'ride' 
                  ? 'bg-yellow-400 text-black shadow-xs' 
                  : 'text-muted hover:bg-base'
              }`}
            >
              <Bike className="w-5 h-5" />
              <span>Book a Bike Taxi</span>
            </button>
            {isParcelEnabled && (
              <button
                onClick={() => setServiceType('parcel')}
                className={`p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-xs cursor-pointer transition-all ${
                  serviceType === 'parcel' 
                    ? 'bg-yellow-400 text-black shadow-xs' 
                    : 'text-muted hover:bg-base'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>Send a Local Parcel</span>
              </button>
            )}
          </div>

          {/* Form parameters */}
          <div className="bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-5">
            <h3 className="font-display font-extrabold text-sm text-main uppercase tracking-wider pb-1 border-b border-line flex items-center gap-1.5">
              <MapPin className="w-4.5 h-4.5 text-primary" />
              <span>Route & Addresses</span>
            </h3>

            {/* Address fields inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup column */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-main flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Pickup Location</span>
                  </h4>
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setIsPickupPickerOpen(true)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-3 text-xs text-main cursor-pointer hover:border-violet-400 transition-colors"
                  >
                    {pickupLat && pickupLng ? (
                      <div className="flex flex-col">
                        <span className="font-bold truncate">{pickupStreet || 'Location selected'}</span>
                        <span className="text-[10px] text-muted truncate">{pickupFormattedAddress || `${pickupCity} ${pickupZip}`}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted font-semibold">
                        <MapPin className="w-4 h-4 text-primary" />
                        Set Pickup Location on Map
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <span className="text-[9px] text-muted font-extrabold uppercase">Use Saved Address</span>
                    <div className="flex flex-wrap gap-1.5">
                      {savedAddresses.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSavedAddress(addr, 'pickup')}
                          className="text-[9px] bg-base hover:bg-gray-100 text-muted font-bold border border-gray-150 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          Home #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Destination column */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-main flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Destination (Achieving)</span>
                  </h4>
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setIsDestPickerOpen(true)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-3 text-xs text-main cursor-pointer hover:border-violet-400 transition-colors"
                  >
                    {destLat && destLng ? (
                      <div className="flex flex-col">
                        <span className="font-bold truncate">{destStreet || 'Location selected'}</span>
                        <span className="text-[10px] text-muted truncate">{destFormattedAddress || `${destCity} ${destZip}`}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted font-semibold">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Set Destination on Map
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <span className="text-[9px] text-muted font-extrabold uppercase">Use Saved Address</span>
                    <div className="flex flex-wrap gap-1.5">
                      {savedAddresses.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSavedAddress(addr, 'destination')}
                          className="text-[9px] bg-base hover:bg-gray-100 text-muted font-bold border border-gray-150 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          Home #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <LocationPickerModal
              isOpen={isPickupPickerOpen}
              onClose={() => setIsPickupPickerOpen(false)}
              title="Set Pickup Location"
              initialAddress={{ lat: pickupLat, lng: pickupLng, street: pickupStreet, city: pickupCity, zip: pickupZip, state: pickupState }}
              onConfirm={(addr) => {
                setPickupStreet(addr.street);
                setPickupCity(addr.city);
                setPickupState(addr.state);
                setPickupZip(addr.zip);
                setPickupLat(addr.lat);
                setPickupLng(addr.lng);
                setPickupFormattedAddress(addr.formattedAddress);
                setIsPickupPickerOpen(false);
              }}
            />

            <LocationPickerModal
              isOpen={isDestPickerOpen}
              onClose={() => setIsDestPickerOpen(false)}
              title="Set Destination Location"
              initialAddress={{ lat: destLat, lng: destLng, street: destStreet, city: destCity, zip: destZip, state: destState }}
              onConfirm={(addr) => {
                setDestStreet(addr.street);
                setDestCity(addr.city);
                setDestState(addr.state);
                setDestZip(addr.zip);
                setDestLat(addr.lat);
                setDestLng(addr.lng);
                setDestFormattedAddress(addr.formattedAddress);
                setIsDestPickerOpen(false);
              }}
            />
          </div>

          {/* Payment selection */}
          <div className="bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-extrabold text-sm text-main uppercase tracking-wider pb-1 border-b border-line flex items-center gap-1.5">
              <CreditCard className="w-4.5 h-4.5 text-primary" />
              <span>Payment Method</span>
            </h3>
            <div className="p-3.5 rounded-xl border border-yellow-400 bg-yellow-500/5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-main uppercase">💵 Cash On Delivery (COD)</span>
                <span className="text-[9px] text-muted font-bold">Pay cash to captain on arrival</span>
              </div>
              <div className="w-4 h-4 rounded-full border border-yellow-500 bg-yellow-500 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-black fill-black" />
              </div>
            </div>
          </div>

          {/* Captain Instructions */}
          <div className="bg-surface rounded-3xl p-6 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-semibold text-sm text-main uppercase tracking-wider pb-1 border-b border-line flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-primary" />
              <span>Captain Instructions (Optional)</span>
            </h3>
            <input
              type="text"
              placeholder="e.g. Wait at gate, call when you arrive"
              value={rideInstructions}
              onChange={(e) => setRideInstructions(e.target.value)}
              className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main placeholder:text-muted outline-none w-full"
            />
          </div>

        </div>

        {/* Right 1 Col: Billing calculations */}
        <div className="flex flex-col gap-4 sticky top-24">
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-5">
            <h3 className="font-display font-extrabold text-sm text-main border-b border-line pb-2 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500" />
              <span>Booking Invoice</span>
            </h3>

            {/* Vehicle Selection cards */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[9px] text-muted font-extrabold uppercase px-1">Select Ride Type</span>
              
              {platformSettings?.rideServices?.bikeEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setVehicleType('bike')}
                  className={`w-full p-3 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                    vehicleType === 'bike' ? 'border-yellow-400 bg-yellow-500/5 shadow-2xs' : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-yellow-100 text-yellow-700 flex items-center justify-center rounded-xl font-bold">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-main">Ride Bike</h4>
                      <p className="text-[9px] text-muted font-semibold">Swift bike taxi dispatch</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-gray-850">
                      ₹{distance > 0 ? (
                        distance <= (platformSettings?.rideBikePricing?.tier1?.maxDistanceKm || 2) ? (platformSettings?.rideBikePricing?.tier1?.fee || 20) :
                        distance <= (platformSettings?.rideBikePricing?.tier2?.maxDistanceKm || 3.5) ? (platformSettings?.rideBikePricing?.tier2?.fee || 25) :
                        distance <= (platformSettings?.rideBikePricing?.tier3?.maxDistanceKm || 6) ? (platformSettings?.rideBikePricing?.tier3?.fee || 40) :
                        distance <= (platformSettings?.rideBikePricing?.tier4?.maxDistanceKm || 12) ? (platformSettings?.rideBikePricing?.tier4?.fee || 80) :
                        (platformSettings?.rideBikePricing?.tier5?.fee || 120)
                      ) : '--'}
                    </span>
                    <p className="text-[8px] font-bold text-gray-450">Tiers: ₹{platformSettings?.rideBikePricing?.tier1?.fee || 20} / ₹{platformSettings?.rideBikePricing?.tier2?.fee || 25} / ₹{platformSettings?.rideBikePricing?.tier3?.fee || 40}...</p>
                  </div>
                </button>
              )}

              {platformSettings?.rideServices?.autoEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setVehicleType('auto')}
                  className={`w-full p-3 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                    vehicleType === 'auto' ? 'border-yellow-400 bg-yellow-500/5 shadow-2xs' : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-yellow-100 text-yellow-700 flex items-center justify-center rounded-xl font-bold">
                      <Bike className="w-5 h-5 rotate-12" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-main">Ride Auto</h4>
                      <p className="text-[9px] text-muted font-semibold">Spacious Auto-rickshaw</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-gray-850">
                      ₹{distance > 0 ? (
                        distance <= (platformSettings?.rideAutoPricing?.tier1?.maxDistanceKm || 2) ? (platformSettings?.rideAutoPricing?.tier1?.fee || 30) :
                        distance <= (platformSettings?.rideAutoPricing?.tier2?.maxDistanceKm || 3.5) ? (platformSettings?.rideAutoPricing?.tier2?.fee || 40) :
                        distance <= (platformSettings?.rideAutoPricing?.tier3?.maxDistanceKm || 6) ? (platformSettings?.rideAutoPricing?.tier3?.fee || 70) :
                        distance <= (platformSettings?.rideAutoPricing?.tier4?.maxDistanceKm || 12) ? (platformSettings?.rideAutoPricing?.tier4?.fee || 120) :
                        distance <= (platformSettings?.rideAutoPricing?.tier5?.maxDistanceKm || 20) ? (platformSettings?.rideAutoPricing?.tier5?.fee || 200) :
                        (platformSettings?.rideAutoPricing?.tier6?.fee || 400)
                      ) : '--'}
                    </span>
                    <p className="text-[8px] font-bold text-gray-450">Tiers: ₹{platformSettings?.rideAutoPricing?.tier1?.fee || 30} / ₹{platformSettings?.rideAutoPricing?.tier2?.fee || 40} / ₹{platformSettings?.rideAutoPricing?.tier3?.fee || 70}...</p>
                  </div>
                </button>
              )}

              {platformSettings?.rideServices?.bikeEnabled === false && platformSettings?.rideServices?.autoEnabled === false && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                  <p className="text-xs font-bold text-red-600">All ride services are currently disabled by Admin.</p>
                </div>
              )}
            </div>

            {/* Calculations breakdown */}
            <div className="flex flex-col gap-2.5 border-t border-b border-line py-3.5 text-xs text-gray-650 font-semibold">
              <div className="flex justify-between">
                <span>Service Requested</span>
                <span className="text-main font-bold capitalize">{serviceType === 'ride' ? 'Ride Taxi' : 'Local Parcel'}</span>
              </div>
              <div className="flex justify-between">
                <span>Calculated Distance</span>
                <span className="text-main font-bold">
                  {(!pickupLat || !destLat) ? 'Select locations' : (distance === null ? 'Calculating...' : distance === 'error' ? 'Error' : `${distance} km`)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Distance Pricing Fee</span>
                <span className="text-main font-bold">
                  {(!pickupLat || !destLat) ? 'Select locations' : (distance === null ? 'Calculating...' : distance === 'error' ? 'Error' : `₹${fare - (platformSettings?.surcharges?.rain?.enabled ? (platformSettings.surcharges.rain.fee || 10) : 0)}`)}
                </span>
              </div>
              {platformSettings?.surcharges?.rain?.enabled && (
                <div className="flex justify-between">
                  <span>Rain Charge</span>
                  <span className="text-red-500 font-bold">+₹{platformSettings.surcharges.rain.fee || 10}</span>
                </div>
              )}
            </div>

            {/* Total invoice block */}
            <div className="flex justify-between items-center text-sm font-bold text-main">
              <span>Total to Pay</span>
              <span className="text-primary text-base font-black">₹{fare.toFixed(2)}</span>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-650 text-[10px] font-bold p-2.5 rounded-xl flex gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Confirm Book */}
            <button
              onClick={handleBookNow}
              disabled={isSubmitting || fare === 0 || (!isRiderAvailable && !isCheckingRiders)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Assigning Captain...</span>
                </>
              ) : (
                <>
                  <span>Book Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Distance Price help tier box */}
            <div className="bg-yellow-50/50 border border-yellow-200/50 rounded-2xl p-3 flex gap-2 text-yellow-800 text-[10px]">
              <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">Price Rules Guide ({vehicleType === 'bike' ? 'Bike Taxi' : 'Auto Taxi'}):</p>
                <p className="mt-0.5 leading-relaxed font-semibold">
                  Distance is calculated dynamically between locations: 
                  {vehicleType === 'bike' ? (
                    ` 0–${platformSettings?.rideBikePricing?.tier1?.maxDistanceKm || 2}km: ₹${platformSettings?.rideBikePricing?.tier1?.fee || 20}, ` +
                    `>${platformSettings?.rideBikePricing?.tier1?.maxDistanceKm || 2}–${platformSettings?.rideBikePricing?.tier2?.maxDistanceKm || 3.5}km: ₹${platformSettings?.rideBikePricing?.tier2?.fee || 25}, ` +
                    `>${platformSettings?.rideBikePricing?.tier2?.maxDistanceKm || 3.5}–${platformSettings?.rideBikePricing?.tier3?.maxDistanceKm || 6}km: ₹${platformSettings?.rideBikePricing?.tier3?.fee || 40}, ` +
                    `>${platformSettings?.rideBikePricing?.tier3?.maxDistanceKm || 6}–${platformSettings?.rideBikePricing?.tier4?.maxDistanceKm || 12}km: ₹${platformSettings?.rideBikePricing?.tier4?.fee || 80}, ` +
                    `>${platformSettings?.rideBikePricing?.tier4?.maxDistanceKm || 12}km: capped at ₹${platformSettings?.rideBikePricing?.tier5?.fee || 120}.`
                  ) : (
                    ` 0–${platformSettings?.rideAutoPricing?.tier1?.maxDistanceKm || 2}km: ₹${platformSettings?.rideAutoPricing?.tier1?.fee || 30}, ` +
                    `>${platformSettings?.rideAutoPricing?.tier1?.maxDistanceKm || 2}–${platformSettings?.rideAutoPricing?.tier2?.maxDistanceKm || 3.5}km: ₹${platformSettings?.rideAutoPricing?.tier2?.fee || 40}, ` +
                    `>${platformSettings?.rideAutoPricing?.tier2?.maxDistanceKm || 3.5}–${platformSettings?.rideAutoPricing?.tier3?.maxDistanceKm || 6}km: ₹${platformSettings?.rideAutoPricing?.tier3?.fee || 70}, ` +
                    `>${platformSettings?.rideAutoPricing?.tier3?.maxDistanceKm || 6}–${platformSettings?.rideAutoPricing?.tier4?.maxDistanceKm || 12}km: ₹${platformSettings?.rideAutoPricing?.tier4?.fee || 120}, ` +
                    `>${platformSettings?.rideAutoPricing?.tier4?.maxDistanceKm || 12}km: up to ₹${platformSettings?.rideAutoPricing?.tier6?.fee || 400}.`
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
