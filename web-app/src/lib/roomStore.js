// roomStore.js — Manages Firebase Realtime Database rooms for multiplayer
import { ref, set, get, update, onValue, off, push, remove } from 'firebase/database';
import { initFirebase } from './firebase.js';
import { assignRoles } from '../models/GameSetup.js';
import { generateId } from './utils.js';

// Generate a random 4-letter uppercase room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no O/I to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get or create a stable device ID for this browser session
function getDeviceId() {
  let id = localStorage.getItem('mafia_device_id');
  if (!id) {
    id = generateId();
    localStorage.setItem('mafia_device_id', id);
  }
  return id;
}

export const deviceId = getDeviceId();

// Create a new multiplayer room (host)
export async function createRoom({ playerName, gameMode = 'mafia', roleCounts = null }) {
  const db = initFirebase();
  if (!db) throw new Error('Firebase not initialized');

  let code;
  let attempts = 0;
  // Find a unique code
  do {
    code = generateRoomCode();
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) break;
    attempts++;
  } while (attempts < 10);

  const hostPlayer = { id: deviceId, name: playerName, isHost: true, joinedAt: Date.now() };

  const roomData = {
    code,
    hostId: deviceId,
    status: 'waiting', // waiting | role-reveal | gameplay | words-reveal | words-voting | game-over
    gameMode,          // 'mafia' | 'words'
    roleCounts: roleCounts || { mafia: 1, detective: 0, doctor: 0, jester: 0, civilian: 0 },
    wordEntry: null,
    createdAt: Date.now(),
    players: {
      [deviceId]: hostPlayer,
    },
    roleAssignments: {},
    eliminations: [],
    round: 1,
    winner: null,
  };

  await set(ref(db, `rooms/${code}`), roomData);
  return { code, player: hostPlayer };
}

// Join an existing room as a non-host player
export async function joinRoom(code, playerName) {
  const db = initFirebase();
  if (!db) throw new Error('Firebase not initialized');

  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);

  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.val();
  if (room.status !== 'waiting') throw new Error('Game already started');

  const player = { id: deviceId, name: playerName, isHost: false, joinedAt: Date.now() };
  await update(ref(db, `rooms/${code}/players/${deviceId}`), player);
  return { code, player, room };
}

// Subscribe to real-time room updates
export function subscribeToRoom(code, callback) {
  const db = initFirebase();
  if (!db) return () => {};
  const roomRef = ref(db, `rooms/${code}`);
  onValue(roomRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return () => off(roomRef);
}

// Host starts the game (assigns roles and pushes to Firebase)
export async function hostStartMafiaGame(code, room) {
  const db = initFirebase();
  const players = Object.values(room.players);
  const setup = { roleCounts: room.roleCounts };
  const roleAssignments = assignRoles(players, setup);

  // Shuffle player order
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const playersMap = {};
  shuffledPlayers.forEach((p) => { playersMap[p.id] = { ...p }; });

  await update(ref(db, `rooms/${code}`), {
    status: 'role-reveal',
    roleAssignments,
    players: playersMap,
  });
}

// Host starts Words Imposter game
export async function hostStartWordsGame(code, room, wordEntry) {
  const db = initFirebase();
  const players = Object.values(room.players);
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const imposterIndex = Math.floor(Math.random() * shuffled.length);
  const imposterID = shuffled[imposterIndex].id;

  const playersMap = {};
  shuffled.forEach((p) => { playersMap[p.id] = { ...p }; });

  await update(ref(db, `rooms/${code}`), {
    status: 'words-reveal',
    wordEntry,
    imposterID,
    players: playersMap,
  });
}

// Player marks themselves as having revealed their role
export async function markRevealed(code) {
  const db = initFirebase();
  await update(ref(db, `rooms/${code}/players/${deviceId}`), { hasRevealed: true });
}

// Host eliminates a player
export async function eliminatePlayer(code, player, method = 'voted', round = 1) {
  const db = initFirebase();
  const elim = { playerId: player.id, playerName: player.name, method, round, at: Date.now() };
  const snap = await get(ref(db, `rooms/${code}/eliminations`));
  const existing = snap.val() ? Object.values(snap.val()) : [];
  existing.push(elim);
  const elimMap = {};
  existing.forEach((e, i) => { elimMap[i] = e; });
  await update(ref(db, `rooms/${code}`), { eliminations: elimMap });
}

// Host sets game status
export async function setRoomStatus(code, status, extra = {}) {
  const db = initFirebase();
  await update(ref(db, `rooms/${code}`), { status, ...extra });
}

// Leave / destroy a room
export async function leaveRoom(code, isHost) {
  const db = initFirebase();
  if (isHost) {
    await remove(ref(db, `rooms/${code}`));
  } else {
    await remove(ref(db, `rooms/${code}/players/${deviceId}`));
  }
}

// Update role counts (host only)
export async function updateRoomSettings(code, updates) {
  const db = initFirebase();
  await update(ref(db, `rooms/${code}`), updates);
}

// Update local player profile in the room
export async function updatePlayerProfile(code, newName, newAvatarBase64) {
  const db = initFirebase();
  const updates = { name: newName };
  if (newAvatarBase64 !== undefined) {
    updates.avatar = newAvatarBase64;
  }
  await update(ref(db, `rooms/${code}/players/${deviceId}`), updates);
}
