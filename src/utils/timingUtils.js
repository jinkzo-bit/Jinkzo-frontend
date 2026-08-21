/**
 * timingUtils.js — Frontend timing and availability helpers for Jinkzo.
 * Timezone: Asia/Kolkata (IST, UTC+5:30)
 */

export const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DEFAULT_OPENING_HOURS = {
  monday:    { enabled: true, open: '09:00', close: '23:00' },
  tuesday:   { enabled: true, open: '09:00', close: '23:00' },
  wednesday: { enabled: true, open: '09:00', close: '23:00' },
  thursday:  { enabled: true, open: '09:00', close: '23:00' },
  friday:    { enabled: true, open: '09:00', close: '23:00' },
  saturday:  { enabled: true, open: '09:00', close: '23:00' },
  sunday:    { enabled: true, open: '09:00', close: '23:00' }
};

/**
 * Normalizes restaurant opening hours to guarantee all 7 days exist with valid values.
 */
export function normalizeOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_OPENING_HOURS));
  }
  const normalized = {};
  for (const day of DAYS_OF_WEEK) {
    const dayData = hours[day];
    if (dayData && typeof dayData === 'object') {
      normalized[day] = {
        enabled: dayData.enabled !== false,
        open: dayData.open && typeof dayData.open === 'string' ? dayData.open.trim() : '09:00',
        close: dayData.close && typeof dayData.close === 'string' ? dayData.close.trim() : '23:00'
      };
    } else {
      normalized[day] = { ...DEFAULT_OPENING_HOURS[day] };
    }
  }
  return normalized;
}

/**
 * Normalizes a menu item with default availability fields.
 */
export function normalizeMenuItem(item) {
  if (!item) return item;
  return {
    ...item,
    availabilityMode: item.availabilityMode || 'restaurant_hours',
    availableFrom: item.availableFrom || '09:00',
    availableTo: item.availableTo || '23:00'
  };
}

/**
 * Parse time string ("HH:mm", "HH:mm AM/PM", "h:mm a") into minutes from 00:00 (0 to 1439).
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const str = timeStr.trim().toUpperCase();

  const is12Hour = str.includes('AM') || str.includes('PM');
  if (is12Hour) {
    const isPM = str.includes('PM');
    const clean = str.replace(/AM|PM/g, '').trim();
    const parts = clean.split(':').map(Number);
    let hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return (hours % 24) * 60 + (minutes % 60);
  }

  const parts = str.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return (hours % 24) * 60 + (minutes % 60);
}

/**
 * Formats time string ("HH:mm") into 12-hour display string ("09:00 AM", "11:00 PM").
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const totalMin = parseTimeToMinutes(timeStr);
  let hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

/**
 * Formats 12-hour or arbitrary time into standard 24-hour "HH:mm".
 */
export function formatTime24(timeStr) {
  if (!timeStr) return '09:00';
  const totalMin = parseTimeToMinutes(timeStr);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Returns current weekday index, weekday name, and current minute in Asia/Kolkata timezone.
 */
export function getKolkataCurrentTime(customDate = null) {
  const date = customDate ? new Date(customDate) : new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || 'monday';
  let hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  const dayIndex = DAYS_OF_WEEK.indexOf(weekdayStr) >= 0 ? DAYS_OF_WEEK.indexOf(weekdayStr) : 1;
  const dayName = DAYS_OF_WEEK[dayIndex];
  const currentMinutes = hour * 60 + minute;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return {
    dayIndex,
    dayName,
    hour,
    minute,
    currentMinutes,
    timeStr
  };
}

/**
 * Checks whether a restaurant is currently open according to its opening schedule and isClosed status.
 */
export function checkRestaurantOpenStatus(openingHours, isClosed = false, customDate = null) {
  if (isClosed === true) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      statusText: 'Hotel Temporarily Closed',
      nextOpeningText: '',
      openingHours: normalizeOpeningHours(openingHours)
    };
  }

  const normalized = normalizeOpeningHours(openingHours);
  const { dayIndex, dayName, currentMinutes } = getKolkataCurrentTime(customDate);

  // Check 1: Yesterday's overnight session spillover
  const prevDayIndex = (dayIndex + 6) % 7;
  const prevDayName = DAYS_OF_WEEK[prevDayIndex];
  const prevSched = normalized[prevDayName];

  if (prevSched && prevSched.enabled) {
    const prevOpenMin = parseTimeToMinutes(prevSched.open);
    const prevCloseMin = parseTimeToMinutes(prevSched.close);
    if (prevOpenMin > prevCloseMin) {
      if (currentMinutes < prevCloseMin) {
        return {
          isOpen: true,
          reason: 'open_overnight_spillover',
          statusText: 'Open',
          closingTime: prevSched.close,
          formattedClosingTime: formatTime12(prevSched.close),
          openingHours: normalized
        };
      }
    }
  }

  // Check 2: Today's schedule
  const todaySched = normalized[dayName];
  if (todaySched && todaySched.enabled) {
    const todayOpenMin = parseTimeToMinutes(todaySched.open);
    const todayCloseMin = parseTimeToMinutes(todaySched.close);

    if (todayOpenMin < todayCloseMin) {
      if (currentMinutes >= todayOpenMin && currentMinutes < todayCloseMin) {
        return {
          isOpen: true,
          reason: 'open_normal',
          statusText: 'Open',
          closingTime: todaySched.close,
          formattedClosingTime: formatTime12(todaySched.close),
          openingHours: normalized
        };
      }
    } else {
      if (currentMinutes >= todayOpenMin) {
        return {
          isOpen: true,
          reason: 'open_overnight_started',
          statusText: 'Open',
          closingTime: todaySched.close,
          formattedClosingTime: formatTime12(todaySched.close),
          openingHours: normalized
        };
      }
    }
  }

  // If not open, calculate next opening time
  let nextOpeningText = '';
  let nextOpenTime = '';
  let nextOpenDay = '';

  if (todaySched && todaySched.enabled) {
    const todayOpenMin = parseTimeToMinutes(todaySched.open);
    if (currentMinutes < todayOpenMin) {
      nextOpeningText = `Opens today at ${formatTime12(todaySched.open)}`;
      nextOpenTime = todaySched.open;
      nextOpenDay = dayName;
    }
  }

  if (!nextOpeningText) {
    for (let offset = 1; offset <= 7; offset++) {
      const targetIndex = (dayIndex + offset) % 7;
      const targetDay = DAYS_OF_WEEK[targetIndex];
      const targetSched = normalized[targetDay];

      if (targetSched && targetSched.enabled) {
        const dayLabel = offset === 1 ? 'tomorrow' : targetDay.charAt(0).toUpperCase() + targetDay.slice(1);
        nextOpeningText = `Opens ${dayLabel} at ${formatTime12(targetSched.open)}`;
        nextOpenTime = targetSched.open;
        nextOpenDay = targetDay;
        break;
      }
    }
  }

  if (!nextOpeningText) {
    nextOpeningText = 'Temporarily Closed';
  }

  return {
    isOpen: false,
    reason: 'schedule_closed',
    statusText: 'Closed',
    nextOpeningText,
    nextOpenTime,
    nextOpenDay,
    openingHours: normalized
  };
}

/**
 * Checks whether a menu item is currently available.
 */
export function checkItemAvailability(item, isRestaurantOpen = true, customDate = null) {
  if (!item) return { isAvailable: false, message: 'Item not found' };

  if (item.isAvailable === false) {
    return {
      isAvailable: false,
      reason: 'out_of_stock',
      message: 'Out of stock'
    };
  }

  if (!isRestaurantOpen) {
    return {
      isAvailable: false,
      reason: 'restaurant_closed',
      message: 'This restaurant is currently closed.'
    };
  }

  const mode = item.availabilityMode || 'restaurant_hours';
  if (mode === 'custom') {
    const fromStr = item.availableFrom || '09:00';
    const toStr = item.availableTo || '23:00';
    const fromMin = parseTimeToMinutes(fromStr);
    const toMin = parseTimeToMinutes(toStr);
    const { currentMinutes } = getKolkataCurrentTime(customDate);

    let inWindow = false;
    if (fromMin < toMin) {
      inWindow = currentMinutes >= fromMin && currentMinutes < toMin;
    } else {
      inWindow = currentMinutes >= fromMin || currentMinutes < toMin;
    }

    if (!inWindow) {
      const from12 = formatTime12(fromStr);
      const to12 = formatTime12(toStr);
      return {
        isAvailable: false,
        reason: 'timing_restricted',
        availableFrom: fromStr,
        availableTo: toStr,
        timingText: `Available ${from12} – ${to12}`,
        availableFromText: `Available from ${from12}`,
        message: `"${item.name}" is only available between ${from12} and ${to12}.`
      };
    }
  }

  return {
    isAvailable: true,
    reason: 'available'
  };
}
