// GameplayView.js - Live game grid, timer, eliminate, undo
import { navigate, goBack } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { createNavBar, createNavButton, createGameButton, createModal } from '../components/Components.js';
import { globalSettings } from '../models/GlobalSettings.js';
import { playTap, playHeavy } from '../lib/haptics.js';
import { loadActiveGame } from '../lib/storage.js';
import { GameSession } from '../models/GameSession.js';

export function GameplayView(data) {
  let session = data?.session;
  
  if (data?.resume) {
    const saved = loadActiveGame();
    if (saved) {
      session = new GameSession();
      session.loadFromSave(saved);
    }
  }

  if (!session) {
    goBack();
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view';
  
  // Right-side nav buttons container (gear + undo)
  const rightNavContainer = document.createElement('div');
  rightNavContainer.style.cssText = 'display:flex;align-items:center;gap:4px;';

  const gearBtn = document.createElement('button');
  gearBtn.className = 'nav-btn icon-btn';
  gearBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;
  gearBtn.onclick = () => {
    playTap();
    showSettingsModal();
  };
  rightNavContainer.appendChild(gearBtn);

  const undoBtn = createNavButton('Undo', () => {
    playTap();
    if (session.undoLastElimination()) {
      render();
    }
  });
  rightNavContainer.appendChild(undoBtn);

  const nav = createNavBar('Day ' + session.round,
    createNavButton('Quit', () => {
      if(confirm('Quit the current game?')) {
        session.clearSave();
        navigate('/', null, {replace: true});
      }
    }),
    rightNavContainer
  );
  el.appendChild(nav);

  // --- In-game Settings Modal ---
  function showSettingsModal() {
    const content = document.createElement('div');
    content.style.padding = '24px 16px 40px';

    const title = document.createElement('h3');
    title.style.cssText = 'font-size:20px;font-weight:700;text-align:center;margin-bottom:24px;color:#fff;';
    title.textContent = 'Game Settings';
    content.appendChild(title);

    // Toggle row for Reveal Role on Elimination
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.1);';

    const toggleLabel = document.createElement('div');
    toggleLabel.style.cssText = 'font-size:16px;font-weight:500;color:#fff;';
    toggleLabel.textContent = 'Reveal Role on Elimination';
    toggleRow.appendChild(toggleLabel);

    const toggle = document.createElement('label');
    toggle.style.cssText = 'position:relative;display:inline-block;width:51px;height:31px;flex-shrink:0;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!globalSettings.get('revealMafiaOnElimination');
    checkbox.style.cssText = 'opacity:0;width:0;height:0;';
    const slider = document.createElement('span');
    slider.style.cssText = `position:absolute;cursor:pointer;inset:0;border-radius:31px;transition:0.3s;background:${checkbox.checked ? 'var(--green, #34c759)' : 'rgba(255,255,255,0.2)'};`;
    const knob = document.createElement('span');
    knob.style.cssText = `position:absolute;height:27px;width:27px;left:${checkbox.checked ? '22px' : '2px'};bottom:2px;border-radius:50%;background:#fff;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
    slider.appendChild(knob);
    toggle.appendChild(checkbox);
    toggle.appendChild(slider);

    checkbox.addEventListener('change', () => {
      playTap();
      globalSettings.set('revealMafiaOnElimination', checkbox.checked);
      slider.style.background = checkbox.checked ? 'var(--green, #34c759)' : 'rgba(255,255,255,0.2)';
      knob.style.left = checkbox.checked ? '22px' : '2px';
      renderGrid();
    });

    toggleRow.appendChild(toggle);
    content.appendChild(toggleRow);

    const modal = createModal(content, () => modal.remove());
    document.body.appendChild(modal);
  }

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.padding = '16px';

  // --- Stats Bar ---
  const statsBar = document.createElement('div');
  statsBar.style.cssText = 'display:flex;gap:12px;margin-bottom:24px;';
  scroll.appendChild(statsBar);

  // --- Grid ---
  const grid = document.createElement('div');
  grid.className = 'grid-3';
  scroll.appendChild(grid);

  let longPressTimer = null;
  let pressingPlayer = null;
  let rolesOverlay = null;

  function showRolesOverlay() {
    rolesOverlay = document.createElement('div');
    rolesOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:200;display:flex;flex-direction:column;padding:60px 20px;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'position:absolute;top:40px;right:20px;background:none;border:none;color:#fff;font-size:17px;font-weight:600;';
    closeBtn.onclick = () => { playTap(); rolesOverlay.remove(); };
    rolesOverlay.appendChild(closeBtn);

    const title = document.createElement('div');
    title.style.cssText = 'font-size:24px;font-weight:700;color:#fff;margin-bottom:24px;';
    title.textContent = 'Role Overview';
    rolesOverlay.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;flex:1;';
    
    session.players.forEach(p => {
      const role = session.getRoleForPlayer(p.id);
      const isDead = !session.isAlive(p.id);
      
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.1);${isDead ? 'opacity:0.5' : ''}`;
      
      row.innerHTML = `
        <div style="font-size:24px;width:40px">${role.emoji}</div>
        <div style="flex:1">
          <div style="font-weight:600;color:${role.color}">${role.name}</div>
          <div style="font-size:14px;color:#fff">${p.name}</div>
        </div>
        ${isDead ? '<div style="font-size:12px;color:#ff3b30;font-weight:700">DEAD</div>' : ''}
      `;
      list.appendChild(row);
    });

    rolesOverlay.appendChild(list);
    document.body.appendChild(rolesOverlay);
    playHeavy();
  }

  function renderGrid() {
    grid.innerHTML = '';
    session.players.forEach(player => {
      const isAlive = session.isAlive(player.id);
      const card = document.createElement('button');
      card.className = `player-game-card ${!isAlive ? 'dead' : ''}`;
      
      const img = playerStore.getImage(player);
      const avatarDiv = document.createElement('div');
      avatarDiv.style.position = 'relative';
      
      const avatar = document.createElement('div');
      avatar.className = 'avatar xl';
      if (img) avatar.innerHTML = `<img src="${img}"/>`;
      else avatar.innerHTML = `<span class="avatar-initial">${player.name.charAt(0)}</span>`;
      avatarDiv.appendChild(avatar);

      if (!isAlive) {
        const overlay = document.createElement('div');
        overlay.className = 'dead-overlay';
        overlay.innerHTML = '☠️';
        avatarDiv.appendChild(overlay);
      }

      card.appendChild(avatarDiv);

      const nameLabel = document.createElement('div');
      nameLabel.className = 'player-name';
      nameLabel.textContent = player.name;
      card.appendChild(nameLabel);

      if (isAlive) {
        card.onclick = () => {
          playTap();
          showEliminateSheet(player);
        };
      } else if (globalSettings.get('revealMafiaOnElimination')) {
        const role = session.getRoleForPlayer(player.id);
        const roleLabel = document.createElement('div');
        roleLabel.style.cssText = `font-size:10px;font-weight:700;color:${role.color};margin-top:4px`;
        roleLabel.textContent = role.name.toUpperCase();
        card.appendChild(roleLabel);
      }

      grid.appendChild(card);
    });
  }

  function showEliminateSheet(player) {
    const content = document.createElement('div');
    content.style.padding = '24px 16px 40px';
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:24px">
        <h3 style="font-size:20px;font-weight:700;margin-bottom:8px">Eliminate ${player.name}?</h3>
        <p style="font-size:14px;color:#888">Select how they were eliminated.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;"></div>
    `;

    const btnsContainer = content.querySelector('div:last-child');

    const killBtn = createGameButton('NIGHT KILL', 'default', () => {
      modal.remove();
      doEliminate(player, 'killed');
    });
    
    const voteBtn = createGameButton('VOTED OUT', 'blue', () => {
      modal.remove();
      doEliminate(player, 'voted');
    });

    btnsContainer.appendChild(killBtn);
    btnsContainer.appendChild(voteBtn);

    const modal = createModal(content, () => modal.remove());
    document.body.appendChild(modal);
  }

  function doEliminate(player, method) {
    const record = session.eliminatePlayer(player, method);
    const winState = session.checkWinCondition();
    
    navigate('/elimination', { session, record, winState });
  }

  function renderStats() {
    const aliveCount = session.alivePlayers.length;
    const deadCount = session.deadPlayers.length;

    statsBar.innerHTML = `
      <div class="stat-pill" style="flex:1;justify-content:center">
        <span class="pill-value" style="color:var(--green)">${aliveCount}</span>
        <span class="pill-label">Alive</span>
      </div>
      <div class="stat-pill" style="flex:1;justify-content:center">
        <span class="pill-value" style="color:var(--red)">${deadCount}</span>
        <span class="pill-label">Dead</span>
      </div>
    `;
  }

  function render() {
    nav.querySelector('h1').textContent = 'Day ' + session.round;
    const undoBtn = nav.querySelector('div:last-child button');
    if (undoBtn) undoBtn.style.opacity = session.undoStack.length > 0 ? '1' : '0.3';
    if (undoBtn) undoBtn.disabled = session.undoStack.length === 0;

    renderStats();
    renderGrid();
  }

  render();
  el.appendChild(scroll);

  // --- Bottom area ---
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  bottomBar.style.flexDirection = 'column';
  bottomBar.style.alignItems = 'stretch';
  bottomBar.style.padding = '16px';
  bottomBar.style.gap = '12px';

  // Timer
  let timerInterval = null;
  let timeRemaining = globalSettings.get('turnTimerDuration');
  let isTimerRunning = false;

  if (globalSettings.get('turnTimerEnabled')) {
    const timerRow = document.createElement('div');
    timerRow.style.cssText = 'display:flex;align-items:center;background:rgba(255,255,255,0.1);border-radius:12px;padding:12px 16px;gap:16px;';
    
    const timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = 'font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;flex:1;';
    
    function formatTime(secs) {
      const m = Math.floor(secs/60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    
    timeDisplay.textContent = formatTime(timeRemaining);
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.style.cssText = 'background:none;border:none;color:var(--orange);font-size:20px;';
    playPauseBtn.textContent = '▶️';
    
    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = 'background:none;border:none;color:#888;font-size:20px;';
    resetBtn.textContent = '↺';

    function updateTimer() {
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        playPauseBtn.textContent = '▶️';
        timeDisplay.style.color = '#fff';
        playHeavy();
        return;
      }
      timeRemaining--;
      timeDisplay.textContent = formatTime(timeRemaining);

      // Warning color when under 10 seconds
      if (timeRemaining < 10) {
        timeDisplay.style.color = '#ff3b30';
      } else {
        timeDisplay.style.color = '#fff';
      }

      // Haptic warning ticks in the last 5 seconds
      if (timeRemaining <= 5 && timeRemaining > 0) {
        playTap();
      }
    }

    playPauseBtn.onclick = () => {
      playTap();
      if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        playPauseBtn.textContent = '▶️';
      } else {
        if (timeRemaining <= 0) timeRemaining = globalSettings.get('turnTimerDuration');
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        playPauseBtn.textContent = '⏸️';
      }
    };

    resetBtn.onclick = () => {
      playTap();
      timeRemaining = globalSettings.get('turnTimerDuration');
      timeDisplay.textContent = formatTime(timeRemaining);
      if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        playPauseBtn.textContent = '▶️';
      }
    };

    timerRow.appendChild(timeDisplay);
    timerRow.appendChild(playPauseBtn);
    timerRow.appendChild(resetBtn);
    bottomBar.appendChild(timerRow);
  }

  // Next Round / Role Reveal button
  const bottomActionRow = document.createElement('div');
  bottomActionRow.style.cssText = 'display:flex;gap:12px;';

  const longPressBtn = document.createElement('button');
  longPressBtn.className = 'long-press-btn';
  longPressBtn.style.flex = '1';
  longPressBtn.innerHTML = `
    <div class="long-press-circle">
      <svg><circle class="track" cx="20" cy="20" r="16"/><circle class="progress-ring" cx="20" cy="20" r="16" stroke-dasharray="100" stroke-dashoffset="100"/></svg>
      <div class="long-press-eye">👁️</div>
    </div>
    <div style="font-size:15px;font-weight:600;color:#fff;">Hold for Roles</div>
  `;

  const ring = longPressBtn.querySelector('.progress-ring');
  let progress = 0;

  function updateRing() {
    progress += 5; // 5% per tick
    if (progress >= 100) {
      clearInterval(longPressTimer);
      progress = 0;
      longPressBtn.classList.remove('pressing');
      ring.style.strokeDashoffset = '100';
      showRolesOverlay();
    } else {
      ring.style.strokeDashoffset = 100 - progress;
    }
  }

  const startPress = (e) => {
    e.preventDefault();
    if(longPressTimer) return;
    longPressBtn.classList.add('pressing');
    progress = 0;
    longPressTimer = setInterval(updateRing, 50); // 1 sec total
  };

  const endPress = (e) => {
    e.preventDefault();
    clearInterval(longPressTimer);
    longPressTimer = null;
    progress = 0;
    longPressBtn.classList.remove('pressing');
    ring.style.strokeDashoffset = '100';
  };

  longPressBtn.addEventListener('touchstart', startPress);
  longPressBtn.addEventListener('touchend', endPress);
  longPressBtn.addEventListener('touchcancel', endPress);
  longPressBtn.addEventListener('mousedown', startPress);
  longPressBtn.addEventListener('mouseup', endPress);
  longPressBtn.addEventListener('mouseleave', endPress);

  bottomActionRow.appendChild(longPressBtn);

  const nextRoundBtn = createGameButton('NEXT DAY', 'default', () => {
    playTap();
    session.round++;
    session.saveGame();
    render();
  }, {small: true});
  nextRoundBtn.style.flex = '1';
  bottomActionRow.appendChild(nextRoundBtn);

  bottomBar.appendChild(bottomActionRow);

  el.appendChild(bottomBar);

  const cleanup = () => {
    if (timerInterval) clearInterval(timerInterval);
    if (longPressTimer) clearInterval(longPressTimer);
  };

  return { element: el, cleanup };
}
