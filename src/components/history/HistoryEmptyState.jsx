import React from 'react';
import { CalendarX2, RotateCcw } from 'lucide-react';

export default function HistoryEmptyState({
  dateLabel = 'selected period',
  onReset,
  message = 'No history found',
  description
}) {
  const displayDesc = description || (
    dateLabel && dateLabel !== 'All Time'
      ? `There are no records found for ${dateLabel}.`
      : 'You have no recorded history in this category yet.'
  );

  return (
    <div className="bg-surface border border-line rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 animate-fade-in my-2">
      <div className="w-14 h-14 rounded-3xl bg-base border border-line flex items-center justify-center text-muted mb-1 shadow-inner">
        <CalendarX2 className="w-7 h-7 stroke-[1.8]" />
      </div>

      <h4 className="font-display font-black text-base sm:text-lg text-main">
        {message}
      </h4>

      <p className="text-xs text-muted font-medium max-w-sm mx-auto leading-relaxed">
        {displayDesc}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-base hover:bg-surface border border-line text-xs font-bold text-primary hover:border-primary/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
