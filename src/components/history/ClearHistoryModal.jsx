import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function ClearHistoryModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Clear All History?',
  description = 'This will permanently remove your history from this history view. This action cannot be undone.',
  confirmButtonText = 'Yes, Clear All'
}) {
  const [isClearing, setIsClearing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleClear = async () => {
    setErrorMessage('');
    setIsClearing(true);
    try {
      await onConfirm();
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to clear history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCloseAll = () => {
    setIsSuccess(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleCloseAll}
          disabled={isClearing}
          className="absolute top-4 right-4 text-muted hover:text-main p-1.5 rounded-xl hover:bg-base transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          /* ── SUCCESS STATE ── */
          <div className="flex flex-col items-center text-center py-4 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-main">History Cleared</h3>
              <p className="text-xs text-muted font-semibold mt-1 max-w-xs mx-auto">
                Your history has been successfully cleared from this view.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseAll}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer mt-2"
            >
              OK
            </button>
          </div>
        ) : (
          /* ── CONFIRMATION STATE ── */
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="font-display font-black text-lg text-main">{title}</h3>
              <p className="text-xs text-muted font-medium mt-1 leading-relaxed max-w-sm mx-auto">
                {description}
              </p>
            </div>

            {errorMessage && (
              <div className="w-full p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={handleCloseAll}
                disabled={isClearing}
                className="flex-1 py-3 border border-line hover:bg-base text-main text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isClearing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{confirmButtonText}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
