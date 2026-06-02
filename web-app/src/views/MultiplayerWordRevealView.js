// MultiplayerWordRevealView.js — Per-device word reveal for Words Imposter multiplayer
import { navigate, goBack } from '../lib/router.js';
import { createGameButton } from '../components/Components.js';
import { playScrub, playSuccess, playTap } from '../lib/haptics.js';
import { subscribeToRoom, markRevealed, setRoomStatus, deviceId } from '../lib/roomStore.js';
import { playerStore } from '../models/Player.js';

export function MultiplayerWordRevealView(data) {
  const { code, room, isHost } = data || {};
  if (!code || !room) { goBack(); return { element: document.createElement('div') }; }

  const players = Object.values(room.players || {});
  const myPlayer = players.find(p => p.id === deviceId);
  const isImposter = room.imposterID === deviceId;
  const wordEntry = room.wordEntry || { word: '???', hint: '???' };

  const el = document.createElement('div');
  el.className = 'view';
  el.style.overflow = 'hidden';

  let dragOffset = 0;
  let showRevealed = false;
  let isDragging = false;
  let lastDragY = null;
  let lastHapticPos = 0;
  let lastDragDir = 0;
  const revealThreshold = 80;
  const maxDrag = window.innerHeight * 0.35;

  const img = myPlayer ? playerStore.getImage(myPlayer) : null;

  const container = document.createElement('div');
  container.className = 'role-reveal-container';
  el.appendChild(container);

  // Word/hint layer (bottom)
  const wordLayer = document.createElement('div');
  wordLayer.className = `word-reveal-layer ${isImposter ? 'imposter-bg' : 'normal-bg'}`;
  if (isImposter) {
    wordLayer.innerHTML = `
      <div class="word-label">You are the</div>
      <div class="word-value" style="color:#ff3b30">Imposter</div>
      <div style="font-size:16px;color:#888;margin:20px 0 10px">The word is related to:</div>
      <div class="hint-value">${wordEntry.hint}</div>
    `;
  } else {
    wordLayer.innerHTML = `
      <div class="word-label">The Word Is</div>
      <div class="word-value" style="color:#007aff">${wordEntry.word}</div>
      <div style="font-size:14px;color:#888;margin-top:20px;padding:0 30px;text-align:center">
        Find the imposter who doesn't know this word.
      </div>
    `;
  }
  container.appendChild(wordLayer);

  // Player card (top, draggable)
  const playerCard = document.createElement('div');
  playerCard.className = 'player-card-layer';
  container.appendChild(playerCard);

  const bg = document.createElement('div');
  bg.className = 'player-card-bg';
  if (img) {
    bg.innerHTML = `<img src="${img}" alt="${myPlayer?.name}" />`;
  } else {
    bg.innerHTML = `<div class="fallback-bg" style="background:linear-gradient(135deg,#004080,#007aff)"><div class="fallback-initial">${myPlayer?.name?.charAt(0)?.toUpperCase() || '?'}</div></div>`;
  }
  playerCard.appendChild(bg);

  const grad = document.createElement('div');
  grad.className = 'player-card-gradient';
  playerCard.appendChild(grad);

  const cardContent = document.createElement('div');
  cardContent.className = 'player-card-content';

  const progressArea = document.createElement('div');
  progressArea.style.cssText = 'padding:0 20px;padding-top:calc(env(safe-area-inset-top) + 20px)';
  progressArea.id = 'mp-word-progress';
  cardContent.appendChild(progressArea);

  const flexSpacer = document.createElement('div');
  flexSpacer.style.flex = '1';
  cardContent.appendChild(flexSpacer);

  const nameLabel = document.createElement('div');
  nameLabel.className = 'player-card-name';
  nameLabel.textContent = myPlayer?.name || 'You';
  cardContent.appendChild(nameLabel);

  const promptArea = document.createElement('div');
  promptArea.id = 'mp-word-prompt';
  cardContent.appendChild(promptArea);

  playerCard.appendChild(cardContent);

  function renderPrompt() {
    promptArea.innerHTML = '';
    if (!showRevealed) {
      promptArea.innerHTML = `
        <div class="swipe-prompt">
          <p>Swipe up to see your word</p>
          <div class="chevron">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m18 15-6-6-6 6"/></svg>
          </div>
        </div>
      `;
    } else {
      promptArea.innerHTML = `
        <div style="text-align:center;padding:20px 0 80px">
          <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:4px">You saw your ${isImposter ? 'hint' : 'word'}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:16px;font-weight:600">Waiting for others…</div>
        </div>
      `;
    }
  }

  function renderProgress(room) {
    const pArr = Object.values(room.players || {});
    const pEl = el.querySelector('#mp-word-progress');
    if (!pEl) return;
    pEl.innerHTML = '';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap';
    pArr.forEach(p => {
      const dot = document.createElement('div');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${p.hasRevealed ? '#007aff' : 'rgba(255,255,255,0.3)'};transition:background 0.3s`;
      bar.appendChild(dot);
    });
    pEl.appendChild(bar);

    const allRevealed = pArr.every(p => p.hasRevealed);
    if (allRevealed && isHost) {
      const existing = el.querySelector('#mp-words-start');
      if (!existing) {
        const btn = createGameButton('START DISCUSSION', 'blue', async () => {
          playTap();
          await setRoomStatus(code, 'words-voting', { imposterID: room.imposterID, wordEntry: room.wordEntry });
        });
        btn.id = 'mp-words-start';
        btn.style.cssText = 'max-width:300px;margin:0 auto;display:block';
        promptArea.innerHTML = '';
        promptArea.appendChild(btn);
      }
    }
  }

  renderPrompt();

  // Touch handling
  function onTouchStart(e) {
    if (showRevealed) return;
    isDragging = true;
    lastDragY = e.touches ? e.touches[0].clientY : e.clientY;
    playerCard.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const dragAmount = lastDragY - currentY;
    if (dragAmount > 0) {
      const newOffset = Math.min(dragAmount, maxDrag);
      const direction = newOffset > dragOffset ? 1 : newOffset < dragOffset ? -1 : 0;
      if (direction !== 0 && direction !== lastDragDir) {
        playScrub(); lastHapticPos = newOffset; lastDragDir = direction;
      } else if (Math.abs(newOffset - lastHapticPos) >= 20) {
        playScrub(); lastHapticPos = newOffset;
      }
      dragOffset = newOffset;
      playerCard.style.transform = `translateY(${-dragOffset}px)`;
      playerCard.style.borderRadius = dragOffset > 0 ? '0 0 30px 30px' : '0';
      const prompt = el.querySelector('.swipe-prompt');
      if (prompt) prompt.style.opacity = Math.max(0, 1 - (dragOffset / maxDrag));
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    lastHapticPos = 0; lastDragDir = 0;
    if (dragOffset > revealThreshold) {
      showRevealed = true;
      playSuccess();
      markRevealed(code);
      renderPrompt();
    }
    playerCard.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    playerCard.style.transform = 'translateY(0)';
    playerCard.style.borderRadius = '0';
    dragOffset = 0;
  }

  playerCard.addEventListener('touchstart', onTouchStart, { passive: false });
  playerCard.addEventListener('touchmove', onTouchMove, { passive: false });
  playerCard.addEventListener('touchend', onTouchEnd);
  playerCard.addEventListener('mousedown', (e) => {
    onTouchStart(e);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', () => { onTouchEnd(); window.removeEventListener('mousemove', onTouchMove); }, { once: true });
  });

  const unsub = subscribeToRoom(code, (updatedRoom) => {
    if (!updatedRoom) { navigate('/'); return; }
    renderProgress(updatedRoom);
    if (updatedRoom.status === 'words-voting') {
      unsub();
      navigate('/mp-words-voting', { code, room: updatedRoom, isHost });
    }
  });

  renderProgress(room);

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
