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
          <button id="btn-login" style="background:#4285F4;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;display:flex;align-items:center;gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
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
