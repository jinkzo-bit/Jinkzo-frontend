import React from 'react';

/**
 * Segmented control for Food dietary preferences:
 * [ ALL ] [ 🟢 VEG ] [ 🔴 NON-VEG ]
 *
 * Renders ONLY for the Food category.
 */
export default function FoodDietaryFilter({ value = 'all', onChange, className = '' }) {
  return (
    <div
      role="group"
      aria-label="Dietary filter"
      className={`inline-flex items-center p-1 rounded-2xl bg-base dark:bg-[#1C2233] border border-line shadow-2xs select-none ${className}`}
    >
      {/* ALL option */}
      <button
        type="button"
        onClick={() => onChange('all')}
        aria-pressed={value === 'all'}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer flex items-center justify-center ${
          value === 'all'
            ? 'bg-[#7C3AED] text-white font-black shadow-xs'
            : 'text-muted hover:text-main font-bold hover:bg-surface/50'
        }`}
      >
        <span>ALL</span>
      </button>

      {/* VEG option */}
      <button
        type="button"
        onClick={() => onChange('veg')}
        aria-pressed={value === 'veg'}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 justify-center ${
          value === 'veg'
            ? 'bg-emerald-600 text-white font-black shadow-xs'
            : 'text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            value === 'veg' ? 'bg-white ring-2 ring-emerald-400/50' : 'bg-emerald-500'
          }`}
        />
        <span>VEG</span>
      </button>

      {/* NON-VEG option */}
      <button
        type="button"
        onClick={() => onChange('non-veg')}
        aria-pressed={value === 'non-veg'}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 justify-center ${
          value === 'non-veg'
            ? 'bg-rose-600 text-white font-black shadow-xs'
            : 'text-rose-700 dark:text-rose-400 font-bold hover:bg-rose-50/70 dark:hover:bg-rose-950/40'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            value === 'non-veg' ? 'bg-white ring-2 ring-rose-400/50' : 'bg-rose-500'
          }`}
        />
        <span>NON-VEG</span>
      </button>
    </div>
  );
}
