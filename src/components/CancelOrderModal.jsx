import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Lock, ArrowRight, ShieldAlert, Clock } from 'lucide-react';
import { API_BASE } from '../config/api';

import { isOrderRiderClaimed } from '../utils/orderUtils';

export default function CancelOrderModal({ isOpen, onClose, order, token, onCancelSuccess }) {
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedStopIds, setSelectedStopIds] = useState([]);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const [preview, setPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isRide = order?.orderType === 'ride';

  // Authoritative Rider claim check
  const isRiderClaimed = isOrderRiderClaimed(order);

  // Reasons list
  const foodStoreReasons = [
    'Changed my mind',
    'Ordered by mistake',
    'Found a better option',
    'Delivery is taking too long',
    'Address/location issue',
    'Item no longer needed',
    'Other'
  ];

  const rideReasons = [
    'Changed my mind',
    'Pickup location issue',
    'No longer need the ride',
    'Taking too long to find a rider',
    'Other'
  ];

  const activeReasons = isRide ? rideReasons : foodStoreReasons;

  // Reset modal state upon open
  useEffect(() => {
    if (isOpen && order) {
      setSelectedItemIds([]);
      setSelectedStopIds([]);
      setReason('');
      setComment('');
      setErrorMessage('');
      setIsSubmitting(false);

      if (isRide) {
        setPreview({
          currentTotal: order.total || 0,
          cancelledAmount: order.total || 0,
          newTotal: 0
        });
      } else {
        setPreview({
          currentTotal: order.total || 0,
          cancelledAmount: 0,
          newTotal: order.total || 0
        });
      }
    }
  }, [isOpen, order?._id]);

  // Request server-side financial preview on selection change
  useEffect(() => {
    if (!isOpen || !order || isRide) return;

    if (selectedItemIds.length === 0 && selectedStopIds.length === 0) {
      setPreview({
        currentTotal: order.total || 0,
        cancelledAmount: 0,
        newTotal: order.total || 0,
        activeItemsCount: (order.items || []).filter(i => !i.isCancelled).length,
        cancelledItemsCount: 0
      });
      return;
    }

    let isMounted = true;
    setIsLoadingPreview(true);

    const fetchPreview = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${order._id}/customer-cancel-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            itemIds: selectedItemIds,
            stopIds: selectedStopIds
          })
        });

        const data = await res.json();
        if (isMounted) {
          if (res.ok) {
            setPreview(data);
          }
          setIsLoadingPreview(false);
        }
      } catch (err) {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    fetchPreview();

    return () => { isMounted = false; };
  }, [selectedItemIds, selectedStopIds, isOpen, order?._id]);

  if (!isOpen || !order) return null;

  const orderShortId = String(order._id).slice(-8).toUpperCase();

  // Helper to determine source eligibility
  const getSourceEligibility = (stop) => {
    const isFood = stop.sourceType === 'restaurant';
    if (isFood) {
      const isLocked = stop.status !== 'Pending';
      return {
        isLocked,
        lockReason: 'Restaurant has already accepted this food order.',
        helperText: 'Can cancel before restaurant accepts'
      };
    } else {
      return {
        isLocked: isRiderClaimed,
        lockReason: 'A delivery rider has already accepted this order.',
        helperText: 'Can cancel before rider accepts'
      };
    }
  };

  const stops = Array.isArray(order.pickupStops) && order.pickupStops.length > 0
    ? order.pickupStops
    : [
        {
          _id: order.restaurantId || 'main',
          sourceType: 'restaurant',
          sourceName: order.restaurant?.name || 'Restaurant',
          category: 'food',
          status: order.status === 'Placed' ? 'Pending' : 'Preparing'
        }
      ];

  const handleToggleStop = (stopId, stopItems, isLocked) => {
    if (isLocked) return;
    const isStopSelected = selectedStopIds.includes(stopId);
    const stopItemIds = stopItems.map(it => String(it._id || it.menuItemId));

    if (isStopSelected) {
      setSelectedStopIds(prev => prev.filter(id => id !== stopId));
      setSelectedItemIds(prev => prev.filter(id => !stopItemIds.includes(id)));
    } else {
      setSelectedStopIds(prev => [...prev, stopId]);
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...stopItemIds])));
    }
  };

  const handleToggleItem = (itemId, stopId, stopItems, isLocked) => {
    if (isLocked) return;
    const isSelected = selectedItemIds.includes(itemId);
    let newItems;
    if (isSelected) {
      newItems = selectedItemIds.filter(id => id !== itemId);
      setSelectedStopIds(prev => prev.filter(id => id !== stopId));
    } else {
      newItems = [...selectedItemIds, itemId];
      const stopItemIds = stopItems.map(it => String(it._id || it.menuItemId));
      const allSelected = stopItemIds.every(id => id === itemId || newItems.includes(id));
      if (allSelected) {
        setSelectedStopIds(prev => Array.from(new Set([...prev, stopId])));
      }
    }
    setSelectedItemIds(newItems);
  };

  const handleSubmitCancellation = async () => {
    if (!reason) {
      setErrorMessage('Please select a cancellation reason.');
      return;
    }

    if (!isRide && selectedItemIds.length === 0 && selectedStopIds.length === 0) {
      setErrorMessage('Please select at least one item or store to cancel.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        reason,
        comment,
        itemIds: isRide ? [] : selectedItemIds,
        stopIds: isRide ? [] : selectedStopIds
      };

      const res = await fetch(`${API_BASE}/orders/${order._id}/customer-cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Cancellation request failed.');
      }

      if (onCancelSuccess) {
        onCancelSuccess(data);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while processing cancellation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-base/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-main">
                {isRide ? 'Cancel Ride' : 'Cancel Order'}
              </h3>
              <span className="text-[10px] font-black tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                #{orderShortId}
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              {isRide ? 'Select a reason to cancel your ride' : 'Select the items or stores you want to cancel'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-base hover:bg-line border border-line flex items-center justify-center text-muted hover:text-main transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4.5 scrollbar-thin">

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800 font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Items / Sources Selection for Food/Store Orders */}
          {!isRide && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-1">
                Order Portions
              </span>

              <div className="flex flex-col gap-2.5">
                {stops.map((stop, sIdx) => {
                  const stopId = String(stop._id || stop.stopId || stop.sourceId || sIdx);
                  const isSupplier = stop.sourceType === 'supplier';
                  const categoryName = stop.category || (isSupplier ? 'store' : 'food');
                  
                  const stopItems = (order.items || []).filter(it => {
                    if (it.isCancelled) return false;
                    if (isSupplier) {
                      return String(it.supplierId || '') === String(stop.sourceId || '');
                    } else {
                      return String(it.restaurantId || order.restaurantId || '') === String(stop.sourceId || order.restaurantId || '');
                    }
                  });

                  if (stopItems.length === 0) return null;

                  const { isLocked, lockReason, helperText } = getSourceEligibility(stop);
                  const isStopSelected = selectedStopIds.includes(stopId) || (
                    stopItems.length > 0 && stopItems.every(it => selectedItemIds.includes(String(it._id || it.menuItemId)))
                  );

                  return (
                    <div
                      key={stopId}
                      className={`border rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all ${
                        isLocked
                          ? 'bg-base/40 border-line opacity-80'
                          : isStopSelected
                          ? 'bg-primary/5 border-primary/40 shadow-xs'
                          : 'bg-surface border-line hover:border-line-strong'
                      }`}
                    >
                      {/* Stop Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {!isLocked ? (
                            <input
                              type="checkbox"
                              checked={isStopSelected}
                              onChange={() => handleToggleStop(stopId, stopItems, isLocked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary border-line cursor-pointer"
                            />
                          ) : (
                            <span className="w-4 h-4 flex items-center justify-center text-muted">
                              <Lock className="w-3.5 h-3.5 text-muted" />
                            </span>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-main truncate flex items-center gap-1.5">
                              <span>{isSupplier ? '🏪' : '🍴'}</span>
                              <span className="truncate">{stop.sourceName || 'Pickup Point'}</span>
                            </h4>
                            <span className="text-[9px] uppercase font-black tracking-wider text-primary">
                              {categoryName}
                            </span>
                          </div>
                        </div>

                        {/* Status / Helper Badge */}
                        <div className="flex-shrink-0 text-right">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {helperText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Locked Explanation */}
                      {isLocked && (
                        <div className="bg-amber-50/70 border border-amber-150 rounded-xl p-2 text-[10px] text-amber-900 font-semibold flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span>🔒 Cannot cancel: {lockReason}</span>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="flex flex-col gap-1 pl-6 pt-1 border-t border-line/60">
                        {stopItems.map((it, itIdx) => {
                          const itemId = String(it._id || it.menuItemId);
                          const isItemSelected = selectedItemIds.includes(itemId);

                          return (
                            <div
                              key={itemId || itIdx}
                              onClick={() => !isLocked && handleToggleItem(itemId, stopId, stopItems, isLocked)}
                              className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                                !isLocked ? 'cursor-pointer hover:bg-base/80' : 'cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {!isLocked && (
                                  <input
                                    type="checkbox"
                                    checked={isItemSelected}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-line cursor-pointer"
                                  />
                                )}
                                <span className={`font-semibold text-main truncate ${isItemSelected ? 'line-through text-red-600' : ''}`}>
                                  {it.name} {it.unit ? `(${it.unit})` : ''}
                                </span>
                                <span className="text-[10px] font-bold text-muted">×{it.quantity || 1}</span>
                              </div>
                              <span className="font-extrabold text-main ml-2 flex-shrink-0">
                                ₹{(it.price || 0) * (it.quantity || 1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancellation Reason Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-1">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-base border border-line-strong rounded-2xl px-3.5 py-2.5 text-xs text-main outline-none focus:border-primary focus:bg-surface font-semibold"
            >
              <option value="">-- Choose a Reason --</option>
              {activeReasons.map((r, rIdx) => (
                <option key={rIdx} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Optional Comment */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                Additional Comments (Optional)
              </label>
              <span className="text-[9px] text-muted">{comment.length}/500</span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Provide any additional details..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-base border border-line-strong rounded-2xl p-3 text-xs text-main outline-none focus:border-primary focus:bg-surface font-medium resize-none"
            />
          </div>

          {/* Financial Summary Preview */}
          <div className="bg-base/70 border border-line rounded-2xl p-3.5 flex flex-col gap-2">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">
              Financial Summary
            </span>

            <div className="flex justify-between text-xs font-semibold text-muted">
              <span>Current Total:</span>
              <span className="font-bold text-main">₹{preview?.currentTotal ?? order.total}</span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-red-600">
              <span>Cancelled Items Amount:</span>
              <span className="font-bold">
                {isLoadingPreview ? '...' : `- ₹${preview?.cancelledAmount ?? 0}`}
              </span>
            </div>

            <div className="border-t border-line/80 pt-2 flex justify-between items-center text-sm font-black text-main">
              <span>New Total Payable:</span>
              <span className="text-primary text-base">
                {isLoadingPreview ? '...' : `₹${preview?.newTotal ?? order.total}`}
              </span>
            </div>

            {preview?.wouldCancelEntireOrder && (
              <div className="mt-1 bg-red-50 border border-red-200 text-red-800 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>All active items will be cancelled. Entire order will be terminated.</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-base/60 border-t border-line flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-line-strong hover:bg-base text-xs font-bold text-muted hover:text-main transition-colors cursor-pointer disabled:opacity-50"
          >
            Keep Order
          </button>

          <button
            type="button"
            onClick={handleSubmitCancellation}
            disabled={isSubmitting || !reason || (!isRide && selectedItemIds.length === 0 && selectedStopIds.length === 0)}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Clock className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
