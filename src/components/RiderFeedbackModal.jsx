import { API_BASE } from '../config/api';
import React, { useState, useEffect } from 'react';
import { X, Star, Heart, Sparkles, AlertCircle } from 'lucide-react';
import RazorpaySim from './RazorpaySim';

export default function RiderFeedbackModal({ isOpen, onClose, orderId, deliveryAgent, token, onFeedbackSubmit }) {
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
          tipAmount
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setSubmitSuccess(true);
        setTimeout(() => {
          onFeedbackSubmit(updatedOrder);
          onClose();
        }, 1800);
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

    const tipAmount = getTipAmount();

    // If tip is > 0, route through payment gateway first
    if (tipAmount > 0) {
      setPendingTipAmount(tipAmount);
      setShowPaymentGateway(true);
    } else {
      // No tip — submit directly
      await submitReview(0);
    }
  };

  // Called when RazorpaySim reports payment success
  const handlePaymentSuccess = async (paymentId) => {
    setShowPaymentGateway(false);
    console.log('Tip payment authorized:', paymentId);
    await submitReview(pendingTipAmount);
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
            <div className="p-10 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border-2 border-green-500 animate-bounce">
                <Sparkles className="w-10 h-10 text-green-600 fill-green-50/50" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">Feedback Submitted!</h3>
              <p className="text-xs text-muted font-semibold max-w-xs leading-relaxed">
                {pendingTipAmount > 0 
                  ? `Thank you! ₹${pendingTipAmount} tip has been credited to ${agentName}'s wallet.`
                  : `Thank you for sharing your experience with ${agentName}!`
                }
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Header / Rider details */}
              <div className="p-6 bg-violet-50/45 border-b border-line/50 flex flex-col items-center text-center gap-3">
                {deliveryAgent?.profileImage ? (
                  <img 
                    src={deliveryAgent.profileImage} 
                    alt={agentName} 
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
                    How was your delivery?
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-5.5">
                {/* Star Rating Section */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-450">
                    Rate your Rider
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

                {/* Tipping Section */}
                <div className="flex flex-col gap-2.5 border-t border-line pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-450 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-red-400 fill-red-100" />
                      <span>Support your Rider with a Tip</span>
                    </span>
                    {getTipAmount() > 0 && (
                      <span className="text-xs font-black text-primary animate-pulse bg-violet-50 px-2 py-0.5 rounded-md">
                        ₹{getTipAmount()}
                      </span>
                    )}
                  </div>
                  
                  {/* Tip buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {tipOptions.map((opt) => {
                      const isSelected = selectedTip === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleTipSelect(opt.value)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-surface text-gray-650 border-line-strong hover:bg-base'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Tip Input */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      pattern="\d*"
                      placeholder="Enter custom tip amount..."
                      value={customTip}
                      onChange={handleCustomTipChange}
                      className={`bg-base border rounded-xl px-3.5 py-2.5 text-xs text-main outline-none flex-grow leading-none transition-all ${
                        selectedTip === 'custom'
                          ? 'border-primary focus:bg-surface bg-surface ring-1 ring-primary'
                          : 'border-line-strong focus:border-primary focus:bg-surface'
                      }`}
                    />
                    {customTip && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTip('');
                          setSelectedTip(null);
                        }}
                        className="text-[10px] font-bold text-muted hover:text-muted px-2 py-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Compliments Comment box */}
                <div className="flex flex-col gap-1.5 border-t border-line pt-4">
                  <label htmlFor="riderComment" className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                    Rider feedback comment (optional)
                  </label>
                  <textarea
                    id="riderComment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what went well, e.g. Polite behavior, on-time delivery..."
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rating === 0 || isSubmitting}
                    className="flex-[2] bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : getTipAmount() > 0 ? `Pay ₹${getTipAmount()} & Submit` : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Razorpay Payment Gateway overlay (renders on top of the feedback modal) */}
      <RazorpaySim
        amount={pendingTipAmount}
        isOpen={showPaymentGateway}
        onClose={() => setShowPaymentGateway(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
