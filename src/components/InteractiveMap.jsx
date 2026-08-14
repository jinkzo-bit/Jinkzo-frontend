import React, { useEffect, useState } from 'react';
import GoogleMapContainer from './GoogleMapContainer';

export default function InteractiveMap({ 
  status, 
  restaurantAddress = '', 
  restaurantLat = null,
  restaurantLng = null,
  customerAddress = '',
  customerLat = null,
  customerLng = null,
  deliveryMethod = 'Standard',
  orderId = null,
  onRouteInfo = null,
  // Ride-specific props
  isRide = false,
  ridePickupLat = null,
  ridePickupLng = null,
  rideDropLat = null,
  rideDropLng = null,
}) {
  const [progress, setProgress] = useState(0);
  const [showTraffic, setShowTraffic] = useState(false);

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
    <div className="relative w-full h-[280px] bg-sky-50 rounded-2xl overflow-hidden border border-sky-100/50 shadow-inner">
      <GoogleMapContainer 
        mode="tracking"
        restaurantAddress={restaurantAddress}
        restaurantLat={restaurantLat}
        restaurantLng={restaurantLng}
        customerAddress={customerAddress}
        customerLat={customerLat}
        customerLng={customerLng}
        status={status}
        progress={progress}
        deliveryMethod={deliveryMethod}
        orderId={orderId}
        onRouteInfo={onRouteInfo}
        showTraffic={showTraffic}
        isRide={isRide}
        ridePickupLat={ridePickupLat}
        ridePickupLng={ridePickupLng}
        rideDropLat={rideDropLat}
        rideDropLng={rideDropLng}
      />
      
      {/* Real-time Status Overlay Badge */}
      <div className="absolute bottom-4 left-4 bg-surface/95 px-3 py-1.5 rounded-full shadow-md text-xs font-semibold flex items-center gap-1.5 border border-line glass">
        <span className={`w-2.5 h-2.5 rounded-full ${status === 'Delivered' ? 'bg-green-500' : 'bg-primary animate-ping'}`} />
        <span className="text-main">Rider Position: {Math.round(progress * 100)}%</span>
      </div>
      
      {/* Traffic Toggle */}
      <button
        onClick={() => setShowTraffic(prev => !prev)}
        className="absolute bottom-4 right-4 bg-surface/95 backdrop-blur-sm border border-line px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-surface transition-colors cursor-pointer"
        title="Toggle traffic layer"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${showTraffic ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-main">Traffic</span>
      </button>
    </div>
  );
}
