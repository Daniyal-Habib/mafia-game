// MultiplayerLobbyView.js — Entry point: Create Room or Join Room
import { navigate, goBack } from '../lib/router.js';
import { createGameButton, createNavBar, createNavButton } from '../components/Components.js';
import { playTap, playSuccess, playError } from '../lib/haptics.js';
import { createRoom, joinRoom } from '../lib/roomStore.js';
import { initFirebase } from '../lib/firebase.js';

export function MultiplayerLobbyView() {
  const el = document.createElement('div');
  el.className = 'view';

  // Check Firebase config
  const db = initFirebase();
  if (!db || db === null) {
    renderSetupRequired(el);
    return { element: el };
  }

  const nav = createNavBar('Online Multiplayer',
    createNavButton('', () => { playTap(); goBack(); }, { icon: true })
  );
  nav.querySelector('.nav-btn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  el.appendChild(nav);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.padding = '24px 20px';

  // Mode selector state
  let mode = 'create'; // 'create' | 'join'
  let isLoading = false;

  // Render the two-tab toggle
  const tabs = document.createElement('div');
  tabs.className = 'mp-tabs';
  tabs.innerHTML = `
    <button class="mp-tab active" data-tab="create">Create Room</button>
    <button class="mp-tab" data-tab="join">Join Room</button>
  `;
  scroll.appendChild(tabs);

  const formArea = document.createElement('div');
  formArea.style.marginTop = '28px';
  scroll.appendChild(formArea);

  function renderCreateForm() {
    formArea.innerHTML = `
      <div class="mp-section-header">🎮 Create a new game room</div>
      <p class="mp-hint">You'll get a 4-letter code to share with friends.</p>

      <div style="margin-top:24px">
        <div class="form-label" style="margin-bottom:8px">YOUR NAME</div>
        <input id="mp-host-name" class="form-input" type="text" placeholder="Enter your name" maxlength="20" autocomplete="off" />
      </div>

      <div style="margin-top:20px">
        <div class="form-label" style="margin-bottom:10px">GAME MODE</div>
        <div class="mp-mode-grid" id="mp-mode-grid">
          <button class="mp-mode-card active" data-mode="mafia">
            <div class="mp-mode-icon">🔫</div>
            <div class="mp-mode-name">Mafia</div>
            <div class="mp-mode-desc">Find the killers</div>
          </button>
          <button class="mp-mode-card" data-mode="words">
            <div class="mp-mode-icon">🕵️</div>
            <div class="mp-mode-name">Words Imposter</div>
            <div class="mp-mode-desc">Spot the fake</div>
          </button>
          <button class="mp-mode-card" data-mode="uno">
            <div class="mp-mode-icon">🃏</div>
            <div class="mp-mode-name">UNO</div>
            <div class="mp-mode-desc">Classic card game</div>
          </button>
        </div>
      </div>
    `;

    const modeGrid = formArea.querySelector('#mp-mode-grid');
    modeGrid.querySelectorAll('.mp-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        playTap();
        modeGrid.querySelectorAll('.mp-mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
      });
    });
  }

  let selectedMode = 'mafia';

  function renderJoinForm() {
    formArea.innerHTML = `
      <div class="mp-section-header">🚪 Join a game room</div>
      <p class="mp-hint">Enter the 4-letter room code from the host's screen.</p>

      <div style="margin-top:24px">
        <div class="form-label" style="margin-bottom:8px">YOUR NAME</div>
        <input id="mp-join-name" class="form-input" type="text" placeholder="Enter your name" maxlength="20" autocomplete="off" />
      </div>

      <div style="margin-top:20px">
        <div class="form-label" style="margin-bottom:8px">ROOM CODE</div>
        <input id="mp-room-code" class="form-input" type="text" placeholder="ABCD" maxlength="4"
          style="letter-spacing:8px;font-size:28px;font-weight:800;text-align:center;text-transform:uppercase" autocomplete="off" />
      </div>
    `;

    // Auto-uppercase
    const codeInput = formArea.querySelector('#mp-room-code');
    codeInput.addEventListener('input', () => {
      const v = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
      codeInput.value = v;
    });
  }

  // Tab switching
  tabs.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      playTap();
      mode = tab.dataset.tab;
      tabs.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (mode === 'create') renderCreateForm();
      else renderJoinForm();
      updateBottomBtn();
    });
  });

  renderCreateForm();
  el.appendChild(scroll);

  // Bottom action bar
  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = 'padding:16px 20px;padding-bottom:calc(16px + env(safe-area-inset-bottom));background:rgba(0,0,0,0.95);border-top:1px solid rgba(255,255,255,0.08)';

  const actionBtn = createGameButton('CREATE ROOM', 'purple', null);
  bottomBar.appendChild(actionBtn);
  el.appendChild(bottomBar);

  const errorMsg = document.createElement('div');
  errorMsg.style.cssText = 'color:#ff3b30;font-size:13px;text-align:center;margin-top:8px;min-height:18px;padding:0 20px';
  bottomBar.appendChild(errorMsg);

  function updateBottomBtn() {
    const label = mode === 'create' ? 'CREATE ROOM' : 'JOIN ROOM';
    actionBtn.querySelector('.game-btn-label').textContent = label;
  }

  actionBtn.addEventListener('click', async () => {
    if (isLoading) return;
    errorMsg.textContent = '';

    if (mode === 'create') {
      const nameInput = formArea.querySelector('#mp-host-name');
      const name = nameInput?.value.trim();
      if (!name) { playError(); errorMsg.textContent = 'Please enter your name'; return; }

      isLoading = true;
      actionBtn.querySelector('.game-btn-label').textContent = 'CREATING...';
      actionBtn.disabled = true;

      try {
        const { code, player } = await createRoom({ playerName: name, gameMode: selectedMode });
        playSuccess();
        navigate('/mp-waiting', { code, player, isHost: true, gameMode: selectedMode });
      } catch (e) {
        playError();
        errorMsg.textContent = e.message || 'Failed to create room';
      } finally {
        isLoading = false;
        actionBtn.querySelector('.game-btn-label').textContent = 'CREATE ROOM';
        actionBtn.disabled = false;
      }
    } else {
      const nameInput = formArea.querySelector('#mp-join-name');
      const codeInput = formArea.querySelector('#mp-room-code');
      const name = nameInput?.value.trim();
      const code = codeInput?.value.trim().toUpperCase();

      if (!name) { playError(); errorMsg.textContent = 'Please enter your name'; return; }
      if (!code || code.length !== 4) { playError(); errorMsg.textContent = 'Enter a valid 4-letter code'; return; }

      isLoading = true;
      actionBtn.querySelector('.game-btn-label').textContent = 'JOINING...';
      actionBtn.disabled = true;

      try {
        const { player, room } = await joinRoom(code, name);
        playSuccess();
        navigate('/mp-waiting', { code, player, isHost: false, gameMode: room.gameMode });
      } catch (e) {
        playError();
        errorMsg.textContent = e.message || 'Failed to join room';
      } finally {
        isLoading = false;
        actionBtn.querySelector('.game-btn-label').textContent = 'JOIN ROOM';
        actionBtn.disabled = false;
      }
    }
  });

  return { element: el };
}

function renderSetupRequired(el) {
  const nav = createNavBar('Online Multiplayer',
    createNavButton('', () => goBack(), { icon: true })
  );
  nav.querySelector('.nav-btn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`;
  el.appendChild(nav);

  const content = document.createElement('div');
  content.style.cssText = 'padding:40px 24px;text-align:center';
  content.innerHTML = `
    <div style="font-size:60px;margin-bottom:20px">🔥</div>
    <h2 style="font-size:22px;font-weight:800;margin-bottom:12px">Firebase Setup Required</h2>
    <p style="color:#888;font-size:15px;line-height:1.6;margin-bottom:24px">
      To enable online multiplayer, you need a free Firebase project.<br><br>
      1. Go to <strong style="color:#ff8000">console.firebase.google.com</strong><br>
      2. Create a project → Add a web app<br>
      3. Enable <strong style="color:#ff8000">Realtime Database</strong><br>
      4. Paste your config into <code style="color:#ff8000">src/lib/firebase.js</code>
    </p>
    <div style="background:rgba(255,128,0,0.1);border:1px solid rgba(255,128,0,0.3);border-radius:12px;padding:16px;text-align:left;font-size:12px;color:#ff8000;font-family:monospace">
      apiKey: "...",<br>
      databaseURL: "...",<br>
      projectId: "...",<br>
      appId: "..."
    </div>
  `;
  el.appendChild(content);
}
