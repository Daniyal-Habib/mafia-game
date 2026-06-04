// UnoGameView.js — Landscape UNO game with circular table layout
import { navigate } from '../lib/router.js';
import { playTap, playSuccess, playError, playLight } from '../lib/haptics.js';
import { subscribeToRoom, deviceId, unoPlayCard, unoDrawCard, unoChooseColor, unoCallUno, leaveRoom } from '../lib/roomStore.js';
import { isPlayable, getCardDisplay, CARD_COLORS, calculateScore } from '../models/UnoEngine.js';

export function UnoGameView(data) {
  const { code, isHost } = data || {};
  if (!code) { navigate('/'); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view uno-view';

  let lastRenderedState = null;

  // Build the landscape table layout
  el.innerHTML = `
    <div class="uno-table-landscape">
      <!-- Opponent positions: top, left, right -->
      <div class="uno-seat uno-seat-top" id="uno-seat-top"></div>
      <div class="uno-seat uno-seat-left" id="uno-seat-left"></div>
      <div class="uno-seat uno-seat-right" id="uno-seat-right"></div>
      <div class="uno-seat uno-seat-top-left" id="uno-seat-top-left"></div>
      <div class="uno-seat uno-seat-top-right" id="uno-seat-top-right"></div>

      <!-- Center table area -->
      <div class="uno-table-center">
        <div class="uno-direction-ring" id="uno-direction-ring">
          <svg class="uno-direction-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
            <path id="uno-dir-arrow" d="" fill="rgba(255,200,0,0.6)" />
          </svg>
          <div class="uno-direction-label" id="uno-direction-label">↻</div>
        </div>
        <div class="uno-piles-row">
          <button class="uno-draw-stack" id="uno-draw">
            <div class="uno-stack-card c3"></div>
            <div class="uno-stack-card c2"></div>
            <div class="uno-stack-card c1">
              <div class="uno-card-back-inner">UNO</div>
            </div>
            <div class="uno-draw-count" id="uno-draw-count">0</div>
          </button>
          <div class="uno-discard-area" id="uno-discard"></div>
        </div>
      </div>

      <!-- Status bar -->
      <div class="uno-turn-banner" id="uno-turn-banner">Waiting...</div>

      <!-- My hand at bottom -->
      <div class="uno-my-section">
        <div class="uno-my-info" id="uno-my-info"></div>
        <div class="uno-hand-scroll">
          <div class="uno-my-hand" id="uno-my-hand"></div>
        </div>
      </div>

      <!-- UNO call button -->
      <button class="uno-call-btn hidden" id="uno-call-btn">UNO!</button>
    </div>

    <!-- Color picker overlay -->
    <div class="uno-color-picker hidden" id="uno-color-picker">
      <div class="uno-color-picker-card">
        <div class="uno-color-picker-title">Choose a color</div>
        <div class="uno-color-options">
          <button class="uno-color-opt" data-color="red" style="background:linear-gradient(135deg,#e53935,#c62828)"></button>
          <button class="uno-color-opt" data-color="green" style="background:linear-gradient(135deg,#43a047,#2e7d32)"></button>
          <button class="uno-color-opt" data-color="blue" style="background:linear-gradient(135deg,#1e88e5,#1565c0)"></button>
          <button class="uno-color-opt" data-color="yellow" style="background:linear-gradient(135deg,#fdd835,#f9a825)"></button>
        </div>
      </div>
    </div>

    <!-- Effect overlay -->
    <div class="uno-effect-overlay hidden" id="uno-effect-overlay">
      <div class="uno-effect-text" id="uno-effect-text"></div>
    </div>
  `;

  // Events
  el.querySelector('#uno-draw').addEventListener('click', async () => {
    playTap();
    await unoDrawCard(code);
  });

  el.querySelectorAll('.uno-color-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      playSuccess();
      el.querySelector('#uno-color-picker').classList.add('hidden');
      await unoChooseColor(code, btn.dataset.color);
    });
  });

  el.querySelector('#uno-call-btn').addEventListener('click', async () => {
    playSuccess();
    await unoCallUno(code);
    showEffect('UNO!', '#ff3b30');
  });

  // Render a card element
  function renderCard(card, faceUp = true, playable = false, isMyCard = false) {
    const cardEl = document.createElement('div');
    cardEl.className = `uno-card${faceUp ? ' face-up' : ' face-down'}${playable ? ' playable' : ''}`;
    cardEl.dataset.cardId = card.id;

    if (faceUp) {
      const { symbol } = getCardDisplay(card);
      const colors = CARD_COLORS[card.color] || CARD_COLORS.wild;
      cardEl.style.background = colors.bg;
      cardEl.style.borderColor = colors.border;
      const dark = card.color === 'yellow';

      cardEl.innerHTML = `
        <div class="uno-card-corner top" ${dark ? 'style="color:#333"' : ''}>${symbol}</div>
        <div class="uno-card-symbol" ${dark ? 'style="color:#333"' : ''}>${symbol}</div>
        <div class="uno-card-corner bottom" ${dark ? 'style="color:#333"' : ''}>${symbol}</div>
      `;

      if (isMyCard && playable) {
        cardEl.addEventListener('click', async () => {
          playTap();
          cardEl.classList.add('uno-card-playing');
          await unoPlayCard(code, card.id);
        });
      }
    } else {
      cardEl.innerHTML = `<div class="uno-mini-back">UNO</div>`;
    }

    return cardEl;
  }

  function showEffect(text, color = '#fff') {
    const overlay = el.querySelector('#uno-effect-overlay');
    const textEl = el.querySelector('#uno-effect-text');
    textEl.textContent = text;
    textEl.style.color = color;
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 1200);
  }

  // Render an opponent seat
  function renderSeat(seatEl, player, cardCount, isTurn, isWinner) {
    if (!player) { seatEl.innerHTML = ''; seatEl.style.display = 'none'; return; }
    seatEl.style.display = 'block';
    const initial = (player.name || '?').charAt(0).toUpperCase();

    // Build mini card fan or show winner
    let fanCards = '';
    if (isWinner) {
      fanCards = `<div style="color: gold; font-weight: bold; font-size: 12px; text-transform: uppercase;">Won</div>`;
    } else {
      const fanCount = Math.min(cardCount, 8);
      fanCards = Array(fanCount).fill('').map((_, i) => {
        const angle = (i - (fanCount - 1) / 2) * 8;
        const tx = (i - (fanCount - 1) / 2) * 6;
        return `<div class="uno-fan-card" style="transform:rotate(${angle}deg) translateX(${tx}px)"></div>`;
      }).join('');
    }

    seatEl.innerHTML = `
      <div class="uno-seat-inner${isTurn ? ' is-turn' : ''}">
        <div class="uno-seat-avatar">${initial}</div>
        <div class="uno-seat-name">${player.name || 'Player'}</div>
        <div class="uno-seat-fan">${fanCards}</div>
        ${!isWinner ? `<div class="uno-seat-count">${cardCount}</div>` : ''}
      </div>
    `;
  }

  // Main render
  function render(room) {
    const uno = room.uno;
    if (!uno) return;

    const players = room.players || {};
    const turnOrder = uno.turnOrder || [];
    const myHand = uno.hands?.[deviceId] || [];
    const topCard = uno.discardPile?.[uno.discardPile.length - 1];
    const isMyTurn = uno.currentTurn === deviceId;

    // Effects
    if (lastRenderedState && uno.lastAction &&
        JSON.stringify(uno.lastAction) !== JSON.stringify(lastRenderedState.lastAction)) {
      const action = uno.lastAction;
      const name = players[action.player]?.name || 'Someone';
      if (action.type === 'skip') showEffect(`${name} SKIPPED!`, '#ff9800');
      else if (action.type === 'reverse') showEffect('REVERSED! ⟲', '#9c27b0');
      else if (action.type === 'draw2') showEffect('+2 cards!', '#e53935');
      else if (action.type === 'wild_draw4') showEffect('+4 cards!', '#e53935');
      else if (action.type === 'draw' && action.player !== deviceId) showEffect(`${name} drew`, '#888');
    }
    lastRenderedState = { ...uno };

    // --- Seat assignments ---
    // Place opponents around the table based on count
    const opponents = turnOrder.filter(id => id !== deviceId);
    const seats = ['uno-seat-top', 'uno-seat-left', 'uno-seat-right', 'uno-seat-top-left', 'uno-seat-top-right'];
    const seatIds = seats.map(s => el.querySelector(`#${s}`));

    // Clear all seats
    seatIds.forEach(s => { s.innerHTML = ''; s.style.display = 'none'; });

    // Assign opponents to seats based on count
    const seatMap = [];
    if (opponents.length === 1) {
      seatMap.push({ seat: seatIds[0], pid: opponents[0] }); // top
    } else if (opponents.length === 2) {
      seatMap.push({ seat: seatIds[1], pid: opponents[0] }); // left
      seatMap.push({ seat: seatIds[2], pid: opponents[1] }); // right
    } else if (opponents.length === 3) {
      seatMap.push({ seat: seatIds[1], pid: opponents[0] }); // left
      seatMap.push({ seat: seatIds[0], pid: opponents[1] }); // top
      seatMap.push({ seat: seatIds[2], pid: opponents[2] }); // right
    } else if (opponents.length === 4) {
      seatMap.push({ seat: seatIds[1], pid: opponents[0] }); // left
      seatMap.push({ seat: seatIds[3], pid: opponents[1] }); // top-left
      seatMap.push({ seat: seatIds[4], pid: opponents[2] }); // top-right
      seatMap.push({ seat: seatIds[2], pid: opponents[3] }); // right
    } else if (opponents.length >= 5) {
      seatMap.push({ seat: seatIds[1], pid: opponents[0] }); // left
      seatMap.push({ seat: seatIds[3], pid: opponents[1] }); // top-left
      seatMap.push({ seat: seatIds[0], pid: opponents[2] }); // top
      seatMap.push({ seat: seatIds[4], pid: opponents[3] }); // top-right
      seatMap.push({ seat: seatIds[2], pid: opponents[4] }); // right
    }

    seatMap.forEach(({ seat, pid }) => {
      const p = players[pid];
      const count = (uno.hands?.[pid] || []).length;
      const isTurn = uno.currentTurn === pid;
      const isWinner = uno.winners && uno.winners.includes(pid);
      renderSeat(seat, p, count, isTurn, isWinner);
    });

    // --- Direction ring ---
    const dirLabel = el.querySelector('#uno-direction-label');
    dirLabel.textContent = uno.direction === 1 ? '↻' : '↺';
    const ring = el.querySelector('#uno-direction-ring');
    ring.className = `uno-direction-ring ${uno.direction === 1 ? 'cw' : 'ccw'}`;

    // --- Discard pile ---
    const discardEl = el.querySelector('#uno-discard');
    if (topCard) {
      discardEl.innerHTML = '';
      const topCardEl = renderCard(topCard, true);
      topCardEl.classList.add('uno-discard-top');
      discardEl.appendChild(topCardEl);

      // Color indicator ring on discard
      const colorRing = document.createElement('div');
      const activeColorHex = { red: '#e53935', green: '#43a047', blue: '#1e88e5', yellow: '#fdd835' };
      colorRing.className = 'uno-color-ring';
      colorRing.style.boxShadow = `0 0 0 3px ${activeColorHex[uno.activeColor] || '#fff'}, 0 0 15px ${activeColorHex[uno.activeColor] || '#fff'}`;
      discardEl.appendChild(colorRing);
    }

    // --- Draw pile count ---
    const drawCount = el.querySelector('#uno-draw-count');
    drawCount.textContent = (uno.drawPile || []).length;

    // --- Turn banner ---
    const banner = el.querySelector('#uno-turn-banner');
    if (isMyTurn) {
      banner.textContent = uno.pendingWild ? '🎨 Choose a color!' : '🟢 Your turn — play or draw!';
      banner.className = 'uno-turn-banner my-turn';
    } else {
      const curName = players[uno.currentTurn]?.name || 'Someone';
      banner.textContent = `⏳ ${curName}'s turn`;
      banner.className = 'uno-turn-banner';
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

    // --- My info ---
    const myInfo = el.querySelector('#uno-my-info');
    const myPlayer = players[deviceId];
    myInfo.innerHTML = `
      <div class="uno-my-avatar">${(myPlayer?.name || '?').charAt(0).toUpperCase()}</div>
      <span class="uno-my-name">${myPlayer?.name || 'You'}</span>
      <span class="uno-my-card-count">${myHand.length} cards</span>
    `;

    // --- UNO button ---
    const unoBtn = el.querySelector('#uno-call-btn');
    if (myHand.length === 2 && isMyTurn && !uno.calledUno?.[deviceId]) {
      unoBtn.classList.remove('hidden');
    } else {
      unoBtn.classList.add('hidden');
    }

    // --- Draw pile glow ---
    const drawBtn = el.querySelector('#uno-draw');
    drawBtn.classList.toggle('can-draw', isMyTurn && !uno.pendingWild);

    // --- Winner ---
    if (uno.gameOver || (uno.winners && uno.winners.length > 0 && turnOrder.length <= 2)) {
      setTimeout(() => {
        navigate('/uno-game-over', { code, room, winner: uno.winners[0], isHost });
      }, 1500);
    }
  }

  const unsub = subscribeToRoom(code, (room) => {
    if (!room) { navigate('/'); return; }
    if (room.status !== 'uno-playing') return;
    render(room);
  });

  return { element: el, cleanup: () => unsub() };
}
