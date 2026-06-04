// UnoEngine.js — Pure UNO game logic (no Firebase dependency)

const COLORS = ['red', 'green', 'blue', 'yellow'];
const NUMBER_VALUES = ['0','1','2','3','4','5','6','7','8','9'];
const ACTION_VALUES = ['skip', 'reverse', 'draw2'];
const WILD_VALUES = ['wild', 'wild_draw4'];

// Point values
const POINTS = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'skip': 20, 'reverse': 20, 'draw2': 20,
  'wild': 50, 'wild_draw4': 50,
};

// Create a standard 108-card UNO deck
export function createDeck() {
  const deck = [];
  let idCounter = 0;

  for (const color of COLORS) {
    // One 0 per color
    deck.push({ id: `${color}_0_${idCounter++}`, color, value: '0', points: 0 });

    // Two of each 1-9 per color
    for (const val of NUMBER_VALUES.slice(1)) {
      deck.push({ id: `${color}_${val}_${idCounter++}`, color, value: val, points: POINTS[val] });
      deck.push({ id: `${color}_${val}_${idCounter++}`, color, value: val, points: POINTS[val] });
    }

    // Two of each action per color
    for (const val of ACTION_VALUES) {
      deck.push({ id: `${color}_${val}_${idCounter++}`, color, value: val, points: POINTS[val] });
      deck.push({ id: `${color}_${val}_${idCounter++}`, color, value: val, points: POINTS[val] });
    }
  }

  // 4 Wild and 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild_wild_${idCounter++}`, color: 'wild', value: 'wild', points: 50 });
    deck.push({ id: `wild_draw4_${idCounter++}`, color: 'wild', value: 'wild_draw4', points: 50 });
  }

  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Deal hands and find a valid start card
export function dealHands(playerIds, cardsPerHand = 7) {
  let deck = shuffleDeck(createDeck());
  const hands = {};

  for (const pid of playerIds) {
    hands[pid] = deck.splice(0, cardsPerHand);
  }

  // Find first non-wild, non-action start card
  let startCardIndex = deck.findIndex(c => c.color !== 'wild' && !ACTION_VALUES.includes(c.value));
  if (startCardIndex === -1) startCardIndex = 0;
  const startCard = deck.splice(startCardIndex, 1)[0];

  return {
    hands,
    drawPile: deck,
    discardPile: [startCard],
    startCard,
  };
}

// Check if a card can be played on the current top card
export function isPlayable(card, topCard, activeColor) {
  // Wild cards are always playable
  if (card.color === 'wild') return true;
  // Match active color
  if (card.color === activeColor) return true;
  // Match value/type
  if (card.value === topCard.value) return true;
  return false;
}

// Get the effect of a played card
export function getCardEffect(card) {
  switch (card.value) {
    case 'skip': return 'skip';
    case 'reverse': return 'reverse';
    case 'draw2': return 'draw2';
    case 'wild': return 'wild';
    case 'wild_draw4': return 'wild_draw4';
    default: return 'none';
  }
}

// Advance to the next player
export function getNextPlayer(playerIds, currentIndex, direction, skip = 0, winners = []) {
  let idx = currentIndex;
  let skipped = 0;
  // Move forward until we find a player who hasn't won, doing this (1 + skip) times
  while (skipped <= skip) {
    idx = (idx + direction + playerIds.length) % playerIds.length;
    if (!winners.includes(playerIds[idx])) {
      skipped++;
    }
  }
  return idx;
}

// Calculate score for remaining cards in a hand
export function calculateScore(hand) {
  return hand.reduce((sum, card) => sum + (card.points || 0), 0);
}

// Get card display info
export function getCardDisplay(card) {
  if (!card) return { symbol: '?', label: '?' };

  const symbols = {
    'skip': '⊘', 'reverse': '⟲', 'draw2': '+2',
    'wild': '★', 'wild_draw4': '+4',
  };

  const symbol = symbols[card.value] || card.value;
  const label = card.color === 'wild' ? 'Wild' : `${card.color} ${card.value}`;

  return { symbol, label };
}

// Color CSS mapping
export const CARD_COLORS = {
  red: { bg: 'linear-gradient(135deg, #e53935, #c62828)', border: '#ff5252' },
  green: { bg: 'linear-gradient(135deg, #43a047, #2e7d32)', border: '#69f0ae' },
  blue: { bg: 'linear-gradient(135deg, #1e88e5, #1565c0)', border: '#448aff' },
  yellow: { bg: 'linear-gradient(135deg, #fdd835, #f9a825)', border: '#ffff00' },
  wild: { bg: 'linear-gradient(135deg, #e53935, #1e88e5, #43a047, #fdd835)', border: '#fff' },
};

// Serialize game state for Firebase (convert card objects to simpler format)
export function serializeState(state) {
  const serializeCards = (cards) => cards.map(c => ({
    id: c.id, color: c.color, value: c.value, points: c.points
  }));

  const hands = {};
  for (const [pid, hand] of Object.entries(state.hands)) {
    hands[pid] = serializeCards(hand);
  }

  return {
    drawPile: serializeCards(state.drawPile),
    discardPile: serializeCards(state.discardPile),
    hands,
    currentTurn: state.currentTurn,
    currentTurnIndex: state.currentTurnIndex,
    direction: state.direction,
    activeColor: state.activeColor,
    pendingWild: state.pendingWild || false,
    turnOrder: state.turnOrder,
    calledUno: state.calledUno || {},
    winners: state.winners || [],
    gameOver: state.gameOver || false,
    lastAction: state.lastAction || null,
  };
}
