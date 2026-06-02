// MultiplayerRoleRevealView.js — Per-device role reveal for online multiplayer
// Each player sees ONLY their own role card. No "pass the phone" needed.
import { navigate, goBack } from '../lib/router.js';
import { createGameButton } from '../components/Components.js';
import { playScrub, playSuccess, playTap } from '../lib/haptics.js';
import { subscribeToRoom, markRevealed, setRoomStatus, deviceId } from '../lib/roomStore.js';
import { getRoleById } from '../models/Role.js';
import { playerStore } from '../models/Player.js';

export function MultiplayerRoleRevealView(data) {
  const { code, room, isHost } = data || {};
  if (!code || !room) { goBack(); return { element: document.createElement('div') }; }

  const myRole = getRoleById(room.roleAssignments?.[deviceId]);
  const players = Object.values(room.players || {});
  const myPlayer = players.find(p => p.id === deviceId);

  const el = document.createElement('div');
  el.className = 'view';
  el.style.overflow = 'hidden';

  // State
  let dragOffset = 0;
  let hasRevealed = false;
  let showRevealed = false;
  let isDragging = false;
  let lastDragY = null;
  let lastHapticPos = 0;
  let lastDragDir = 0;
  const revealThreshold = 80;
  const maxDrag = window.innerHeight * 0.35;

  // Player image
  const img = myPlayer ? playerStore.getImage(myPlayer) : null;

  const container = document.createElement('div');
  container.className = 'role-reveal-container';
  el.appendChild(container);

  // --- Role layer (bottom) ---
  const roleLayer = document.createElement('div');
  roleLayer.className = 'role-layer';
  roleLayer.style.background = myRole.color;
  roleLayer.innerHTML = `
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.95))"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Your Role</div>
      <div class="role-icon" style="font-size:60px;color:${myRole.color}">${myRole.icon}</div>
      <div class="role-name" style="font-size:36px;font-weight:900;color:${myRole.color};letter-spacing:4px;margin-top:16px">${myRole.name.toUpperCase()}</div>
      <div style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.8);margin-top:16px;text-align:center;padding:0 20px">${myRole.description}</div>
    </div>
  `;
  container.appendChild(roleLayer);

  // --- Player card (top, draggable) ---
  const playerCard = document.createElement('div');
  playerCard.className = 'player-card-layer';
  container.appendChild(playerCard);

  const bg = document.createElement('div');
  bg.className = 'player-card-bg';
  if (img) {
    bg.innerHTML = `<img src="${img}" alt="${myPlayer?.name}" />`;
  } else {
    bg.innerHTML = `<div class="fallback-bg"><div class="fallback-initial">${myPlayer?.name?.charAt(0)?.toUpperCase() || '?'}</div></div>`;
  }
  playerCard.appendChild(bg);

  const grad = document.createElement('div');
  grad.className = 'player-card-gradient';
  playerCard.appendChild(grad);

  const cardContent = document.createElement('div');
  cardContent.className = 'player-card-content';

  // Online indicator bar — shows all players + reveal status
  const progressArea = document.createElement('div');
  progressArea.style.cssText = 'padding:0 20px;padding-top:calc(env(safe-area-inset-top) + 20px)';
  progressArea.id = 'mp-reveal-progress';
  cardContent.appendChild(progressArea);

  const flexSpacer = document.createElement('div');
  flexSpacer.style.flex = '1';
  cardContent.appendChild(flexSpacer);

  const nameLabel = document.createElement('div');
  nameLabel.className = 'player-card-name';
  nameLabel.textContent = myPlayer?.name || 'You';
  cardContent.appendChild(nameLabel);

  const promptArea = document.createElement('div');
  promptArea.id = 'mp-prompt-area';
  cardContent.appendChild(promptArea);

  playerCard.appendChild(cardContent);

  function renderPrompt() {
    promptArea.innerHTML = '';
    if (!showRevealed) {
      promptArea.innerHTML = `
        <div class="swipe-prompt">
          <p>Swipe up to see your role</p>
          <div class="chevron">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m18 15-6-6-6 6"/></svg>
          </div>
        </div>
      `;
    } else {
      const waitDiv = document.createElement('div');
      waitDiv.style.cssText = 'text-align:center;padding:20px 0 80px';
      waitDiv.innerHTML = `
        <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:4px">You saw your role</div>
        <div style="color:rgba(255,255,255,0.8);font-size:16px;font-weight:600">Waiting for others…</div>
      `;
      promptArea.appendChild(waitDiv);
    }
  }

  function renderProgress(room) {
    const players = Object.values(room.players || {});
    const progArea = el.querySelector('#mp-reveal-progress');
    if (!progArea) return;
    progArea.innerHTML = '';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap';
    players.forEach(p => {
      const dot = document.createElement('div');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${p.hasRevealed ? '#34c759' : 'rgba(255,255,255,0.3)'};transition:background 0.3s;title="${p.name}"`;
      bar.appendChild(dot);
    });
    progArea.appendChild(bar);

    // If all revealed and I'm host, show "Start Gameplay" button
    const allRevealed = players.every(p => p.hasRevealed);
    if (allRevealed && isHost) {
      const startArea = el.querySelector('#mp-host-start');
      if (!startArea) {
        const btn = createGameButton('START GAMEPLAY', 'livegreen', async () => {
          playTap();
          await setRoomStatus(code, 'gameplay');
        });
        btn.id = 'mp-host-start';
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
      const moved = Math.abs(newOffset - lastHapticPos);
      if (direction !== 0 && direction !== lastDragDir) {
        playScrub(); lastHapticPos = newOffset; lastDragDir = direction;
      } else if (moved >= 20) {
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
      hasRevealed = true;
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
    window.addEventListener('mouseup', () => {
      onTouchEnd();
      window.removeEventListener('mousemove', onTouchMove);
    }, { once: true });
  });

  // Subscribe to room — navigate when host starts gameplay
  const unsub = subscribeToRoom(code, (updatedRoom) => {
    if (!updatedRoom) { navigate('/'); return; }
    renderProgress(updatedRoom);
    if (updatedRoom.status === 'gameplay') {
      unsub();
      navigate('/mp-gameplay', { code, room: updatedRoom, isHost });
    }
  });

  renderProgress(room);

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
