import { API_BASE } from '../config/api';
import React, { useState, useEffect } from 'react';
import { X, Star, Sparkles, AlertCircle } from 'lucide-react';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

export default function RiderFeedbackModal({ isOpen, onClose, orderId, deliveryAgent, token, onFeedbackSubmit, onProceedToRestaurant, isRide }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [comment, setComment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Payment gateway state
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pendingTipAmount, setPendingTipAmount] = useState(0);
  const updatedOrderRef = React.useRef(null);

  // Reset form state every time the modal opens (e.g. different order from Profile page)
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setSelectedTip(null);
      setCustomTip('');
      setComment('');
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setErrorMessage('');
      setShowPaymentGateway(false);
      setPendingTipAmount(0);
      updatedOrderRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tipOptions = [
    { value: 10, label: '₹10' },
    { value: 20, label: '₹20' },
    { value: 30, label: '₹30' },
    { value: 50, label: '₹50' }
  ];

  const handleTipSelect = (val) => {
    setSelectedTip(val);
    setCustomTip('');
  };

  const handleCustomTipChange = (e) => {
    const val = e.target.value;
    if (val === '' || (/^\d*$/.test(val) && parseInt(val) >= 0)) {
      setCustomTip(val);
      setSelectedTip('custom');
    }
  };

  const getTipAmount = () => {
    if (selectedTip === 'custom') {
      return parseFloat(customTip) || 0;
    }
    return selectedTip || 0;
  };

  // Submit the review to the backend API
  const submitReview = async (tipAmount) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/rider-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          comment,
          tipAmount: isRide ? 0 : tipAmount
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        updatedOrderRef.current = updatedOrder;
        setSubmitSuccess(true);
        if (onFeedbackSubmit) {
          onFeedbackSubmit(updatedOrder);
        }
        // If no onProceedToRestaurant, auto close in 1.8s
        if (!onProceedToRestaurant) {
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage('Please select a rating score (1-5 stars).');
      return;
    }

    // No tip — submit directly
    await submitReview(0);
  };

  const agentName = deliveryAgent?.name || 'Your Rider';
  const displayAvatar = agentName[0].toUpperCase();

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
        <div 
          className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up relative border border-line"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          {!submitSuccess && (
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 text-muted hover:text-muted p-1.5 hover:bg-gray-100 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {submitSuccess ? (
            <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
              <div className="w-18 h-18 bg-green-50 rounded-full flex items-center justify-center border-2 border-green-500 animate-bounce">
                <Sparkles className="w-9 h-9 text-green-600 fill-green-50/50" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">Feedback Submitted!</h3>
              <p className="text-xs text-muted font-semibold max-w-xs leading-relaxed">
                Thank you for sharing your experience with <strong>{agentName}</strong>!
              </p>

              {onProceedToRestaurant ? (
                <div className="flex items-center gap-2 w-full max-w-xs mt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-base hover:bg-gray-100 text-main text-xs font-bold py-3 rounded-xl border border-line cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onProceedToRestaurant();
                    }}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-sm transition-colors"
                  >
                    Rate Restaurant
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full max-w-xs bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-sm transition-colors mt-2"
                >
                  Done
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Header / Rider details */}
              <div className="p-6 bg-violet-50/45 border-b border-line/50 flex flex-col items-center text-center gap-3">
                {deliveryAgent?.profileImage ? (
                  <img
                    src={getImageUrl(deliveryAgent.profileImage, 'avatar')}
                    alt={agentName}
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm border-2 border-white"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-lg shadow-sm border-2 border-white">
                    {displayAvatar}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-extrabold text-base text-main">{agentName}</h3>
                  <p className="text-[10px] text-muted font-extrabold uppercase mt-0.5 tracking-wider">
                    {isRide ? 'How was your ride?' : 'How was your delivery?'}
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-5.5">
                {/* Star Rating Section */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-450">
                    {isRide ? 'Rate your Ride Captain' : 'Rate your Rider'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="cursor-pointer transition-transform active:scale-90 focus:outline-none"
                      >
                        <Star
                          className={`w-9 h-9 transition-all ${
                            star <= (hoverRating || rating)
                              ? 'text-yellow-400 fill-yellow-400 scale-110 drop-shadow-[0_2px_4px_rgba(250,204,21,0.2)]'
                              : 'text-gray-200 hover:text-yellow-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>


                {/* Compliments Comment box */}
                <div className="flex flex-col gap-1.5 border-t border-line pt-4">
                  <label htmlFor="riderComment" className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                    {isRide ? 'Tell us about your ride experience (optional)' : 'Rider feedback comment (optional)'}
                  </label>
                  <textarea
                    id="riderComment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={isRide ? "Safe driving, polite behaviour, on-time pickup, comfortable ride..." : "Tell us what went well, e.g. Polite behavior, on-time delivery..."}
                    className="bg-base border border-line-strong focus:border-primary focus:bg-surface rounded-xl px-3 py-2.5 text-xs text-main outline-none resize-none leading-relaxed transition-all"
                  />
                </div>

                {/* Error messages */}
                {errorMessage && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 border border-red-100 text-xs font-bold leading-relaxed">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-500 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-100 hover:skeleton text-gray-650 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    {isRide ? 'Skip' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={rating === 0 || isSubmitting}
                    className="flex-[2] bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : (!isRide && getTipAmount() > 0) ? `Pay ₹${getTipAmount()} & Submit` : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

    </>
  );
}
