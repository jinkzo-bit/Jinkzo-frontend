import React, { useState } from 'react';
import { Star, X, CheckCircle2, ShoppingCart, Beef, Apple, Croissant, Store } from 'lucide-react';
import { API_BASE } from '../config/api';

const getServiceConfig = (serviceType) => {
  switch (serviceType) {
    case 'grocery':
      return {
        label: 'GROCERY',
        icon: ShoppingCart,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        starColor: 'text-yellow-400 fill-yellow-400',
        prompt: 'How was your Grocery order?',
        placeholder: 'Tell us about product quality, packing, item accuracy, freshness...'
      };
    case 'meat':
      return {
        label: 'MEAT',
        icon: Beef,
        badgeBg: 'bg-red-50 text-red-700 border-red-200',
        starColor: 'text-yellow-400 fill-yellow-400',
        prompt: 'How was your Meat order?',
        placeholder: 'Tell us about freshness, quality, cleaning, cut, packaging...'
      };
    case 'veg_fruits':
      return {
        label: 'VEG & FRUITS',
        icon: Apple,
        badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
        starColor: 'text-yellow-400 fill-yellow-400',
        prompt: 'How were your fruits & vegetables?',
        placeholder: 'Tell us about freshness, quality, ripeness, packing...'
      };
    case 'bakery_beverages':
      return {
        label: 'BAKERY & BEVERAGES',
        icon: Croissant,
        badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
        starColor: 'text-yellow-400 fill-yellow-400',
        prompt: 'How were your Bakery items?',
        placeholder: 'Tell us about taste, freshness, quality, packaging...'
      };
    default:
      return {
        label: 'STORE',
        icon: Store,
        badgeBg: 'bg-primary/10 text-primary border-primary/20',
        starColor: 'text-yellow-400 fill-yellow-400',
        prompt: 'How was your order from this store?',
        placeholder: 'Tell us about product quality, packaging, and fulfillment...'
      };
  }
};

export default function StoreFeedbackModal({
  isOpen,
  onClose,
  order,
  source,
  token,
  onFeedbackSubmit,
  onSkip
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !order || !source) return null;

  const config = getServiceConfig(source.serviceType);
  const IconComponent = config.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating (1 to 5 stars).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/orders/${order._id}/store-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceId: String(source.sourceId),
          serviceType: source.serviceType,
          rating: Number(rating),
          comment: comment.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit store review');
      }

      setIsSuccess(true);
      if (onFeedbackSubmit) {
        onFeedbackSubmit(data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsSuccess(false);
    setComment('');
    setRating(5);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up relative">
        
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-violet-600 via-primary to-indigo-600 px-6 pt-6 pb-5 text-white flex justify-between items-start relative">
          <div className="flex flex-col gap-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/20 text-white`}>
                {config.label}
              </span>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
                Store Review
              </span>
            </div>
            <h3 className="font-display font-black text-lg text-white mt-1 leading-tight">
              Rate {source.sourceName}
            </h3>
            <p className="text-[11px] text-white/80 font-medium">
              Help other customers know about product quality & fulfillment
            </p>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-display font-extrabold text-base text-main">
                Feedback Submitted!
              </h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Thank you for rating <span className="font-bold text-main">{source.sourceName}</span>. Your review has been recorded.
              </p>
              <button
                type="button"
                onClick={handleModalClose}
                className="mt-4 w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Source info pill */}
              <div className="flex items-center gap-3 bg-base border border-line rounded-2xl p-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-primary flex items-center justify-center font-bold shrink-0 border border-violet-200">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase text-muted tracking-wider">
                    Fulfillment Partner
                  </span>
                  <h4 className="font-bold text-sm text-main truncate">
                    {source.sourceName}
                  </h4>
                  <span className="text-[10px] text-muted font-medium">
                    Order #{String(order._id).slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Star Rating Prompt */}
              <div className="flex flex-col items-center justify-center text-center gap-1.5 py-1">
                <label className="text-xs font-bold text-main">
                  {config.prompt}
                </label>
                
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? config.starColor
                              : 'text-gray-200 dark:text-gray-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] font-extrabold text-primary">
                  {rating === 5 && '★★★★★ Excellent'}
                  {rating === 4 && '★★★★☆ Very Good'}
                  {rating === 3 && '★★★☆☆ Average'}
                  {rating === 2 && '★★☆☆☆ Below Average'}
                  {rating === 1 && '★☆☆☆☆ Poor'}
                </span>
              </div>

              {/* Comment Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted tracking-wider">
                    Comments (Optional)
                  </label>
                  <span className="text-[10px] text-muted font-mono">
                    {comment.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={config.placeholder}
                  className="bg-base border border-line-strong rounded-xl p-3 text-xs text-main outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-2.5 text-xs text-red-600 font-medium text-center animate-shake">
                  {errorMessage}
                </div>
              )}

              {/* Actions: Skip & Submit */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onSkip) onSkip();
                    handleModalClose();
                  }}
                  className="flex-1 py-3 rounded-xl border border-line hover:bg-base text-xs font-bold text-muted transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
