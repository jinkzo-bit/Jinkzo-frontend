import React, { useState } from 'react';
import { Calendar, ChevronDown, RotateCcw, Trash2, Filter } from 'lucide-react';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function HistoryFilterToolbar({
  dateLabel = 'All Time',
  isFiltered = false,
  onOpenCalendar,
  onReset,
  onClearHistory,
  clearHistoryLabel = 'Clear All History',
  // Year & Month quick dropdowns (optional)
  availableYears = [],
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  // Type options (e.g. Food vs Rides)
  typeFilter,
  typeOptions,
  onTypeChange,
  // Status options (e.g. Completed, Ongoing, Cancelled)
  statusFilter,
  statusOptions,
  onStatusChange,
  // Counts
  totalCount,
  filteredCount,
}) {
  const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);

  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in">
      {/* ── Main Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface border border-line p-2.5 sm:p-3 rounded-2xl shadow-3xs">
        
        {/* Left Side: Filter Triggers */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          
          {/* 1. Date / Period Trigger Button */}
          <button
            type="button"
            onClick={onOpenCalendar}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-3xs ${
              dateLabel !== 'All Time'
                ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                : 'bg-base border-line text-main hover:bg-surface hover:border-primary/40'
            }`}
            title="Click to select Date, Year, Month, or Custom Range"
          >
            <Calendar className={`w-3.5 h-3.5 ${dateLabel !== 'All Time' ? 'text-primary' : 'text-muted'}`} />
            <span className="truncate max-w-[160px] sm:max-w-[220px] md:max-w-[280px]">
              {dateLabel}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted ml-0.5 flex-shrink-0" />
          </button>

          {/* 2. Quick Year Selector (if provided) */}
          {availableYears && availableYears.length > 0 && onSelectYear && (
            <div className="relative hidden md:block">
              <select
                value={selectedYear || ''}
                onChange={(e) => onSelectYear(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none bg-base border border-line hover:border-primary/40 text-main text-xs font-bold py-2 pl-3 pr-7 rounded-xl outline-none transition-colors cursor-pointer"
                title="Filter by Year"
              >
                <option value="">Year (All)</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* 3. Type Filter Dropdown (e.g., Food vs Ride) */}
          {typeOptions && typeOptions.length > 0 && onTypeChange && (
            <div className="relative hidden sm:block">
              <select
                value={typeFilter || 'all'}
                onChange={(e) => onTypeChange(e.target.value)}
                className="appearance-none bg-base border border-line hover:border-primary/40 text-main text-xs font-bold py-2 pl-3 pr-7 rounded-xl outline-none transition-colors cursor-pointer"
                title="Filter by Order/Run Type"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* 4. Status Filter Dropdown (e.g. All, Completed, Cancelled) */}
          {statusOptions && statusOptions.length > 0 && onStatusChange && (
            <div className="relative hidden sm:block">
              <select
                value={statusFilter || 'all'}
                onChange={(e) => onStatusChange(e.target.value)}
                className="appearance-none bg-base border border-line hover:border-primary/40 text-main text-xs font-bold py-2 pl-3 pr-7 rounded-xl outline-none transition-colors cursor-pointer"
                title="Filter by Status"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Mobile Filter Button (opens quick bottom modal for type/status on small screens) */}
          {(typeOptions || statusOptions) && (
            <button
              type="button"
              onClick={() => setShowMobileFilterModal(true)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-base border border-line text-xs font-bold text-main hover:bg-surface cursor-pointer"
              title="More Filters"
            >
              <Filter className="w-3.5 h-3.5 text-muted" />
              <span>Filters</span>
            </button>
          )}

          {/* 5. Reset Filters Button */}
          {isFiltered && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-base hover:bg-surface text-primary border border-line hover:border-primary/40 text-xs font-extrabold transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Reset all date and status filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Side: Clear History Button */}
        {onClearHistory && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-extrabold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-3xs"
              title={clearHistoryLabel}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{clearHistoryLabel}</span>
              <span className="sm:hidden">Clear History</span>
            </button>
          </div>
        )}

      </div>

      {/* Item Count & Filter Status Header */}
      {filteredCount !== undefined && totalCount !== undefined && (
        <div className="flex items-center justify-between text-[11px] font-bold text-muted px-1">
          <div>
            Showing <span className="text-main font-black">{filteredCount}</span> of {totalCount} records
          </div>
          {isFiltered && (
            <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
              Filtered View Active
            </span>
          )}
        </div>
      )}

      {/* ── Mobile Additional Filters Bottom Sheet / Modal ── */}
      {showMobileFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-surface border-t border-line rounded-t-3xl shadow-2xl w-full p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-black text-sm text-main">Filter History</h3>
              <button
                onClick={() => setShowMobileFilterModal(false)}
                className="text-xs font-bold text-muted hover:text-main"
              >
                Done
              </button>
            </div>

            {/* Type Options */}
            {typeOptions && typeOptions.length > 0 && onTypeChange && (
              <div>
                <span className="text-[10px] font-bold text-muted uppercase block mb-1.5">Category / Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onTypeChange(opt.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        typeFilter === opt.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-base border-line text-main'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Options */}
            {statusOptions && statusOptions.length > 0 && onStatusChange && (
              <div>
                <span className="text-[10px] font-bold text-muted uppercase block mb-1.5">Status</span>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onStatusChange(opt.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        statusFilter === opt.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-base border-line text-main'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  if (onReset) onReset();
                  setShowMobileFilterModal(false);
                }}
                className="w-full py-2.5 bg-base border border-line text-primary text-xs font-extrabold rounded-xl transition-colors text-center"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
