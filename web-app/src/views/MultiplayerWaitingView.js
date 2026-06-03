// MultiplayerWaitingView.js — Lobby waiting room: shows code, players, start button for host
import { navigate, goBack } from '../lib/router.js';
import { createGameButton, createNavBar, createNavButton, createAvatar } from '../components/Components.js';
import { playTap, playSuccess, playError, playLight } from '../lib/haptics.js';
import { subscribeToRoom, hostStartMafiaGame, hostStartWordsGame, hostStartUnoGame, leaveRoom, updateRoomSettings, updatePlayerProfile } from '../lib/roomStore.js';
import { deviceId } from '../lib/roomStore.js';
import { autoBalanceAllRoles, validateSetup } from '../models/GameSetup.js';
import { wordStore } from '../models/WordStore.js';
import { compressImage } from '../lib/storage.js';

export function MultiplayerWaitingView(data) {
  const { code, player, isHost, gameMode } = data || {};

  if (!code) { goBack(); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view';

  const nav = createNavBar('Game Lobby',
    createNavButton('', async () => {
      playTap();
      await leaveRoom(code, isHost);
      goBack();
    }, { icon: true })
  );
  nav.querySelector('.nav-btn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`;
  el.appendChild(nav);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.padding = '20px';
  el.appendChild(scroll);

  // Room code display
  const codeBlock = document.createElement('div');
  codeBlock.className = 'mp-code-block';
  codeBlock.innerHTML = `
    <div class="mp-code-label">ROOM CODE</div>
    <div class="mp-code-value" id="mp-code-display">${code}</div>
    <div class="mp-code-hint">Share this code with your friends</div>
  `;
  scroll.appendChild(codeBlock);

  // Players list
  const playersSection = document.createElement('div');
  playersSection.style.marginTop = '24px';
  playersSection.innerHTML = `<div class="mp-section-header" id="mp-player-count">Players (1)</div>`;
  const playersList = document.createElement('div');
  playersList.id = 'mp-players-list';
  playersList.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
  playersSection.appendChild(playersList);
  scroll.appendChild(playersSection);

  // Role config (host + mafia mode only)
  let roleConfig = null;
  let currentSetup = { roleCounts: { mafia: 1, detective: 0, doctor: 0, jester: 0, civilian: 0 } };

  if (isHost && gameMode === 'mafia') {
    roleConfig = document.createElement('div');
    roleConfig.style.marginTop = '24px';
    roleConfig.innerHTML = `<div class="mp-section-header">Roles</div>`;
    const configInner = document.createElement('div');
    configInner.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
    configInner.id = 'mp-role-config';
    roleConfig.appendChild(configInner);
    scroll.appendChild(roleConfig);
  }

  // Bottom bar
  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = 'padding:16px 20px;padding-bottom:calc(16px + env(safe-area-inset-bottom));background:rgba(0,0,0,0.95);border-top:1px solid rgba(255,255,255,0.08)';

  const statusMsg = document.createElement('div');
  statusMsg.style.cssText = 'text-align:center;color:#888;font-size:14px;margin-bottom:12px;min-height:18px';
  statusMsg.textContent = isHost ? 'Waiting for players to join…' : 'Waiting for host to start…';
  bottomBar.appendChild(statusMsg);

  let startBtn = null;
  if (isHost) {
    startBtn = createGameButton('START GAME', 'default', null);
    startBtn.disabled = true;
    bottomBar.appendChild(startBtn);
  }
  el.appendChild(bottomBar);

  // Role config renderer
  function renderRoleConfig(players) {
    if (!roleConfig) return;
    const total = players.length;
    currentSetup = autoBalanceAllRoles(currentSetup, total);
    const configEl = el.querySelector('#mp-role-config');
    if (!configEl) return;
    configEl.innerHTML = '';

    const roles = [
      { id: 'mafia', icon: '🔫', name: 'Mafia', color: '#ff3b30' },
      { id: 'detective', icon: '🔍', name: 'Detective', color: '#007aff' },
      { id: 'doctor', icon: '💉', name: 'Doctor', color: '#34c759' },
      { id: 'jester', icon: '🃏', name: 'Jester', color: '#af52de' },
      { id: 'civilian', icon: '👤', name: 'Civilian', color: '#8e8e93' },
    ];

    roles.forEach(({ id, icon, name, color }) => {
      const row = document.createElement('div');
      row.className = 'role-config-row';
      row.innerHTML = `
        <div class="role-icon">${icon}</div>
        <div class="role-info">
          <div class="role-name" style="color:${color}">${name}</div>
        </div>
        <div class="counter">
          <button class="rc-dec" data-role="${id}">−</button>
          <div class="count" id="rc-count-${id}">${currentSetup.roleCounts[id]}</div>
          <button class="rc-inc" data-role="${id}">+</button>
        </div>
      `;
      configEl.appendChild(row);
    });

    configEl.querySelectorAll('.rc-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const roleId = btn.dataset.role;
        if (currentSetup.roleCounts[roleId] > (roleId === 'mafia' ? 1 : 0)) {
          currentSetup.roleCounts[roleId]--;
          if (roleId !== 'civilian') {
            const special = ['mafia','detective','doctor','jester'].reduce((s,r) => s + currentSetup.roleCounts[r], 0);
            currentSetup.roleCounts.civilian = Math.max(0, total - special);
          }
          el.querySelector(`#rc-count-${roleId}`).textContent = currentSetup.roleCounts[roleId];
          el.querySelector(`#rc-count-civilian`).textContent = currentSetup.roleCounts.civilian;
          playLight();
        }
      });
    });
    configEl.querySelectorAll('.rc-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const roleId = btn.dataset.role;
        const max = roleId === 'civilian' ? total : Math.floor(total / 2);
        if (currentSetup.roleCounts[roleId] < max) {
          currentSetup.roleCounts[roleId]++;
          if (roleId !== 'civilian') {
            const special = ['mafia','detective','doctor','jester'].reduce((s,r) => s + currentSetup.roleCounts[r], 0);
            currentSetup.roleCounts.civilian = Math.max(0, total - special);
          }
          el.querySelector(`#rc-count-${roleId}`).textContent = currentSetup.roleCounts[roleId];
          el.querySelector(`#rc-count-civilian`).textContent = currentSetup.roleCounts.civilian;
          playLight();
        }
      });
    });
  }

  // Render players list
  function renderPlayers(players) {
    const listEl = el.querySelector('#mp-players-list');
    const countEl = el.querySelector('#mp-player-count');
    if (!listEl) return;
    listEl.innerHTML = '';
    countEl.textContent = `Players (${players.length})`;

    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'mp-player-row';
      const isMe = p.id === deviceId;
      if (isMe) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => { playTap(); openProfileEditor(p); });
      }

      const avatarNode = createAvatar(p, p.avatar || null);
      avatarNode.style.cssText = 'width: 40px; height: 40px; flex-shrink: 0; font-size: 18px;';
      row.appendChild(avatarNode);

      const nameNode = document.createElement('div');
      nameNode.className = 'mp-player-name';
      nameNode.style.flex = '1';
      nameNode.innerHTML = `${p.name}${isMe ? ' <span style="color:#888;font-size:12px;margin-left:6px">(tap to edit)</span>' : ''}`;
      row.appendChild(nameNode);

      if (p.isHost) {
        const hostBadge = document.createElement('div');
        hostBadge.className = 'mp-host-badge';
        hostBadge.textContent = 'HOST';
        row.appendChild(hostBadge);
      }
      listEl.appendChild(row);
    });

    // Auto-balance roles FIRST so currentSetup is correct before validation
    renderRoleConfig(players);

    if (startBtn) {
      const validation = gameMode === 'mafia' ? validateSetup(currentSetup, players.length) : { valid: true, message: '' };
      const minPlayers = gameMode === 'uno' ? 2 : 3;
      startBtn.disabled = !validation.valid || players.length < minPlayers;
      statusMsg.textContent = validation.valid
        ? `${players.length} players ready!`
        : validation.message;
      if (players.length < minPlayers) {
        statusMsg.textContent = `Need at least ${minPlayers} players`;
      }
    }
  }

  // Profile Editor Modal
  function openProfileEditor(currentPlayer) {
    let currentImage = currentPlayer.avatar || null;
    let currentName = currentPlayer.name || '';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:#1a1a1a;border-radius:16px;padding:24px;width:100%;max-width:320px;display:flex;flex-direction:column;gap:20px;align-items:center;border:1px solid rgba(255,255,255,0.1)';

    const title = document.createElement('h3');
    title.textContent = 'Edit Profile';
    title.style.margin = '0';
    card.appendChild(title);

    const photoContainer = document.createElement('div');
    photoContainer.style.cssText = 'position:relative;cursor:pointer;width:80px;height:80px;';
    const avatarPreview = document.createElement('div');
    avatarPreview.className = 'avatar large';
    avatarPreview.style.cssText = 'width:80px;height:80px;border-radius:50%;overflow:hidden;background:#333;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:#fff;';
    
    function updatePreview() {
      if (currentImage) {
        avatarPreview.innerHTML = `<img src="${currentImage}" alt="${currentName}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        avatarPreview.innerHTML = `<span>${currentName.charAt(0).toUpperCase() || '?'}</span>`;
      }
    }
    updatePreview();
    photoContainer.appendChild(avatarPreview);

    const editBadge = document.createElement('div');
    editBadge.style.cssText = 'position:absolute;bottom:-4px;right:-4px;width:28px;height:28px;border-radius:50%;background:#cc1a0a;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;border:2px solid #1a1a1a;';
    editBadge.textContent = '✏️';
    photoContainer.appendChild(editBadge);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      currentImage = await compressImage(file);
      updatePreview();
    });
    photoContainer.appendChild(fileInput);
    photoContainer.addEventListener('click', () => fileInput.click());
    card.appendChild(photoContainer);

    const nameInput = document.createElement('input');
    nameInput.className = 'form-input';
    nameInput.value = currentName;
    nameInput.maxLength = 20;
    nameInput.placeholder = 'Your Name';
    nameInput.style.width = '100%';
    nameInput.addEventListener('input', () => {
      currentName = nameInput.value.trim() || '?';
      if (!currentImage) updatePreview();
    });
    card.appendChild(nameInput);

    const saveBtn = createGameButton('SAVE', 'blue', async () => {
      const newName = nameInput.value.trim();
      if (!newName) { playError(); return; }
      playSuccess();
      await updatePlayerProfile(code, newName, currentImage);
      modal.remove();
    });
    saveBtn.style.width = '100%';
    card.appendChild(saveBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel';
    closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:14px;padding:8px;font-family:inherit;cursor:pointer;';
    closeBtn.addEventListener('click', () => { playTap(); modal.remove(); });
    card.appendChild(closeBtn);

    modal.appendChild(card);
    document.body.appendChild(modal);
  }

  // Subscribe to room updates
  let prevPlayerCount = 0;
  const unsub = subscribeToRoom(code, (room) => {
    if (!room) {
      // Room was deleted (host left)
      navigate('/');
      return;
    }

    const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);

    // Haptic when someone new joins
    if (players.length > prevPlayerCount && prevPlayerCount > 0) {
      playLight();
    }
    prevPlayerCount = players.length;

    renderPlayers(players);

    // Navigate based on status
    if (room.status === 'role-reveal') {
      unsub();
      const myRole = room.roleAssignments?.[deviceId];
      navigate('/mp-role-reveal', { code, room, myRole, isHost });
    } else if (room.status === 'words-reveal') {
      unsub();
      navigate('/mp-word-reveal', { code, room, isHost });
    } else if (room.status === 'uno-playing') {
      unsub();
      navigate('/uno-game', { code, room, isHost });
    }
  });

  // Start game handler
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (startBtn.disabled) return;
      playTap();
      startBtn.disabled = true;
      startBtn.querySelector('.game-btn-label').textContent = 'STARTING…';

      try {
        if (gameMode === 'mafia') {
          const snap = await import('../lib/firebase.js');
          const { getDb } = snap;
          const db = getDb();
          const { get, ref } = await import('firebase/database');
          const roomSnap = await get(ref(db, `rooms/${code}`));
          const room = roomSnap.val();
          room.roleCounts = currentSetup.roleCounts;
          await hostStartMafiaGame(code, room);
        } else if (gameMode === 'uno') {
          const { get, ref } = await import('firebase/database');
          const { getDb } = await import('../lib/firebase.js');
          const roomSnap = await get(ref(getDb(), `rooms/${code}`));
          const room = roomSnap.val();
          await hostStartUnoGame(code, room);
        } else {
          // Words mode — pick a random word
          const words = wordStore.words;
          if (!words.length) { playError(); statusMsg.textContent = 'No words available!'; return; }
          const wordEntry = words[Math.floor(Math.random() * words.length)];
          const { get, ref } = await import('firebase/database');
          const { getDb } = await import('../lib/firebase.js');
          const roomSnap = await get(ref(getDb(), `rooms/${code}`));
          const room = roomSnap.val();
          await hostStartWordsGame(code, room, wordEntry);
        }
        playSuccess();
      } catch (e) {
        playError();
        statusMsg.textContent = 'Failed to start: ' + e.message;
        startBtn.disabled = false;
        startBtn.querySelector('.game-btn-label').textContent = 'START GAME';
      }
    });
  }

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
