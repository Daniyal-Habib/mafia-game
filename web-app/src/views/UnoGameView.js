// UnoGameView.js — Main UNO game screen with table layout and card animations
import { navigate } from '../lib/router.js';
import { createNavBar, createNavButton } from '../components/Components.js';
import { playTap, playSuccess, playError, playLight } from '../lib/haptics.js';
import { subscribeToRoom, deviceId, unoPlayCard, unoDrawCard, unoChooseColor, unoCallUno, leaveRoom } from '../lib/roomStore.js';
import { isPlayable, getCardDisplay, CARD_COLORS, calculateScore } from '../models/UnoEngine.js';

export function UnoGameView(data) {
  const { code, isHost } = data || {};
  if (!code) { navigate('/'); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view uno-view';

  let lastRenderedState = null;
  let animatingCard = null;

  // Build the layout
  el.innerHTML = `
    <div class="uno-table">
      <div class="uno-opponents" id="uno-opponents"></div>
      <div class="uno-center">
        <div class="uno-direction" id="uno-direction">↻</div>
        <div class="uno-piles">
          <button class="uno-draw-pile" id="uno-draw">
            <div class="uno-card-back">
              <div class="uno-card-back-text">UNO</div>
            </div>
            <div class="uno-draw-label">DRAW</div>
          </button>
          <div class="uno-discard-pile" id="uno-discard"></div>
        </div>
        <div class="uno-active-color" id="uno-active-color"></div>
        <div class="uno-status" id="uno-status"></div>
      </div>
      <div class="uno-my-hand-wrapper">
        <div class="uno-my-hand" id="uno-my-hand"></div>
      </div>
      <button class="uno-call-btn hidden" id="uno-call-btn">UNO!</button>
    </div>
    <div class="uno-color-picker hidden" id="uno-color-picker">
      <div class="uno-color-picker-card">
        <div class="uno-color-picker-title">Choose a color</div>
        <div class="uno-color-options">
          <button class="uno-color-opt uno-color-red" data-color="red"></button>
          <button class="uno-color-opt uno-color-green" data-color="green"></button>
          <button class="uno-color-opt uno-color-blue" data-color="blue"></button>
          <button class="uno-color-opt uno-color-yellow" data-color="yellow"></button>
        </div>
      </div>
    </div>
    <div class="uno-effect-overlay hidden" id="uno-effect-overlay">
      <div class="uno-effect-text" id="uno-effect-text"></div>
    </div>
  `;

  // Event: draw pile
  el.querySelector('#uno-draw').addEventListener('click', async () => {
    playTap();
    await unoDrawCard(code);
  });

  // Event: color picker
  el.querySelectorAll('.uno-color-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      playSuccess();
      el.querySelector('#uno-color-picker').classList.add('hidden');
      await unoChooseColor(code, btn.dataset.color);
    });
  });

  // Event: UNO call
  el.querySelector('#uno-call-btn').addEventListener('click', async () => {
    playSuccess();
    await unoCallUno(code);
    showEffect('UNO!', '#ff3b30');
  });

  // Render a single card element
  function renderCard(card, faceUp = true, playable = false, isMyCard = false) {
    const cardEl = document.createElement('div');
    cardEl.className = `uno-card${faceUp ? ' face-up' : ' face-down'}${playable ? ' playable' : ''}`;
    cardEl.dataset.cardId = card.id;

    if (faceUp) {
      const { symbol } = getCardDisplay(card);
      const colors = CARD_COLORS[card.color] || CARD_COLORS.wild;
      cardEl.style.background = colors.bg;
      cardEl.style.borderColor = colors.border;

      const isTextDark = card.color === 'yellow';

      cardEl.innerHTML = `
        <div class="uno-card-corner top" ${isTextDark ? 'style="color:#333"' : ''}>${symbol}</div>
        <div class="uno-card-symbol" ${isTextDark ? 'style="color:#333"' : ''}>${symbol}</div>
        <div class="uno-card-corner bottom" ${isTextDark ? 'style="color:#333"' : ''}>${symbol}</div>
      `;

      if (isMyCard && playable) {
        cardEl.addEventListener('click', async () => {
          playTap();
          // Animate card flying to center
          cardEl.classList.add('uno-card-playing');
          animatingCard = card.id;
          await unoPlayCard(code, card.id);
        });
      }
    } else {
      cardEl.innerHTML = `<div class="uno-card-back"><div class="uno-card-back-text">UNO</div></div>`;
    }

    return cardEl;
  }

  // Show a temporary effect overlay
  function showEffect(text, color = '#fff') {
    const overlay = el.querySelector('#uno-effect-overlay');
    const textEl = el.querySelector('#uno-effect-text');
    textEl.textContent = text;
    textEl.style.color = color;
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 1200);
  }

  // Main render function
  function render(room) {
    const uno = room.uno;
    if (!uno) return;

    const players = room.players || {};
    const turnOrder = uno.turnOrder || [];
    const myHand = uno.hands?.[deviceId] || [];
    const topCard = uno.discardPile?.[uno.discardPile.length - 1];
    const isMyTurn = uno.currentTurn === deviceId;

    // Show effect for last action
    if (lastRenderedState && uno.lastAction && 
        JSON.stringify(uno.lastAction) !== JSON.stringify(lastRenderedState.lastAction)) {
      const action = uno.lastAction;
      const actorName = players[action.player]?.name || 'Someone';
      if (action.type === 'skip') showEffect(`${actorName} SKIPPED!`, '#ff9800');
      else if (action.type === 'reverse') showEffect('REVERSED! ⟲', '#9c27b0');
      else if (action.type === 'draw2') showEffect(`+2 cards!`, '#e53935');
      else if (action.type === 'wild_draw4') showEffect(`+4 cards!`, '#e53935');
      else if (action.type === 'draw') {
        if (action.player !== deviceId) showEffect(`${actorName} drew a card`, '#888');
      }
    }
    lastRenderedState = { ...uno };

    // --- Opponents ---
    const opponentsEl = el.querySelector('#uno-opponents');
    opponentsEl.innerHTML = '';
    const opponents = turnOrder.filter(id => id !== deviceId);

    opponents.forEach(pid => {
      const p = players[pid];
      const cardCount = (uno.hands?.[pid] || []).length;
      const isTurn = uno.currentTurn === pid;

      const oppEl = document.createElement('div');
      oppEl.className = `uno-opponent${isTurn ? ' active-turn' : ''}`;
      oppEl.innerHTML = `
        <div class="uno-opp-avatar">${(p?.name || '?').charAt(0).toUpperCase()}</div>
        <div class="uno-opp-info">
          <div class="uno-opp-name">${p?.name || 'Player'}</div>
          <div class="uno-opp-cards">
            ${Array(Math.min(cardCount, 10)).fill('').map((_, i) => 
              `<div class="uno-mini-card" style="margin-left:${i > 0 ? '-8px' : '0'}"></div>`
            ).join('')}
            ${cardCount > 10 ? `<span class="uno-card-count-extra">+${cardCount - 10}</span>` : ''}
          </div>
        </div>
        <div class="uno-opp-count">${cardCount}</div>
      `;
      opponentsEl.appendChild(oppEl);
    });

    // --- Direction ---
    const dirEl = el.querySelector('#uno-direction');
    dirEl.textContent = uno.direction === 1 ? '↻' : '↺';

    // --- Discard pile ---
    const discardEl = el.querySelector('#uno-discard');
    if (topCard) {
      discardEl.innerHTML = '';
      const topCardEl = renderCard(topCard, true);
      topCardEl.classList.add('uno-discard-top');
      discardEl.appendChild(topCardEl);
    }

    // --- Active color indicator ---
    const colorEl = el.querySelector('#uno-active-color');
    const colorNames = { red: '🔴', green: '🟢', blue: '🔵', yellow: '🟡' };
    colorEl.textContent = colorNames[uno.activeColor] || '';

    // --- Status ---
    const statusEl = el.querySelector('#uno-status');
    if (isMyTurn) {
      statusEl.textContent = uno.pendingWild ? 'Choose a color!' : 'Your turn!';
      statusEl.style.color = '#34c759';
    } else {
      const currentPlayerName = players[uno.currentTurn]?.name || 'Someone';
      statusEl.textContent = `${currentPlayerName}'s turn`;
      statusEl.style.color = '#888';
    }

    // --- Color picker ---
    if (isMyTurn && uno.pendingWild) {
      el.querySelector('#uno-color-picker').classList.remove('hidden');
    } else {
      el.querySelector('#uno-color-picker').classList.add('hidden');
    }

    // --- My hand ---
    const handEl = el.querySelector('#uno-my-hand');
    handEl.innerHTML = '';

    myHand.forEach(card => {
      const playable = isMyTurn && !uno.pendingWild && isPlayable(card, topCard, uno.activeColor);
      const cardEl = renderCard(card, true, playable, true);
      handEl.appendChild(cardEl);
    });

    // --- UNO button ---
    const unoBtn = el.querySelector('#uno-call-btn');
    const shouldShowUno = myHand.length === 2 && isMyTurn && !uno.calledUno?.[deviceId];
    if (shouldShowUno) {
      unoBtn.classList.remove('hidden');
    } else {
      unoBtn.classList.add('hidden');
    }

    // --- Draw pile glow when it's my turn ---
    const drawBtn = el.querySelector('#uno-draw');
    if (isMyTurn && !uno.pendingWild) {
      drawBtn.classList.add('can-draw');
    } else {
      drawBtn.classList.remove('can-draw');
    }

    // --- Check for winner ---
    if (uno.winner) {
      setTimeout(() => {
        navigate('/uno-game-over', { code, room, winner: uno.winner, isHost });
      }, 1500);
    }
  }

  // Subscribe to room updates
  const unsub = subscribeToRoom(code, (room) => {
    if (!room) { navigate('/'); return; }
    if (room.status !== 'uno-playing') return;
    render(room);
  });

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
