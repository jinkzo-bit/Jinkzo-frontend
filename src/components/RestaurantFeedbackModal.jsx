import React, { useState, useEffect } from 'react';
import { X, Star, Sparkles, AlertCircle, Utensils } from 'lucide-react';
import { API_BASE } from '../config/api';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

export default function RestaurantFeedbackModal({
  isOpen,
  onClose,
  order,
  restaurant,
  token,
  onFeedbackSubmit,
  onSkip
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form whenever modal opens or active restaurant changes
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, restaurant?.id]);

  if (!isOpen || !order || !restaurant) return null;

  const restaurantName = restaurant.name || 'Restaurant';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage('Please select a rating score (1-5 stars).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/orders/${order._id}/restaurant-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          rating,
          comment
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setSubmitSuccess(true);
        setTimeout(() => {
          if (onFeedbackSubmit) {
            onFeedbackSubmit(updatedOrder, restaurant.id);
          }
          onClose();
        }, 1500);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Could not submit your feedback. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(restaurant.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up relative border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!submitSuccess && (
          <button 
            onClick={handleSkip} 
            className="absolute top-4 right-4 text-muted hover:text-main p-1.5 hover:bg-base rounded-full transition-all cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {submitSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-950/40 rounded-full flex items-center justify-center border-2 border-green-500 animate-bounce">
              <Sparkles className="w-10 h-10 text-green-600 dark:text-green-400 fill-green-50/50" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-main">Feedback Submitted!</h3>
            <p className="text-xs text-muted font-semibold max-w-xs leading-relaxed">
              Thank you for sharing your feedback on <strong>{restaurantName}</strong>!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Header / Restaurant details */}
            <div className="p-6 bg-violet-50/45 dark:bg-violet-950/30 border-b border-line/50 flex flex-col items-center text-center gap-3">
              {restaurant.image ? (
                <img
                  src={getImageUrl(restaurant.image, 'restaurant')}
                  alt={restaurantName}
                  onError={(e) => handleImageError(e, 'restaurant')}
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-zinc-800"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-zinc-800">
                  <Utensils className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="font-display font-extrabold text-base text-main uppercase tracking-wide">
                  {restaurantName}
                </h3>
                <p className="text-[11px] text-muted font-extrabold mt-0.5 tracking-wider">
                  How was your food?
                </p>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Star Rating Section */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                  Rate your Food & Experience
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
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`w-9 h-9 transition-all ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400 scale-110 drop-shadow-[0_2px_4px_rgba(250,204,21,0.2)]'
                            : 'text-gray-200 dark:text-zinc-700 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions / Comment box */}
              <div className="flex flex-col gap-1.5 border-t border-line pt-4">
                <label htmlFor="restaurantComment" className="text-[10px] uppercase font-extrabold tracking-wider text-muted">
                  Tell us about food taste, quality, packaging... (optional)
                </label>
                <textarea
                  id="restaurantComment"
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the food taste, portion, temperature, and packaging?"
                  className="bg-base border border-line focus:border-primary focus:bg-surface rounded-xl px-3 py-2.5 text-xs text-main outline-none resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Error messages */}
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900 text-xs font-bold leading-relaxed">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="flex-1 bg-base hover:bg-gray-100 dark:hover:bg-zinc-800 text-muted hover:text-main text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="flex-[2] bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
