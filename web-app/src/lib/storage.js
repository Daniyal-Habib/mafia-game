// Storage — localStorage persistence matching iOS CloudSaveManager + UserDefaults
import { getDb, auth, onUserChange } from './firebase.js';
import { ref, get, set } from 'firebase/database';
const KEYS = {
  players: 'mafia_players',
  history: 'mafia_history',
  words: 'mafia_words',
  settings: 'mafia_settings',
  activeGame: 'mafia_active_game',
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

let currentUser = null;
onUserChange((user) => {
  currentUser = user;
  if (user) {
    syncFromCloud();
  }
});

export async function syncToCloud() {
  if (!currentUser) return;
  const db = getDb();
  if (!db) return;

  const data = {
    players: safeGet(KEYS.players, []),
    history: safeGet(KEYS.history, []),
    words: safeGet(KEYS.words, []),
    settings: safeGet(KEYS.settings, {}),
  };

  try {
    await set(ref(db, `users/${currentUser.uid}`), data);
  } catch (e) {
    console.error('[Cloud] Sync to cloud failed:', e);
  }
}

export async function syncFromCloud() {
  if (!currentUser) return;
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.players) safeSet(KEYS.players, data.players);
      if (data.history) safeSet(KEYS.history, data.history);
      if (data.words) safeSet(KEYS.words, data.words);
      if (data.settings) safeSet(KEYS.settings, data.settings);
      
      // Notify stores to reload from localStorage
      window.dispatchEvent(new Event('cloudSyncComplete'));
    }
  } catch (e) {
    console.error('[Cloud] Load from cloud failed:', e);
  }
}

// ---------- Players ----------
export function loadPlayers() { return safeGet(KEYS.players, []); }
export function savePlayers(players) { safeSet(KEYS.players, players); syncToCloud(); }

// ---------- Player Images (stored separately to avoid JSON bloat) ----------
export function savePlayerImage(playerId, dataUrl) {
  try { localStorage.setItem(`mafia_img_${playerId}`, dataUrl); } catch {}
}
export function loadPlayerImage(playerId) {
  return localStorage.getItem(`mafia_img_${playerId}`) || null;
}
export function deletePlayerImage(playerId) {
  localStorage.removeItem(`mafia_img_${playerId}`);
}

// ---------- Settings ----------
const DEFAULT_SETTINGS = {
  revealMafiaOnElimination: true,
  hapticsEnabled: true,
  hapticStrength: 1.0,
  turnTimerEnabled: false,
  turnTimerDuration: 120,
};
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.settings, {}) }; }
export function saveSettings(settings) { safeSet(KEYS.settings, settings); syncToCloud(); }

// ---------- Game History ----------
export function loadHistory() { return safeGet(KEYS.history, []); }
export function saveHistory(history) { safeSet(KEYS.history, history); syncToCloud(); }

// ---------- Words ----------
export function loadWords() { return safeGet(KEYS.words, []); }
export function saveWords(words) { safeSet(KEYS.words, words); syncToCloud(); }

// ---------- Active Game ----------
export function saveActiveGame(data) { safeSet(KEYS.activeGame, data); }
export function loadActiveGame() { return safeGet(KEYS.activeGame, null); }
export function clearActiveGame() { localStorage.removeItem(KEYS.activeGame); }
export function hasActiveGame() { return localStorage.getItem(KEYS.activeGame) !== null; }

// ---------- Image Compression ----------
export function compressImage(file, maxSize = 300, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
