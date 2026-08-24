import React, { useEffect, useState } from 'react';
import GoogleMapContainer from './GoogleMapContainer';

export default function InteractiveMap({ 
  status, 
  restaurantName = '',
  restaurantAddress = '', 
  restaurantLat = null,
  restaurantLng = null,
  customerName = '',
  customerAddress = '',
  customerLat = null,
  customerLng = null,
  deliveryMethod = 'Standard',
  orderId = null,
  onRouteInfo = null,
  supplierDeliveries = [],
  routeSequence = [],
  // Ride-specific props
  isRide = false,
  ridePickupLat = null,
  ridePickupLng = null,
  rideDropLat = null,
  rideDropLng = null,
  ridePickupAddress = '',
  rideDropAddress = '',
  riderLat = null,
  riderLng = null,
  gpsStatus = 'locating',
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Map order status to progress percentage
    let targetProgress = 0;
    if (status === 'Placed') targetProgress = 0.02;
    else if (status === 'Confirmed') targetProgress = 0.15;
    else if (status === 'Preparing') targetProgress = 0.40;
    else if (status === 'Out for Delivery') targetProgress = 0.70;
    else if (status === 'Delivered') targetProgress = 1.0;

    // Smooth transition logic
    let start = progress;
    const duration = 1800; // ms
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // Easing (easeOutQuad)
      const easedT = t * (2 - t);
      
      const currentProgress = start + (targetProgress - start) * easedT;
      setProgress(currentProgress);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [status]);

  return (
    <div className="relative w-full h-[380px] min-h-[380px] bg-sky-50 rounded-2xl overflow-hidden border border-sky-100/50 shadow-inner flex flex-col">
      <GoogleMapContainer 
        mode="tracking"
        restaurantName={restaurantName}
        restaurantAddress={restaurantAddress}
        restaurantLat={restaurantLat}
        restaurantLng={restaurantLng}
        customerName={customerName}
        customerAddress={customerAddress}
        customerLat={customerLat}
        customerLng={customerLng}
        status={status}
        progress={progress}
        deliveryMethod={deliveryMethod}
        orderId={orderId}
        onRouteInfo={onRouteInfo}
        supplierDeliveries={supplierDeliveries}
        routeSequence={routeSequence}
        isRide={isRide}
        ridePickupLat={ridePickupLat}
        ridePickupLng={ridePickupLng}
        rideDropLat={rideDropLat}
        rideDropLng={rideDropLng}
        ridePickupAddress={ridePickupAddress}
        rideDropAddress={rideDropAddress}
        riderLat={riderLat}
        riderLng={riderLng}
        gpsStatus={gpsStatus}
      />
    </div>
  );
}
