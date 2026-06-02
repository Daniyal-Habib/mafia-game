// SettingsView.js - Game settings toggles
import { navigate, goBack } from '../lib/router.js';
import { globalSettings } from '../models/GlobalSettings.js';
import { createNavBar, createBackButton } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';

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
