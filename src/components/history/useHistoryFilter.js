import { useState, useMemo, useCallback } from 'react';
import { formatAppDateOnly } from '../../utils/dateUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getLocalYYYYMMDD = (input) => {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function useHistoryFilter(items = [], config = {}) {
  const {
    dateKey = 'createdAt',
    statusKey = 'status',
    typeKey = 'orderType',
    defaultStatus = 'all',
    defaultType = 'all'
  } = config;

  const [dateFilter, setDateFilter] = useState({
    type: 'all',          // 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'year' | 'month' | 'single' | 'custom'
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0 - 11
    singleDate: '',       // 'YYYY-MM-DD'
    startDate: '',        // 'YYYY-MM-DD'
    endDate: ''           // 'YYYY-MM-DD'
  });

  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [typeFilter, setTypeFilter] = useState(defaultType);

  // Extract distinct years present in the dataset dynamically (always includes current year)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([currentYear]);
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && item[dateKey]) {
          const d = new Date(item[dateKey]);
          if (!isNaN(d.getTime())) {
            yearSet.add(d.getFullYear());
          }
        }
      });
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [items, dateKey]);

  // Set of distinct dates with records (for calendar day dot indicators)
  const datesWithRecords = useMemo(() => {
    const set = new Set();
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && item[dateKey]) {
          const dateStr = getLocalYYYYMMDD(item[dateKey]);
          if (dateStr) set.add(dateStr);
        }
      });
    }
    return set;
  }, [items, dateKey]);

  // Dynamic human-friendly date label
  const dateLabel = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalYYYYMMDD(now);

    switch (dateFilter.type) {
      case 'today':
        return `Today (${formatAppDateOnly(now)})`;
      case 'yesterday': {
        const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return `Yesterday (${formatAppDateOnly(y)})`;
      }
      case '7days': {
        const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `Last 7 Days (${formatAppDateOnly(s)} → ${formatAppDateOnly(now)})`;
      }
      case '30days': {
        const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return `Last 30 Days (${formatAppDateOnly(s)} → ${formatAppDateOnly(now)})`;
      }
      case 'this_month':
        return `This Month (${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()})`;
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return `Last Month (${MONTH_NAMES[lm.getMonth()]} ${lm.getFullYear()})`;
      }
      case 'this_year':
        return `This Year (${now.getFullYear()})`;
      case 'year':
        return `Year ${dateFilter.year}`;
      case 'month':
        return `${MONTH_NAMES[dateFilter.month]} ${dateFilter.year}`;
      case 'single':
        return dateFilter.singleDate ? formatAppDateOnly(dateFilter.singleDate) : 'Select Date';
      case 'custom':
        if (dateFilter.startDate && dateFilter.endDate) {
          if (dateFilter.startDate === dateFilter.endDate) {
            return formatAppDateOnly(dateFilter.startDate);
          }
          return `${formatAppDateOnly(dateFilter.startDate)} → ${formatAppDateOnly(dateFilter.endDate)}`;
        }
        if (dateFilter.startDate) return `From ${formatAppDateOnly(dateFilter.startDate)}`;
        if (dateFilter.endDate) return `Until ${formatAppDateOnly(dateFilter.endDate)}`;
        return 'Custom Date Range';
      case 'all':
      default:
        return 'All Time';
    }
  }, [dateFilter]);

  // Is any non-default filter applied?
  const isFiltered = useMemo(() => {
    return (
      dateFilter.type !== 'all' ||
      statusFilter !== defaultStatus ||
      typeFilter !== defaultType
    );
  }, [dateFilter, statusFilter, typeFilter, defaultStatus, defaultType]);

  // Execute filtering over dataset with timezone safety
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return items.filter((item) => {
      if (!item) return false;

      // ── 1. Date Filtering ────────────────────────────────────────────────
      if (dateFilter.type !== 'all' && item[dateKey]) {
        const d = new Date(item[dateKey]);
        if (isNaN(d.getTime())) return false;

        const itemLocalDateStr = getLocalYYYYMMDD(d);
        const itemTime = d.getTime();

        switch (dateFilter.type) {
          case 'today': {
            if (itemTime < todayStart || itemTime >= todayStart + 86400000) return false;
            break;
          }
          case 'yesterday': {
            const yStart = todayStart - 86400000;
            const yEnd = todayStart;
            if (itemTime < yStart || itemTime >= yEnd) return false;
            break;
          }
          case '7days': {
            const start7 = todayStart - 7 * 86400000;
            if (itemTime < start7) return false;
            break;
          }
          case '30days': {
            const start30 = todayStart - 30 * 86400000;
            if (itemTime < start30) return false;
            break;
          }
          case 'this_month': {
            if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
            break;
          }
          case 'last_month': {
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (d.getFullYear() !== lastMonthDate.getFullYear() || d.getMonth() !== lastMonthDate.getMonth()) return false;
            break;
          }
          case 'this_year': {
            if (d.getFullYear() !== now.getFullYear()) return false;
            break;
          }
          case 'year': {
            if (d.getFullYear() !== Number(dateFilter.year)) return false;
            break;
          }
          case 'month': {
            if (d.getFullYear() !== Number(dateFilter.year) || d.getMonth() !== Number(dateFilter.month)) return false;
            break;
          }
          case 'single': {
            if (itemLocalDateStr !== dateFilter.singleDate) return false;
            break;
          }
          case 'custom': {
            if (dateFilter.startDate && itemLocalDateStr < dateFilter.startDate) return false;
            if (dateFilter.endDate && itemLocalDateStr > dateFilter.endDate) return false;
            break;
          }
          default:
            break;
        }
      }

      // ── 2. Category / Type Filtering ─────────────────────────────────────
      if (typeFilter && typeFilter !== 'all') {
        const itemType = (item[typeKey] || '').toLowerCase(); // 'food' | 'ride' | 'store'
        const rawService = item.serviceType || (item.items && item.items[0]?.serviceType);
        const sType = (
          rawService ||
          (itemType === 'ride' ? 'RIDE' : (itemType === 'food' ? 'FOOD' : 'GROCERY'))
        ).toLowerCase();

        const filterLower = typeFilter.toLowerCase();
        if (filterLower === 'ride') {
          if (itemType !== 'ride' && sType !== 'ride' && sType !== 'courier') return false;
        } else if (filterLower === 'food') {
          if (itemType === 'ride') return false;
          if (itemType === 'store' && sType !== 'food') return false;
          if (sType !== 'food' && ['grocery', 'bakery', 'veg_fruits', 'meat'].includes(sType)) return false;
        } else if (filterLower === 'grocery') {
          if (sType !== 'grocery') return false;
        } else if (filterLower === 'bakery' || filterLower === 'beverages' || filterLower === 'cool_hot') {
          if (sType !== 'bakery' && sType !== 'cool_hot' && sType !== 'beverages') return false;
        } else if (filterLower === 'veg_fruits' || filterLower === 'fruits-vegetables') {
          if (sType !== 'veg_fruits' && sType !== 'fruits-vegetables') return false;
        } else if (filterLower === 'meat') {
          if (sType !== 'meat') return false;
        } else {
          if (sType !== filterLower && itemType !== filterLower) return false;
        }
      }

      // ── 3. Status Filtering ──────────────────────────────────────────────
      if (statusFilter && statusFilter !== 'all') {
        const itemStatus = (item[statusKey] || '').toLowerCase();
        const targetStatus = statusFilter.toLowerCase();

        if (targetStatus === 'completed' || targetStatus === 'delivered') {
          if (!['delivered', 'completed'].includes(itemStatus)) return false;
        } else if (targetStatus === 'ongoing' || targetStatus === 'active') {
          if (['delivered', 'completed', 'rejected', 'cancelled', 'rider_rejected'].includes(itemStatus)) return false;
        } else if (targetStatus === 'cancelled' || targetStatus === 'rejected') {
          if (!['rejected', 'cancelled', 'rider_rejected'].includes(itemStatus)) return false;
        } else if (targetStatus === 'placed' || targetStatus === 'new') {
          if (itemStatus !== 'placed') return false;
        } else {
          if (itemStatus !== targetStatus) return false;
        }
      }

      return true;
    });
  }, [items, dateFilter, statusFilter, typeFilter, dateKey, statusKey, typeKey]);

  // Actions
  const setPreset = useCallback((type) => {
    const now = new Date();
    setDateFilter({
      type,
      year: now.getFullYear(),
      month: now.getMonth(),
      singleDate: '',
      startDate: '',
      endDate: ''
    });
  }, []);

  const selectYear = useCallback((year) => {
    setDateFilter(prev => ({
      ...prev,
      type: 'year',
      year: Number(year)
    }));
  }, []);

  const selectYearAndMonth = useCallback((year, month) => {
    setDateFilter(prev => ({
      ...prev,
      type: 'month',
      year: Number(year),
      month: Number(month)
    }));
  }, []);

  const selectSingleDate = useCallback((dateStr) => {
    const d = new Date(dateStr);
    setDateFilter({
      type: 'single',
      year: !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear(),
      month: !isNaN(d.getTime()) ? d.getMonth() : new Date().getMonth(),
      singleDate: dateStr,
      startDate: dateStr,
      endDate: dateStr
    });
  }, []);

  const setCustomRange = useCallback((startDate, endDate) => {
    setDateFilter({
      type: 'custom',
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      singleDate: '',
      startDate,
      endDate
    });
  }, []);

  const resetFilters = useCallback(() => {
    const now = new Date();
    setDateFilter({
      type: 'all',
      year: now.getFullYear(),
      month: now.getMonth(),
      singleDate: '',
      startDate: '',
      endDate: ''
    });
    setStatusFilter(defaultStatus);
    setTypeFilter(defaultType);
  }, [defaultStatus, defaultType]);

  return {
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateLabel,
    availableYears,
    datesWithRecords,
    filteredItems,
    isFiltered,
    // Methods
    setPreset,
    selectYear,
    selectYearAndMonth,
    selectSingleDate,
    setCustomRange,
    resetFilters,
    MONTH_NAMES
  };
}
