import React from 'react';

/**
 * VegBadge component displays a compact, accessible text badge for Veg / Non-Veg food items.
 * Green "Veg" or Red "Non Veg".
 */
export default function VegBadge({ isVeg, size = 'sm', className = '' }) {
  if (isVeg === undefined || isVeg === null) return null;

  const isVegetarian = Boolean(isVeg);

  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-[9px]'
    : 'px-2 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold tracking-wide rounded-md transition-colors ${sizeClasses} ${
        isVegetarian
          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-500/40'
          : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-500/30 dark:border-red-500/40'
      } ${className}`}
    >
      {isVegetarian ? 'Veg' : 'Non Veg'}
    </span>
  );
}
