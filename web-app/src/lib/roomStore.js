// roomStore.js — Manages Firebase Realtime Database rooms for multiplayer
import { ref, set, get, update, onValue, off, push, remove } from 'firebase/database';
import { initFirebase } from './firebase.js';
import { assignRoles } from '../models/GameSetup.js';
import { generateId } from './utils.js';
import { dealHands, isPlayable, getCardEffect, getNextPlayer, serializeState } from '../models/UnoEngine.js';

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

// ============ UNO GAME FUNCTIONS ============

// Host starts UNO game
export async function hostStartUnoGame(code, room) {
  const db = initFirebase();
  const players = Object.values(room.players);
  const playerIds = players.map(p => p.id);

  // Shuffle player order
  const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);

  // Deal cards
  const { hands, drawPile, discardPile, startCard } = dealHands(turnOrder, 7);

  const unoState = serializeState({
    drawPile,
    discardPile,
    hands,
    currentTurn: turnOrder[0],
    currentTurnIndex: 0,
    direction: 1,
    activeColor: startCard.color,
    pendingWild: false,
    turnOrder,
    calledUno: {},
    winner: null,
    lastAction: null,
  });

  await update(ref(db, `rooms/${code}`), {
    status: 'uno-playing',
    uno: unoState,
  });
}

// Play a card
export async function unoPlayCard(code, cardId) {
  const db = initFirebase();
  const snap = await get(ref(db, `rooms/${code}/uno`));
  if (!snap.exists()) return;
  const uno = snap.val();

  // Validate it's our turn
  if (uno.currentTurn !== deviceId) return;
  if (uno.pendingWild) return; // Must choose color first

  // Find the card in our hand
  const hand = uno.hands[deviceId] || [];
  const cardIndex = hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return;

  const card = hand[cardIndex];
  const topCard = uno.discardPile[uno.discardPile.length - 1];

  // Validate playable
  if (!isPlayable(card, topCard, uno.activeColor)) return;

  // Remove card from hand
  const newHand = [...hand];
  newHand.splice(cardIndex, 1);

  // Add to discard
  const newDiscard = [...uno.discardPile, card];

  // Determine effect
  const effect = getCardEffect(card);
  const turnOrder = uno.turnOrder;
  let direction = uno.direction;
  let nextTurnIndex = uno.currentTurnIndex;
  let activeColor = card.color === 'wild' ? uno.activeColor : card.color;
  let pendingWild = false;
  let drawUpdates = {};
  let lastAction = { type: effect, player: deviceId, card };

  if (effect === 'reverse') {
    direction *= -1;
    if (turnOrder.length === 2) {
      // In 2-player, reverse acts as skip
      nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 1);
    } else {
      nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 0);
    }
  } else if (effect === 'skip') {
    nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 1);
  } else if (effect === 'draw2') {
    const skippedIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 0);
    const skippedPlayer = turnOrder[skippedIndex];
    // Give 2 cards to next player
    const drawPile = [...(uno.drawPile || [])];
    const targetHand = [...(uno.hands[skippedPlayer] || [])];
    for (let i = 0; i < 2 && drawPile.length > 0; i++) {
      targetHand.push(drawPile.shift());
    }
    drawUpdates[`hands/${skippedPlayer}`] = targetHand;
    drawUpdates['drawPile'] = drawPile;
    nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 1);
    lastAction.target = skippedPlayer;
  } else if (effect === 'wild') {
    pendingWild = true;
    // Don't advance turn yet — wait for color choice
  } else if (effect === 'wild_draw4') {
    pendingWild = true;
    // Color + draw will happen in chooseColor
  } else {
    nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 0);
  }

  // Check for win
  let winner = null;
  if (newHand.length === 0) {
    winner = deviceId;
  }

  const updates = {
    [`hands/${deviceId}`]: newHand,
    discardPile: newDiscard,
    direction,
    activeColor,
    pendingWild,
    lastAction,
    ...drawUpdates,
  };

  if (winner) {
    updates.winner = winner;
  }

  if (!pendingWild) {
    updates.currentTurnIndex = nextTurnIndex;
    updates.currentTurn = turnOrder[nextTurnIndex];
  }

  await update(ref(db, `rooms/${code}/uno`), updates);
}

// Choose color after playing a wild card
export async function unoChooseColor(code, color) {
  const db = initFirebase();
  const snap = await get(ref(db, `rooms/${code}/uno`));
  if (!snap.exists()) return;
  const uno = snap.val();

  if (uno.currentTurn !== deviceId) return;
  if (!uno.pendingWild) return;

  const lastCard = uno.discardPile[uno.discardPile.length - 1];
  const effect = getCardEffect(lastCard);
  const turnOrder = uno.turnOrder;
  let nextTurnIndex = uno.currentTurnIndex;
  let direction = uno.direction;
  const updates = {
    activeColor: color,
    pendingWild: false,
  };

  if (effect === 'wild_draw4') {
    const targetIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 0);
    const targetPlayer = turnOrder[targetIndex];
    const drawPile = [...(uno.drawPile || [])];
    const targetHand = [...(uno.hands[targetPlayer] || [])];
    for (let i = 0; i < 4 && drawPile.length > 0; i++) {
      targetHand.push(drawPile.shift());
    }
    updates[`hands/${targetPlayer}`] = targetHand;
    updates.drawPile = drawPile;
    nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 1);
    updates.lastAction = { type: 'wild_draw4', player: deviceId, target: targetPlayer, color };
  } else {
    nextTurnIndex = getNextPlayer(turnOrder, nextTurnIndex, direction, 0);
    updates.lastAction = { type: 'wild', player: deviceId, color };
  }

  // Check if player already won (hand empty from the wild play)
  const myHand = uno.hands[deviceId] || [];
  if (myHand.length === 0) {
    updates.winner = deviceId;
  }

  updates.currentTurnIndex = nextTurnIndex;
  updates.currentTurn = turnOrder[nextTurnIndex];

  await update(ref(db, `rooms/${code}/uno`), updates);
}

// Draw a card from the pile
export async function unoDrawCard(code) {
  const db = initFirebase();
  const snap = await get(ref(db, `rooms/${code}/uno`));
  if (!snap.exists()) return;
  const uno = snap.val();

  if (uno.currentTurn !== deviceId) return;
  if (uno.pendingWild) return;

  const drawPile = [...(uno.drawPile || [])];
  const hand = [...(uno.hands[deviceId] || [])];

  if (drawPile.length === 0) {
    // Reshuffle discard pile into draw pile (keep top card)
    const discard = [...(uno.discardPile || [])];
    const topCard = discard.pop();
    const reshuffled = discard.sort(() => Math.random() - 0.5);
    drawPile.push(...reshuffled);
    await update(ref(db, `rooms/${code}/uno`), {
      drawPile,
      discardPile: [topCard],
    });
  }

  if (drawPile.length > 0) {
    const drawnCard = drawPile.shift();
    hand.push(drawnCard);

    // After drawing, advance to next turn
    const turnOrder = uno.turnOrder;
    const nextIndex = getNextPlayer(turnOrder, uno.currentTurnIndex, uno.direction, 0);

    await update(ref(db, `rooms/${code}/uno`), {
      drawPile,
      [`hands/${deviceId}`]: hand,
      currentTurnIndex: nextIndex,
      currentTurn: turnOrder[nextIndex],
      lastAction: { type: 'draw', player: deviceId },
    });
  }
}

// Call UNO
export async function unoCallUno(code) {
  const db = initFirebase();
  await update(ref(db, `rooms/${code}/uno/calledUno`), { [deviceId]: true });
}
