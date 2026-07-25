let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playTone = (freq, type, duration, vol, startTime) => {
  const ctx = getAudioContext();
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
