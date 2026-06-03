// HomeView — mirrors iOS HomeView.swift exactly
import { navigate } from '../lib/router.js';
import { createGameButton } from '../components/Components.js';
import { playerStore } from '../models/Player.js';
import { hasActiveGame } from '../lib/storage.js';
import { playTap } from '../lib/haptics.js';

export function HomeView() {
  const el = document.createElement('div');
  el.className = 'view';
  el.style.overflow = 'hidden';

  // Background image
  const bg = document.createElement('div');
  bg.style.cssText = 'position:absolute;inset:0;z-index:0;';
  bg.innerHTML = `
    <img src="/HomeBackground.jpg" alt="" style="width:100%;height:100%;object-fit:cover;opacity:0.6" draggable="false" />
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8))"></div>
  `;
  el.appendChild(bg);

  // Content
  const content = document.createElement('div');
  content.style.cssText = 'position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:0 20px;';

  // Spacer top
  const spacerTop = document.createElement('div');
  spacerTop.style.flex = '1';
  content.appendChild(spacerTop);

  // Buttons container
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:400px;margin:0 auto;width:100%;';

  // Resume Game (conditional)
  if (hasActiveGame()) {
    const resumeBtn = createGameButton('RESUME GAME', 'livegreen', () => {
      playTap();
      navigate('/gameplay', { resume: true });
    });
    buttons.appendChild(resumeBtn);
  }

  // New Game
  const newGameBtn = createGameButton('MAFIA GAME', 'default', () => {
    playTap();
    if (playerStore.players.length === 0) {
      navigate('/players');
    } else {
      navigate('/new-game');
    }
  });
  buttons.appendChild(newGameBtn);

  // Words Imposter
  const wordsBtn = createGameButton('WORDS IMPOSTER', 'blue', () => {
    playTap();
    if (playerStore.players.length === 0) {
      navigate('/players');
    } else {
      navigate('/words-setup');
    }
  });
  buttons.appendChild(wordsBtn);

  // Online Multiplayer
  const multiplayerBtn = createGameButton('🌐 ONLINE MULTIPLAYER', 'purple', () => {
    playTap();
    navigate('/multiplayer');
  });
  buttons.appendChild(multiplayerBtn);

  // Players
  const playersBtn = createGameButton('PLAYERS', 'green', () => {
    playTap();
    navigate('/players');
  });
  buttons.appendChild(playersBtn);

  content.appendChild(buttons);

  // Bottom row: Settings, History
  const bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex;justify-content:center;gap:32px;padding:24px 0 16px;';

  const settingsBtn = document.createElement('button');
  settingsBtn.style.cssText = 'background:none;border:none;color:#888;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;';
  settingsBtn.innerHTML = '⚙️ Settings';
  settingsBtn.addEventListener('click', () => { playTap(); navigate('/settings'); });
  bottomRow.appendChild(settingsBtn);

  const historyBtn = document.createElement('button');
  historyBtn.style.cssText = 'background:none;border:none;color:#888;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;';
  historyBtn.innerHTML = '📊 History';
  historyBtn.addEventListener('click', () => { playTap(); navigate('/history'); });
  bottomRow.appendChild(historyBtn);

  content.appendChild(bottomRow);

  // Version footer
  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:8px 0 20px;font-size:10px;color:rgba(255,255,255,0.25);';
  footer.textContent = 'MAFIA AMONGUS v2.0 · by Daniyal';
  content.appendChild(footer);

  el.appendChild(content);
  return { element: el };
}
