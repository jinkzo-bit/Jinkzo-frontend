let audioCtx = null;
let lastSoundPlayedAt = 0;
let lastSoundKey = '';

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

const playTone = (freq, type, duration, vol, startTime) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

  // Envelope
  gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
};

export const playOrderPlacedSound = () => {
  try {
    // A pleasant upward major chord chime
    playTone(523.25, 'sine', 0.5, 0.1, 0);      // C5
    playTone(659.25, 'sine', 0.5, 0.1, 0.1);    // E5
    playTone(783.99, 'sine', 0.6, 0.1, 0.2);    // G5
    playTone(1046.50, 'sine', 1.0, 0.15, 0.3);  // C6
  } catch (err) {
    console.log('Audio disabled or not supported', err);
  }
};

export const playStatusChangeSound = () => {
  try {
    // Soft notification bell
    playTone(880, 'sine', 0.3, 0.05, 0); // A5
    playTone(1108.73, 'sine', 0.4, 0.05, 0.1); // C#6
  } catch (err) {
    console.log('Audio disabled', err);
  }
};

export const playCaptainAssignedSound = () => {
  try {
    // Two quick chirps
    playTone(740, 'triangle', 0.2, 0.08, 0); // F#5
    playTone(880, 'triangle', 0.4, 0.08, 0.15); // A5
  } catch (err) {
    console.log('Audio disabled', err);
  }
};

export const playDeliveredSound = () => {
  try {
    // Triumphant trill
    playTone(523.25, 'sine', 0.4, 0.1, 0);
    playTone(659.25, 'sine', 0.4, 0.1, 0.15);
    playTone(1046.50, 'sine', 0.8, 0.15, 0.3);
  } catch (err) {
    console.log('Audio disabled', err);
  }
};

export const playNewOrderAlert = () => {
  try {
    // Double high-priority chime alert
    playTone(587.33, 'triangle', 0.3, 0.25, 0);    // D5
    playTone(880, 'triangle', 0.4, 0.3, 0.12);      // A5
    playTone(1174.66, 'triangle', 0.6, 0.35, 0.25); // D6
  } catch (err) {
    console.log('Audio disabled', err);
  }
};

export const playNewRideAlert = () => {
  try {
    // Urgent dual-tone alert
    playTone(659.25, 'square', 0.25, 0.15, 0);     // E5
    playTone(987.77, 'square', 0.35, 0.2, 0.12);   // B5
    playTone(1318.51, 'square', 0.5, 0.25, 0.24);  // E6
  } catch (err) {
    console.log('Audio disabled', err);
  }
};

const playedNotificationIds = new Set();

/**
 * Universal sound player with duplicate suppression and HTML5 Audio + Web Audio fallback
 */
export const playNotificationSound = (soundType = 'GENERAL', priority = 'NORMAL', notificationId = null) => {
  const now = Date.now();
  const idStr = notificationId ? String(notificationId) : null;

  // 1. Notification-ID level deduplication: never play sound twice for the same notification record
  if (idStr && playedNotificationIds.has(idStr)) {
    return;
  }
  if (idStr) {
    playedNotificationIds.add(idStr);
    if (playedNotificationIds.size > 500) {
      const firstKey = playedNotificationIds.values().next().value;
      playedNotificationIds.delete(firstKey);
    }
  }

  // 2. Rapid time-window deduplication fallback (1200ms)
  const soundKey = `${soundType}_${priority}`;
  if (soundKey === lastSoundKey && now - lastSoundPlayedAt < 1200) {
    return;
  }
  lastSoundPlayedAt = now;
  lastSoundKey = soundKey;

  const st = String(soundType || '').toUpperCase();
  const pr = String(priority || '').toUpperCase();

  let soundFile = '/sounds/general_notification.wav';
  if (st === 'NEW_ORDER') {
    soundFile = '/sounds/new_order.wav';
  } else if (st === 'NEW_RIDE') {
    soundFile = '/sounds/new_ride.wav';
  } else if (st === 'ORDER_PLACED') {
    soundFile = '/sounds/order_placed.wav';
  } else if (st === 'ORDER_ACCEPTED') {
    soundFile = '/sounds/order_accepted.wav';
  } else if (st === 'ORDER_REJECTED' || st === 'RIDE_REJECTED') {
    soundFile = '/sounds/order_rejected.wav';
  } else if (st === 'RIDER_ASSIGNED') {
    soundFile = '/sounds/rider_assigned.wav';
  } else if (st === 'ORDER_DELIVERED') {
    soundFile = '/sounds/order_delivered.wav';
  } else if (st === 'ORDER_CANCELLED' || st === 'CANCELLATION' || st === 'CUSTOMER_CANCELLED') {
    soundFile = '/sounds/order_cancelled.wav';
  } else if (st === 'RIDE_CANCELLED') {
    soundFile = '/sounds/ride_cancelled.wav';
  } else if (st === 'RIDE_ACCEPTED') {
    soundFile = '/sounds/ride_accepted.wav';
  } else if (st === 'GENERAL' || st === 'ANNOUNCEMENT') {
    soundFile = '/sounds/general_notification.wav';
  }

  // Attempt HTML5 Audio first
  try {
    const audio = new Audio(soundFile);
    audio.volume = pr === 'HIGH' ? 1.0 : 0.7;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fall back to Web Audio API synthesizer
        if (st === 'NEW_ORDER') playNewOrderAlert();
        else if (st === 'NEW_RIDE') playNewRideAlert();
        else if (st === 'ORDER_PLACED') playOrderPlacedSound();
        else if (st === 'ORDER_DELIVERED') playDeliveredSound();
        else if (st === 'RIDER_ASSIGNED') playCaptainAssignedSound();
        else playStatusChangeSound();
      });
    }
  } catch {
    if (st === 'NEW_ORDER') playNewOrderAlert();
    else if (st === 'NEW_RIDE') playNewRideAlert();
    else playStatusChangeSound();
  }
};
