// GameOverView.js - Shows winners and reveals all roles
import { navigate } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { historyStore } from '../models/GameHistoryStore.js';
import { createGameButton } from '../components/Components.js';
import { playSuccess } from '../lib/haptics.js';
import { RoleTeam } from '../models/Role.js';

export function GameOverView(data) {
  const session = data?.session;
  const winState = data?.winState; // { team, label }

  if (!session || !winState) {
    navigate('/', null, { replace: true });
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view';

  if (!session._statsRecorded) {
    // Record history and update player stats
    const duration = session.gameDuration;
    historyStore.addGame(winState.label, session.players.length, duration);

    // Update stats
    session.players.forEach(p => {
      const player = playerStore.getById(p.id);
      if (player) {
        player.gamesPlayed++;
        if (winnerIds.has(player.id)) {
          player.gamesWon++;
        }
        playerStore.updatePlayer(player);
      }
    });

    // Clear save
    session.clearSave();
    session._statsRecorded = true;
  }

  // Background
  const bg = document.createElement('div');
  bg.className = 'game-over-bg';
  if (winState.team === RoleTeam.MAFIA) {
    bg.style.background = 'linear-gradient(to bottom, #800000, #000)';
  } else if (winState.team === RoleTeam.CREW) {
    bg.style.background = 'linear-gradient(to bottom, #1a4d1a, #000)';
  } else {
    bg.style.background = 'linear-gradient(to bottom, #4d1a66, #000)';
  }
  el.appendChild(bg);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.position = 'relative';
  scroll.style.zIndex = '1';
  scroll.style.padding = '0 16px 24px';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;padding:60px 0 30px;';
  header.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:4px;margin-bottom:8px">GAME OVER</div>
    <div style="font-size:42px;font-weight:900;color:#fff;text-shadow:0 4px 12px rgba(0,0,0,0.5)">${winState.label}</div>
  `;
  scroll.appendChild(header);

  // Winners showcase
  const winnersGrid = document.createElement('div');
  winnersGrid.style.cssText = 'display:grid;gap:12px;margin-bottom:40px;';
  
  if (winners.length === 1) {
    winnersGrid.style.gridTemplateColumns = '1fr';
    winnersGrid.style.maxWidth = '250px';
    winnersGrid.style.margin = '0 auto 40px';
  } else if (winners.length === 2) {
    winnersGrid.style.gridTemplateColumns = '1fr 1fr';
  } else {
    winnersGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  winners.forEach(winner => {
    const card = document.createElement('div');
    card.className = 'winner-card';
    card.style.aspectRatio = '3/4';
    card.style.borderColor = winState.team === RoleTeam.MAFIA ? '#ff3b30' : (winState.team === RoleTeam.CREW ? '#34c759' : '#af52de');
    
    const img = playerStore.getImage(winner);
    if (img) {
      card.innerHTML = `<img src="${img}"/>`;
    } else {
      card.innerHTML = `
        <div class="fallback-letter" style="background:${card.style.borderColor};font-size:${winners.length === 1 ? '80px' : '40px'}">
          ${winner.name.charAt(0)}
        </div>
      `;
    }
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'name-overlay';
    nameLabel.textContent = winner.name;
    card.appendChild(nameLabel);
    
    winnersGrid.appendChild(card);
  });
  scroll.appendChild(winnersGrid);

  // All roles reveal
  const rolesHeader = document.createElement('div');
  rolesHeader.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:16px;text-align:center';
  rolesHeader.textContent = 'All Roles';
  scroll.appendChild(rolesHeader);

  const rolesList = document.createElement('div');
  rolesList.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  
  session.players.forEach(p => {
    const role = session.getRoleForPlayer(p.id);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:12px;';
    
    const img = playerStore.getImage(p);
    const avatar = document.createElement('div');
    avatar.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:12px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;';
    if (img) {
      avatar.innerHTML = `<img src="${img}" style="width:100%;height:100%;object-fit:cover"/>`;
    } else {
      avatar.innerHTML = `<span style="font-weight:700">${p.name.charAt(0)}</span>`;
    }
    row.appendChild(avatar);
    
    const infoDiv = document.createElement('div');
    infoDiv.style.flex = '1';
    infoDiv.innerHTML = `
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5)">${winnerIds.has(p.id) ? 'Winner 🏆' : ''}</div>
    `;
    row.appendChild(infoDiv);

    const roleDiv = document.createElement('div');
    roleDiv.style.textAlign = 'right';
    roleDiv.innerHTML = `
        <div style="font-weight:700;color:${role.color}">${role.name}</div>
        <div style="font-size:20px">${role.emoji}</div>
    `;
    row.appendChild(roleDiv);
    
    rolesList.appendChild(row);
  });
  scroll.appendChild(rolesList);

  el.appendChild(scroll);

  // Bottom action
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  const inner = document.createElement('div');
  inner.className = 'bottom-bar-inner';
  inner.style.justifyContent = 'center';

  const homeBtn = createGameButton('BACK TO HOME', 'default', () => {
    navigate('/', null, { replace: true });
  });
  inner.appendChild(homeBtn);
  bottomBar.appendChild(inner);

  el.appendChild(bottomBar);

  setTimeout(() => playSuccess(), 100);

  return { element: el };
}
