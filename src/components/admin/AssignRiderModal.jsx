import React, { useState } from 'react';
import { 
  X, 
  Bike, 
  AlertCircle, 
  UserCheck, 
  MapPin, 
  Phone, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency, formatDistance, formatRating } from '../../utils/orderUtils';

// Haversine distance helper
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function AssignRiderModal({
  isOpen,
  onClose,
  order,
  allUsers = [],
  liveRiderLocations = {},
  onAssign,
  isAssigning = false,
  error = ''
}) {
  const [selectedRider, setSelectedRider] = useState(null);
  const [showConfirmPreviousRejector, setShowConfirmPreviousRejector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !order) return null;

  // Pickup location for distance calculation
  const pickupLat = order.restaurantLocation?.lat ?? order.pickupLocation?.lat ?? (order.pickupStops?.[0]?.location?.lat);
  const pickupLng = order.restaurantLocation?.lng ?? order.pickupLocation?.lng ?? (order.pickupStops?.[0]?.location?.lng);

  // All approved delivery partners
  const approvedRiders = (allUsers || []).filter(
    u => u.role === 'delivery' && u.kycStatus === 'Approved' && !u.isBlocked
  );

  // Map riders with distance and previous rejection flags
  const mappedRiders = approvedRiders.map(rider => {
    const isOnline = Boolean(rider.deliveryDetails?.isAvailable);
    const coords = liveRiderLocations?.[rider._id] || rider.deliveryDetails?.currentLocation;
    const distanceKm = (pickupLat != null && pickupLng != null && coords?.lat != null && coords?.lng != null)
      ? calculateDistanceKm(pickupLat, pickupLng, coords.lat, coords.lng)
      : null;

    const previousRejection = (order.riderRejections || []).find(
      r => String(r.riderId) === String(rider._id)
    );

    return {
      ...rider,
      isOnline,
      distanceKm,
      previousRejection: previousRejection || null,
      isPreviouslyRejected: Boolean(previousRejection)
    };
  });

  // Filter by search query if any
  const filteredRiders = mappedRiders.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (r.name || '').toLowerCase().includes(q) || (r.phone || '').includes(q);
  });

  // Sort: non-rejecting riders first (online first, then distance), then previously rejecting riders
  const sortedRiders = [...filteredRiders].sort((a, b) => {
    if (a.isPreviouslyRejected && !b.isPreviouslyRejected) return 1;
    if (!a.isPreviouslyRejected && b.isPreviouslyRejected) return -1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return 0;
  });

  const alternateRiders = sortedRiders.filter(r => !r.isPreviouslyRejected);
  const hasAlternateRiders = alternateRiders.length > 0;

  const handleSelectRider = (rider) => {
    setSelectedRider(rider);
    if (rider.isPreviouslyRejected) {
      setShowConfirmPreviousRejector(true);
    } else {
      setShowConfirmPreviousRejector(false);
    }
  };

  const handleConfirmAssignment = () => {
    if (!selectedRider) return;
    onAssign(selectedRider);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-surface border border-line rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-main">
                ASSIGN RIDER
              </h3>
              <p className="text-[10px] text-muted font-bold font-mono">
                ORDER #{String(order._id || '').slice(-8).toUpperCase()} • {order.customerName || 'Customer'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted hover:text-main p-1.5 hover:bg-base rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex flex-col gap-4 text-xs">
          {/* Order Snapshot */}
          <div className="bg-base border border-line rounded-2xl p-3.5 flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between items-center font-bold">
              <span className="text-muted uppercase text-[9px]">Pickup:</span>
              <span className="text-main truncate max-w-[240px]">
                {order.restaurant?.name || order.pickupLocation?.formattedAddress || 'Pickup Point'}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className="text-muted uppercase text-[9px]">Drop:</span>
              <span className="text-main truncate max-w-[240px]">
                {order.customerLocation?.formattedAddress || order.address?.street || 'Customer Location'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-line/60 text-[10px] font-bold">
              <span className="text-muted">Total: {formatCurrency(order.total ?? order.fare)}</span>
              <span className="text-green-600 font-extrabold">Rider Earning: {formatCurrency(order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? 25)}</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Search rider by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-base border border-line-strong rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Previous Rejector Warning Sub-Screen */}
          {showConfirmPreviousRejector && selectedRider && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col gap-3 animate-scale-up">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-xs">
                  <h5 className="font-display font-black text-amber-900 uppercase text-xs">
                    Confirmation Required
                  </h5>
                  <p className="text-amber-800 font-semibold leading-relaxed">
                    This Rider (<strong>{selectedRider.name}</strong>) previously rejected this order.
                  </p>
                  <div className="bg-amber-100/60 p-2 rounded-xl text-[11px] text-amber-900">
                    <span className="font-extrabold">Reason:</span> {selectedRider.previousRejection?.reasonText || selectedRider.previousRejection?.reasonCode}
                    {selectedRider.previousRejection?.note && (
                      <span className="block italic text-amber-800 mt-0.5">
                        Note: "{selectedRider.previousRejection.note}"
                      </span>
                    )}
                  </div>
                  <p className="text-amber-950 font-bold mt-1">
                    Assign again anyway?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRider(null);
                    setShowConfirmPreviousRejector(false);
                  }}
                  className="px-3.5 py-2 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-100/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={isAssigning}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Anyway'}
                </button>
              </div>
            </div>
          )}

          {/* No alternate riders alert */}
          {!hasAlternateRiders && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>No alternate Rider currently available.</span>
              </div>
              <div className="text-[11px] text-amber-800 flex flex-col gap-1 pl-6">
                <span>• Keep order waiting for other riders to come online</span>
                <span>• Contact Rider manually by phone to coordinate pickup</span>
                <span>• Assign the same Rider explicitly below if agreed</span>
                <span>• Use standard Admin cancellation if delivery is not possible</span>
              </div>
            </div>
          )}

          {/* Eligible Riders List */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
              Approved Delivery Partners ({sortedRiders.length})
            </span>

            {sortedRiders.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">No approved riders found.</p>
            ) : (
              sortedRiders.map((rider) => {
                const isSelected = selectedRider?._id === rider._id;

                return (
                  <div
                    key={rider._id}
                    onClick={() => handleSelectRider(rider)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-primary bg-violet-50/30'
                        : rider.isPreviouslyRejected
                        ? 'border-line bg-gray-50/70 hover:bg-gray-100/70'
                        : 'border-line bg-surface hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rider.name ? rider.name[0].toUpperCase() : 'R'}
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-main truncate text-xs">{rider.name}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                            rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {rider.isOnline ? '● Online' : 'Offline'}
                          </span>
                          {rider.distanceKm != null && (
                            <span className="text-[9px] text-muted font-bold">
                              {formatDistance(rider.distanceKm)} away
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted font-semibold">
                          <span>{rider.phone}</span>
                          <span>★ {formatRating(rider.deliveryDetails?.rating || 5.0)}</span>
                        </div>
                        {rider.isPreviouslyRejected && (
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-red-600 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Previously Rejected: {rider.previousRejection?.reasonText || rider.previousRejection?.reasonCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRider(rider);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary text-white shadow-xs'
                          : rider.isPreviouslyRejected
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-base text-main border border-line hover:bg-surface'
                      }`}
                    >
                      {rider.isPreviouslyRejected ? 'Assign Anyway' : 'Select'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-surface flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer"
          >
            Cancel
          </button>
          {selectedRider && !selectedRider.isPreviouslyRejected && (
            <button
              type="button"
              onClick={handleConfirmAssignment}
              disabled={isAssigning}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isAssigning ? 'Assigning...' : `Assign to ${selectedRider.name}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
