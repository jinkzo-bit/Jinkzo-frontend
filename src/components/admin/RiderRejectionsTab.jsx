import React, { useState, useEffect } from 'react';
import { XCircle, CheckCircle, RefreshCw, UserCheck, AlertCircle, Clock, MapPin, DollarSign, Filter, Eye } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function RiderRejectionsTab({ token, onViewOrder }) {
  const [rejectionsData, setRejectionsData] = useState({ pendingCount: 0, totalCount: 0, rejections: [], orders: [] });
  const [ridersList, setRidersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Pending'); // 'All' | 'Pending' | 'Handled'
  const [selectedReassignment, setSelectedReassignment] = useState(null); // rejection item object
  const [targetRiderId, setTargetRiderId] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchRejections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/rider-rejections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRejectionsData(data);
      }
    } catch (err) {
      console.error('Error fetching rider rejections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users?role=delivery`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRidersList(Array.isArray(data) ? data : (data.users || []));
      }
    } catch (err) {
      console.error('Error fetching riders:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRejections();
      fetchRiders();
    }
  }, [token]);

  const handleExecuteAction = async (orderId, rejectionId, action, extraPayload = {}) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/rejection-action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          rejectionId,
          ...extraPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedReassignment(null);
        setTargetRiderId('');
        fetchRejections();
        alert(data.message || `Action '${action}' completed successfully.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to execute action: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error executing action: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredRejections = (rejectionsData.rejections || []).filter(item => {
    if (filterStatus === 'Pending') return item.status === 'Pending_Admin_Review';
    if (filterStatus === 'Handled') return item.status !== 'Pending_Admin_Review';
    return true;
  });

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Pending Count Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-line p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-main flex items-center gap-2">
              Rider Order Rejections
              {rejectionsData.pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">
                  {rejectionsData.pendingCount} Pending Action
                </span>
              )}
            </h2>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Review and manually resolve delivery requests rejected by riders.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRejections}
          disabled={isLoading}
          className="bg-base hover:bg-line-strong text-main text-xs font-bold px-4 py-2.5 rounded-xl border border-line flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        {['Pending', 'Handled', 'All'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === tab ? 'bg-primary text-white shadow-xs' : 'text-muted hover:bg-base hover:text-main'
            }`}
          >
            {tab === 'Pending' ? `Pending (${rejectionsData.pendingCount})` : tab === 'Handled' ? 'Handled History' : `All Records (${rejectionsData.totalCount})`}
          </button>
        ))}
      </div>

      {/* Rejections Queue List */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl border border-line p-12 text-center text-muted font-semibold text-xs animate-pulse">
          Loading rider rejection queue...
        </div>
      ) : filteredRejections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRejections.map(item => {
            const isPending = item.status === 'Pending_Admin_Review';

            return (
              <div
                key={item.rejectionId || item.orderId}
                className={`bg-surface border rounded-3xl p-5 shadow-2xs flex flex-col gap-4 justify-between transition-all ${
                  isPending ? 'border-red-200 bg-red-50/20' : 'border-line opacity-90'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Card Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-line text-[10px] font-bold text-muted">
                    <span className="font-mono text-main font-extrabold">ORDER #{String(item.orderId).substr(-8).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full font-black ${
                      isPending ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {isPending ? '🔴 Action Required' : `✓ ${item.status}`}
                    </span>
                  </div>

                  {/* Order & Rejection Details */}
                  <div className="flex flex-col gap-1.5 text-xs font-medium text-main">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Type:</span>
                      <span className="font-bold text-violet-700 capitalize">{item.orderType} Delivery</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Customer:</span>
                      <span className="font-bold">{item.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Order Total / Earning:</span>
                      <span className="font-bold text-green-700">₹{item.orderTotal} (Rider Earning: ₹{item.riderPayout})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-extrabold text-muted">Deliver To:</span>
                      <span className="font-bold text-muted truncate max-w-[200px]">{item.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Rejection Audit Box */}
                  <div className="bg-red-50/80 border border-red-150 rounded-2xl p-3 flex flex-col gap-1.5 text-red-900">
                    <div className="flex justify-between items-center text-[10px] font-extrabold">
                      <span>Rejected By: {item.riderName}</span>
                      <span className="text-[9px] font-semibold text-red-700">{formatDateTime(item.rejectedAt)}</span>
                    </div>
                    <div className="text-xs font-bold text-red-800">
                      Reason: <span className="underline">{item.reasonText || item.reasonCode}</span>
                    </div>
                    {item.note && (
                      <p className="text-[10px] italic text-red-700 font-medium">"{item.note}"</p>
                    )}
                  </div>

                  {!isPending && item.adminAction && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[10px] font-bold text-gray-700 flex justify-between items-center">
                      <span>Action Taken: {item.adminAction}</span>
                      <span className="text-[9px] text-muted">By {item.adminHandledBy || 'Admin'} • {formatDateTime(item.adminHandledAt)}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-line">
                  <button
                    onClick={() => {
                      const fullOrder = (rejectionsData.orders || []).find(o => String(o._id) === String(item.orderId));
                      if (onViewOrder && fullOrder) {
                        onViewOrder(fullOrder);
                      }
                    }}
                    className="w-full py-2 px-3 border border-line-strong hover:bg-base text-main text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>View Order</span>
                  </button>

                  {isPending && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleExecuteAction(item.orderId, item.rejectionId, 'return_to_pool')}
                          disabled={isSubmittingAction}
                          className="py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Return to Pool</span>
                        </button>
                        <button
                          onClick={() => setSelectedReassignment(item)}
                          disabled={isSubmittingAction}
                          className="py-2.5 px-3 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Review & Reassign</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleExecuteAction(item.orderId, item.rejectionId, 'mark_handled')}
                          disabled={isSubmittingAction}
                          className="py-2 px-3 border border-line-strong text-muted hover:text-main text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Handled</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this order using the official cancellation workflow?')) {
                              handleExecuteAction(item.orderId, item.rejectionId, 'cancel');
                            }
                          }}
                          disabled={isSubmittingAction}
                          className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface rounded-3xl border border-line p-16 text-center flex flex-col items-center justify-center gap-2">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <h4 className="font-display font-extrabold text-sm text-main">No pending rider rejections</h4>
          <p className="text-xs text-muted font-semibold max-w-xs">All delivery rejection requests have been handled cleanly.</p>
        </div>
      )}

      {/* REASSIGNMENT MODAL */}
      {Boolean(selectedReassignment) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl border border-line p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex justify-between items-start border-b border-line pb-3">
              <div>
                <h4 className="font-display font-extrabold text-base text-main">Reassign Delivery Partner</h4>
                <p className="text-xs text-muted font-semibold mt-0.5">Order #{String(selectedReassignment.orderId).substr(-8).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setSelectedReassignment(null)}
                className="text-muted hover:text-main text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-main">Select Target Rider:</label>
              <select
                value={targetRiderId}
                onChange={(e) => setTargetRiderId(e.target.value)}
                className="bg-base border border-line-strong rounded-xl p-3 text-xs text-main font-semibold outline-none focus:border-primary"
              >
                <option value="">-- Choose Rider --</option>
                {ridersList.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.phone}) — {r.deliveryDetails?.isAvailable ? '🟢 Online' : '🔴 Offline'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReassignment(null)}
                className="flex-1 py-3 border border-line-strong text-xs font-bold text-main rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetRiderId || isSubmittingAction}
                onClick={() => handleExecuteAction(selectedReassignment.orderId, selectedReassignment.rejectionId, 'reassign', { targetRiderId })}
                className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {isSubmittingAction ? 'Reassigning...' : 'Assign Rider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
