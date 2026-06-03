// SettingsView.js - Game settings toggles
import { navigate, goBack } from '../lib/router.js';
import { globalSettings } from '../models/GlobalSettings.js';
import { createNavBar, createBackButton } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';
import { auth, signInWithGoogle, logOut, onUserChange } from '../lib/firebase.js';

export function SettingsView() {
  const el = document.createElement('div');
  el.className = 'view';
  
  el.appendChild(createNavBar('Settings', createBackButton(() => goBack())));

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  function createToggle(label, desc, key) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    
    const labelDiv = document.createElement('div');
    labelDiv.style.flex = '1';
    labelDiv.innerHTML = `<h3>${label}</h3><p>${desc}</p>`;
    row.appendChild(labelDiv);

    const toggle = document.createElement('label');
    toggle.className = 'toggle';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = globalSettings.get(key);
    input.addEventListener('change', () => {
      playTap();
      globalSettings.set(key, input.checked);
    });
    
    toggle.appendChild(input);
    const track = document.createElement('div');
    track.className = 'toggle-track';
    toggle.appendChild(track);
    const thumb = document.createElement('div');
    thumb.className = 'toggle-thumb';
    toggle.appendChild(thumb);

    row.appendChild(toggle);
    return row;
  }

  // --- Account Section ---
  const accountHeader = document.createElement('div');
  accountHeader.className = 'settings-section-header';
  accountHeader.textContent = 'Account & Sync';
  scroll.appendChild(accountHeader);

  const accountSection = document.createElement('div');
  accountSection.className = 'settings-section';
  scroll.appendChild(accountSection);

  function renderAccount(user) {
    accountSection.innerHTML = '';
    if (user) {
      accountSection.innerHTML = `
        <div style="padding:16px;display:flex;align-items:center;gap:12px;">
          <img src="${user.photoURL || ''}" style="width:40px;height:40px;border-radius:50%;background:#333;" />
          <div style="flex:1">
            <h3 style="margin:0;font-size:16px;">${user.displayName || 'Player'}</h3>
            <p style="margin:0;font-size:12px;color:#888;">Cloud Sync Active</p>
          </div>
          <button id="btn-logout" style="background:rgba(255,0,0,0.2);color:#ff4444;border:none;padding:6px 12px;border-radius:6px;font-weight:bold;">Sign Out</button>
        </div>
      `;
      accountSection.querySelector('#btn-logout').addEventListener('click', async () => {
        playTap();
        await logOut();
      });
    } else {
      accountSection.innerHTML = `
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;">
          <p style="margin:0;color:#888;font-size:14px;">Sign in to sync your players, words, and history across devices.</p>
          <button id="btn-login" style="background:#fff;color:#3c4043;border:1px solid #dadce0;padding:8px 16px;border-radius:4px;font-family:Roboto, Arial, sans-serif;font-weight:500;font-size:14px;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:0 1px 2px 0 rgba(60,64,67,0.3);">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      `;
      accountSection.querySelector('#btn-login').addEventListener('click', async () => {
        playTap();
        try {
          await signInWithGoogle();
        } catch(e) {}
      });
    }
  }

  // Initial render + listener
  renderAccount(auth?.currentUser || null);
  onUserChange((user) => renderAccount(user));

  // --- Gameplay Section ---
  const gameplayHeader = document.createElement('div');
  gameplayHeader.className = 'settings-section-header';
  gameplayHeader.textContent = 'Gameplay';
  scroll.appendChild(gameplayHeader);

  const gameplaySection = document.createElement('div');
  gameplaySection.className = 'settings-section';

  gameplaySection.appendChild(createToggle(
    'Reveal Role on Elimination',
    'Show a player\'s role to everyone when they are eliminated',
    'revealMafiaOnElimination'
  ));
  
  gameplaySection.appendChild(document.createElement('div')).className = 'settings-divider';

  const timerToggleRow = createToggle(
    'Turn Timer',
    'Enable a countdown timer for discussions',
    'turnTimerEnabled'
  );
  gameplaySection.appendChild(timerToggleRow);

  const timerDurRow = document.createElement('div');
  timerDurRow.className = 'settings-row';
  timerDurRow.style.display = globalSettings.get('turnTimerEnabled') ? 'flex' : 'none';
  timerDurRow.innerHTML = `
    <div style="flex:1"><h3>Timer Duration</h3><p>Time allowed per round</p></div>
    <select style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:8px;border-radius:8px;font-size:16px;">
      <option value="60">1 Minute</option>
      <option value="120">2 Minutes</option>
      <option value="180">3 Minutes</option>
      <option value="300">5 Minutes</option>
    </select>
  `;
  const select = timerDurRow.querySelector('select');
  select.value = globalSettings.get('turnTimerDuration').toString();
  select.addEventListener('change', () => {
    globalSettings.set('turnTimerDuration', parseInt(select.value, 10));
  });

  const timerInput = timerToggleRow.querySelector('input');
  timerInput.addEventListener('change', () => {
    timerDurRow.style.display = timerInput.checked ? 'flex' : 'none';
  });

  gameplaySection.appendChild(timerDurRow);

  scroll.appendChild(gameplaySection);

  // --- Haptics Section ---
  const hapticsHeader = document.createElement('div');
  hapticsHeader.className = 'settings-section-header';
  hapticsHeader.textContent = 'Feedback';
  scroll.appendChild(hapticsHeader);

  const hapticsSection = document.createElement('div');
  hapticsSection.className = 'settings-section';

  hapticsSection.appendChild(createToggle(
    'Haptic Feedback',
    'Vibrations on buttons and gestures',
    'hapticsEnabled'
  ));

  scroll.appendChild(hapticsSection);

  // --- About Section ---
  const aboutHeader = document.createElement('div');
  aboutHeader.className = 'settings-section-header';
  aboutHeader.textContent = 'About';
  scroll.appendChild(aboutHeader);

  const aboutSection = document.createElement('div');
  aboutSection.className = 'settings-section';
  aboutSection.innerHTML = `
    <div style="padding:16px;text-align:center;">
      <div style="font-size:40px;margin-bottom:8px">🎭</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:4px">Mafia Amongus</h3>
      <p style="font-size:13px;color:#888;margin-bottom:16px">Version 2.0 Web Edition</p>
      <p style="font-size:13px;color:rgba(255,255,255,0.6)">The ultimate social deduction party game. Find the mafia before they find you.</p>
    </div>
  `;
  scroll.appendChild(aboutSection);

  el.appendChild(scroll);

  return { element: el };
}
