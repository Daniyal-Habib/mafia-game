// Haptics — Uses WebHaptics where supported, falls back to Web Audio pseudo-haptics on iOS
import { WebHaptics } from 'web-haptics';

let haptics = null;
let enabled = true;
let isNativeSupported = false;

try {
  isNativeSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  if (isNativeSupported) {
    haptics = new WebHaptics();
  }
} catch {
  // Ignore
}

export function setHapticsEnabled(val) { enabled = val; }

// --- Web Audio Pseudo-Haptic Fallback ---
let audioCtx = null;
function initAudio() {
  if (!enabled || isNativeSupported) return;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Initialize audio on first user interaction to satisfy browser policies
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', initAudio, { passive: true, once: true });
  document.addEventListener('click', initAudio, { passive: true, once: true });
}

function playAudioHaptic(type) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  if (type === 'light' || type === 'selection') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.015);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.015);
    osc.start(now);
    osc.stop(now + 0.015);
  } else if (type === 'medium') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.02);
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
    osc.start(now);
    osc.stop(now + 0.02);
  } else if (type === 'heavy' || type === 'error' || type === 'warning') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.04);
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.start(now);
    osc.stop(now + 0.04);
  } else if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(250, now + 0.08);
    gain2.gain.setValueAtTime(0.8, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
    
    osc.start(now);
    osc.stop(now + 0.03);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.11);
  }
}

function fire(type) {
  if (!enabled) return;
  if (isNativeSupported && haptics) {
    try { haptics.trigger(type); } catch {}
  } else {
    // Fallback to Web Audio tactile clicks on iOS
    playAudioHaptic(type);
  }
}

// Map iOS HapticManager methods
export function playTap() { fire('selection'); }
export function playScrub() { fire('medium'); }
export function playSuccess() { fire('success'); }
export function playWarning() { fire('warning'); }
export function playError() { fire('error'); }
export function playHeavy() { fire('heavy'); }
export function playLight() { fire('light'); }
