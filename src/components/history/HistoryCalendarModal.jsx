import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, RotateCcw } from 'lucide-react';
import { formatAppDateOnly } from '../../utils/dateUtils';
import { getLocalYYYYMMDD } from './useHistoryFilter';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days', label: 'Last 7 Days' },
  { id: '30days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export default function HistoryCalendarModal({
  isOpen,
  onClose,
  dateFilter,
  onApply,
  availableYears = [new Date().getFullYear()],
  datesWithRecords = new Set(),
}) {
  if (!isOpen) return null;

  // Internal draft state before clicking Apply
  const [draftType, setDraftType] = useState(dateFilter.type || 'all');
  const [draftYear, setDraftYear] = useState(dateFilter.year || new Date().getFullYear());
  const [draftMonth, setDraftMonth] = useState(
    dateFilter.month !== undefined ? dateFilter.month : new Date().getMonth()
  );
  const [draftSingleDate, setDraftSingleDate] = useState(dateFilter.singleDate || '');
  const [draftStartDate, setDraftStartDate] = useState(dateFilter.startDate || '');
  const [draftEndDate, setDraftEndDate] = useState(dateFilter.endDate || '');

  // Sub-view mode inside the calendar: 'days' | 'months' | 'years'
  const [calendarView, setCalendarView] = useState('days');

  // Display month & year for the calendar grid
  const [calDisplayYear, setCalDisplayYear] = useState(dateFilter.year || new Date().getFullYear());
  const [calDisplayMonth, setCalDisplayMonth] = useState(
    dateFilter.month !== undefined ? dateFilter.month : new Date().getMonth()
  );

  useEffect(() => {
    setDraftType(dateFilter.type || 'all');
    setDraftYear(dateFilter.year || new Date().getFullYear());
    setDraftMonth(dateFilter.month !== undefined ? dateFilter.month : new Date().getMonth());
    setDraftSingleDate(dateFilter.singleDate || '');
    setDraftStartDate(dateFilter.startDate || '');
    setDraftEndDate(dateFilter.endDate || '');
    setCalDisplayYear(dateFilter.year || new Date().getFullYear());
    setCalDisplayMonth(dateFilter.month !== undefined ? dateFilter.month : new Date().getMonth());
  }, [dateFilter, isOpen]);

  // Navigate calendar month
  const handlePrevMonth = () => {
    if (calDisplayMonth === 0) {
      setCalDisplayMonth(11);
      setCalDisplayYear(prev => prev - 1);
    } else {
      setCalDisplayMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calDisplayMonth === 11) {
      setCalDisplayMonth(0);
      setCalDisplayYear(prev => prev + 1);
    } else {
      setCalDisplayMonth(prev => prev + 1);
    }
  };

  // Preset Selection
  const handleSelectPreset = (presetId) => {
    setDraftType(presetId);
    const now = new Date();
    if (presetId === 'all') {
      setDraftSingleDate('');
      setDraftStartDate('');
      setDraftEndDate('');
    } else if (presetId === 'today') {
      const todayStr = getLocalYYYYMMDD(now);
      setDraftSingleDate(todayStr);
      setDraftStartDate(todayStr);
      setDraftEndDate(todayStr);
      setCalDisplayYear(now.getFullYear());
      setCalDisplayMonth(now.getMonth());
    } else if (presetId === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const yStr = getLocalYYYYMMDD(y);
      setDraftSingleDate(yStr);
      setDraftStartDate(yStr);
      setDraftEndDate(yStr);
      setCalDisplayYear(y.getFullYear());
      setCalDisplayMonth(y.getMonth());
    } else if (presetId === '7days') {
      const s = new Date(now.getTime() - 7 * 86400000);
      setDraftStartDate(getLocalYYYYMMDD(s));
      setDraftEndDate(getLocalYYYYMMDD(now));
    } else if (presetId === '30days') {
      const s = new Date(now.getTime() - 30 * 86400000);
      setDraftStartDate(getLocalYYYYMMDD(s));
      setDraftEndDate(getLocalYYYYMMDD(now));
    } else if (presetId === 'this_month') {
      setDraftYear(now.getFullYear());
      setDraftMonth(now.getMonth());
      setCalDisplayYear(now.getFullYear());
      setCalDisplayMonth(now.getMonth());
    } else if (presetId === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setDraftYear(lm.getFullYear());
      setDraftMonth(lm.getMonth());
      setCalDisplayYear(lm.getFullYear());
      setCalDisplayMonth(lm.getMonth());
    } else if (presetId === 'this_year') {
      setDraftYear(now.getFullYear());
      setCalDisplayYear(now.getFullYear());
    } else if (presetId === 'custom') {
      // Keep existing custom range or start fresh
    }
  };

  // Day Click inside Calendar Grid
  const handleDayClick = (dayNum) => {
    const mm = String(calDisplayMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const clickedDateStr = `${calDisplayYear}-${mm}-${dd}`;

    if (draftType === 'custom') {
      // Range selection mode
      if (!draftStartDate || (draftStartDate && draftEndDate)) {
        // Start fresh range
        setDraftStartDate(clickedDateStr);
        setDraftEndDate('');
      } else {
        // Second click
        if (clickedDateStr >= draftStartDate) {
          setDraftEndDate(clickedDateStr);
        } else {
          setDraftEndDate(draftStartDate);
          setDraftStartDate(clickedDateStr);
        }
      }
    } else {
      // Single date selection
      setDraftType('single');
      setDraftSingleDate(clickedDateStr);
      setDraftStartDate(clickedDateStr);
      setDraftEndDate(clickedDateStr);
      setDraftYear(calDisplayYear);
      setDraftMonth(calDisplayMonth);
    }
  };

  // Month Click in Month Picker View
  const handleMonthSelect = (monthIdx) => {
    setDraftType('month');
    setDraftMonth(monthIdx);
    setDraftYear(calDisplayYear);
    setCalDisplayMonth(monthIdx);
    setCalendarView('days');
  };

  // Year Click in Year Picker View
  const handleYearSelect = (yearNum) => {
    setDraftType('year');
    setDraftYear(yearNum);
    setCalDisplayYear(yearNum);
    setCalendarView('months'); // Step to month view next for effortless drilling
  };

  // Apply Changes
  const handleApply = () => {
    onApply({
      type: draftType,
      year: draftYear,
      month: draftMonth,
      singleDate: draftSingleDate,
      startDate: draftStartDate,
      endDate: draftEndDate
    });
    onClose();
  };

  // Reset to All Time
  const handleResetToAll = () => {
    const now = new Date();
    onApply({
      type: 'all',
      year: now.getFullYear(),
      month: now.getMonth(),
      singleDate: '',
      startDate: '',
      endDate: ''
    });
    onClose();
  };

  // Calendar Day Calculations
  const firstDayOfWeek = new Date(calDisplayYear, calDisplayMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(calDisplayYear, calDisplayMonth + 1, 0).getDate();

  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-base/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-main">Filter by Date & Period</h3>
              <p className="text-[11px] text-muted font-semibold">Select specific year, month, date or custom range</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface border border-line text-muted hover:text-main flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Presets Carousel / Grid */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted block mb-2.5">
              Quick Selection Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const isSelected = draftType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs shadow-primary/20 scale-105'
                        : 'bg-base border-line text-main hover:border-primary/40 hover:bg-surface'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Calendar / Month / Year Box */}
          <div className="border border-line rounded-2xl p-4 bg-base/30 space-y-4">
            {/* View Mode & Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {calendarView === 'days' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Month Dropdown */}
                  <div className="relative">
                    <select
                      value={calDisplayMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setCalDisplayMonth(m);
                        setDraftMonth(m);
                        setDraftType(prev => (prev === 'all' || prev === 'today' || prev === 'yesterday' ? 'month' : prev));
                      }}
                      className="appearance-none bg-surface border border-line hover:border-primary/40 text-main text-xs font-extrabold py-1.5 pl-3 pr-7 rounded-xl outline-none transition-colors cursor-pointer"
                      title="Select Month"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={idx}>{mName}</option>
                      ))}
                    </select>
                    <ChevronRight className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>

                  {/* Year Dropdown */}
                  <div className="relative">
                    <select
                      value={calDisplayYear}
                      onChange={(e) => {
                        const yr = Number(e.target.value);
                        setCalDisplayYear(yr);
                        setDraftYear(yr);
                        setDraftType(prev => (prev === 'all' || prev === 'today' || prev === 'yesterday' ? 'year' : prev));
                      }}
                      className="appearance-none bg-surface border border-line hover:border-primary/40 text-primary font-black text-xs py-1.5 pl-3 pr-7 rounded-xl outline-none transition-colors cursor-pointer"
                      title="Select Year"
                    >
                      {Array.from(new Set([
                        ...availableYears,
                        new Date().getFullYear() - 2,
                        new Date().getFullYear() - 1,
                        new Date().getFullYear(),
                        new Date().getFullYear() + 1,
                        new Date().getFullYear() + 2
                      ])).sort((a, b) => b - a).map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                    <ChevronRight className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}

              {calendarView === 'months' && (
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-sm text-main">Select Month</span>
                  <button
                    type="button"
                    onClick={() => setCalendarView('years')}
                    className="font-display font-extrabold text-xs text-primary underline cursor-pointer"
                  >
                    {calDisplayYear}
                  </button>
                </div>
              )}

              {calendarView === 'years' && (
                <span className="font-display font-black text-sm text-main">Select Year</span>
              )}

              {/* Prev / Next Month Controls */}
              {calendarView === 'days' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-xl bg-surface border border-line text-muted hover:text-main flex items-center justify-center transition-colors cursor-pointer shadow-3xs"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-xl bg-surface border border-line text-muted hover:text-main flex items-center justify-center transition-colors cursor-pointer shadow-3xs"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {calendarView !== 'days' && (
                <button
                  type="button"
                  onClick={() => setCalendarView('days')}
                  className="text-xs font-bold text-muted hover:text-main underline cursor-pointer"
                >
                  Back to Calendar
                </button>
              )}
            </div>

            {/* ── View 1: Calendar Days Grid ──────────────────────────────── */}
            {calendarView === 'days' && (
              <div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
                    <span key={w} className="py-1">{w}</span>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Empty slots for start offset */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-8" />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const mm = String(calDisplayMonth + 1).padStart(2, '0');
                    const dd = String(day).padStart(2, '0');
                    const dateStr = `${calDisplayYear}-${mm}-${dd}`;

                    const isToday = dateStr === todayStr;
                    const hasRecords = datesWithRecords.has(dateStr);

                    // Check selection states
                    const isSingleSelected = draftType === 'single' && draftSingleDate === dateStr;
                    const isRangeStart = draftType === 'custom' && draftStartDate === dateStr;
                    const isRangeEnd = draftType === 'custom' && draftEndDate === dateStr;
                    const isInRange =
                      draftType === 'custom' &&
                      draftStartDate &&
                      draftEndDate &&
                      dateStr >= draftStartDate &&
                      dateStr <= draftEndDate;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className={`h-8 rounded-xl text-xs font-extrabold relative flex items-center justify-center transition-all cursor-pointer ${
                          isSingleSelected || isRangeStart || isRangeEnd
                            ? 'bg-primary text-white shadow-xs font-black'
                            : isInRange
                            ? 'bg-primary/15 text-primary'
                            : isToday
                            ? 'ring-1.5 ring-primary text-primary font-black bg-primary/5'
                            : 'hover:bg-surface hover:text-primary text-main'
                        }`}
                      >
                        <span>{day}</span>
                        {/* Dot indicator for days with orders/rides/runs */}
                        {hasRecords && !isSingleSelected && !isRangeStart && !isRangeEnd && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── View 2: Month Selector Grid ─────────────────────────────── */}
            {calendarView === 'months' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 animate-fade-in">
                {MONTH_NAMES.map((monthName, idx) => {
                  const isSelected = draftType === 'month' && draftMonth === idx && draftYear === calDisplayYear;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => handleMonthSelect(idx)}
                      className={`p-3 rounded-2xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface border-line text-main hover:border-primary/40 hover:bg-base'
                      }`}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── View 3: Dynamic Year Selector Grid ──────────────────────── */}
            {calendarView === 'years' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 animate-fade-in">
                {availableYears.map((yearNum) => {
                  const isSelected = (draftType === 'year' || draftType === 'month') && draftYear === yearNum;
                  return (
                    <button
                      key={yearNum}
                      type="button"
                      onClick={() => handleYearSelect(yearNum)}
                      className={`p-3.5 rounded-2xl text-xs font-extrabold transition-all border text-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface border-line text-main hover:border-primary/40 hover:bg-base'
                      }`}
                    >
                      {yearNum}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Date Inputs Box (if Range is selected) */}
          {draftType === 'custom' && (
            <div className="p-4 bg-base rounded-2xl border border-line flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:flex-1">
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">Start Date</label>
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-primary"
                />
              </div>
              <div className="w-full sm:flex-1">
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">End Date</label>
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-base/50">
          <button
            type="button"
            onClick={handleResetToAll}
            className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-main cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to All Time</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-line text-muted rounded-xl text-xs font-bold hover:bg-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-primary-hover shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
