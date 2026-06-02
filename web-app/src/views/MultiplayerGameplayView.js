// MultiplayerGameplayView.js — Real-time synced gameplay for multiplayer Mafia
// Host can eliminate players; all devices see live updates
import { navigate } from '../lib/router.js';
import { createNavBar, createNavButton, createAvatar, showConfirmDialog } from '../components/Components.js';
import { playTap, playWarning, playSuccess, playError } from '../lib/haptics.js';
import { subscribeToRoom, eliminatePlayer, setRoomStatus, deviceId } from '../lib/roomStore.js';
import { getRoleById, RoleTeam } from '../models/Role.js';
import { playerStore } from '../models/Player.js';

export function MultiplayerGameplayView(data) {
  const { code, room: initialRoom, isHost } = data || {};
  if (!code) { navigate('/'); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view';

  let currentRoom = initialRoom;

  const nav = createNavBar('MAFIA',
    null,
    isHost ? createNavButton('END', () => {
      showConfirmDialog('End Game', 'End the game for everyone?', 'End Game',
        async () => {
          playWarning();
          await setRoomStatus(code, 'game-over', { winner: { team: 'none', label: 'Game Ended' } });
        },
        () => {}
      );
    }) : null
  );
  el.appendChild(nav);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.padding = '16px';
  el.appendChild(scroll);

  // Status bar
  const statusBar = document.createElement('div');
  statusBar.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center';
  statusBar.id = 'mp-status-bar';
  scroll.appendChild(statusBar);

  // Player grid
  const gridLabel = document.createElement('div');
  gridLabel.style.cssText = 'font-size:12px;color:#888;letter-spacing:1px;margin-bottom:10px';
  gridLabel.textContent = 'TAP A PLAYER TO ELIMINATE (HOST ONLY)';
  if (!isHost) gridLabel.textContent = 'PLAYERS';
  scroll.appendChild(gridLabel);

  const grid = document.createElement('div');
  grid.className = 'grid-3';
  grid.id = 'mp-player-grid';
  scroll.appendChild(grid);

  // Elimination log
  const logLabel = document.createElement('div');
  logLabel.style.cssText = 'font-size:12px;color:#888;letter-spacing:1px;margin:20px 0 10px';
  logLabel.textContent = 'ELIMINATED';
  scroll.appendChild(logLabel);

  const logList = document.createElement('div');
  logList.id = 'mp-elim-log';
  logList.style.cssText = 'display:flex;flex-direction:column;gap:8px';
  scroll.appendChild(logList);

  function render(room) {
    currentRoom = room;
    const players = Object.values(room.players || {});
    const eliminations = Object.values(room.eliminations || {});
    const eliminatedIds = new Set(eliminations.map(e => e.playerId));
    const alivePlayers = players.filter(p => !eliminatedIds.has(p.id));
    const deadPlayers = players.filter(p => eliminatedIds.has(p.id));
    const round = room.round || 1;

    // Status bar
    statusBar.innerHTML = `
      <div style="display:flex;gap:16px">
        <div><span style="color:#888;font-size:12px">Round</span><br><span style="font-size:20px;font-weight:800">${round}</span></div>
        <div><span style="color:#888;font-size:12px">Alive</span><br><span style="font-size:20px;font-weight:800;color:#34c759">${alivePlayers.length}</span></div>
        <div><span style="color:#888;font-size:12px">Dead</span><br><span style="font-size:20px;font-weight:800;color:#ff3b30">${deadPlayers.length}</span></div>
      </div>
      ${isHost ? `<button id="mp-next-round" style="background:rgba(255,128,0,0.2);border:1px solid rgba(255,128,0,0.4);border-radius:8px;color:#ff8000;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">NEXT ROUND →</button>` : ''}
    `;

    if (isHost) {
      statusBar.querySelector('#mp-next-round')?.addEventListener('click', async () => {
        playTap();
        await setRoomStatus(code, 'gameplay', { round: (currentRoom.round || 1) + 1 });
      });
    }

    // Player grid
    grid.innerHTML = '';
    alivePlayers.forEach(p => {
      const card = document.createElement('button');
      card.className = 'player-game-card';
      card.disabled = !isHost;

      const img = playerStore.getImage(p);
      const avatar = createAvatar(p, img, 'xl');
      card.appendChild(avatar);

      const name = document.createElement('div');
      name.className = 'player-name';
      name.textContent = p.name;
      card.appendChild(name);

      if (p.id === deviceId) {
        const meBadge = document.createElement('div');
        meBadge.style.cssText = 'font-size:10px;color:#ff8000;font-weight:700';
        meBadge.textContent = 'YOU';
        card.appendChild(meBadge);
      }

      if (isHost) {
        card.addEventListener('click', () => {
          playTap();
          showConfirmDialog(
            'Eliminate Player',
            `Eliminate ${p.name}?`,
            'Eliminate',
            async () => {
              playWarning();
              await eliminatePlayer(code, p, 'voted', currentRoom.round || 1);
              // Check win condition
              checkWinCondition({ ...currentRoom, eliminations: { ...currentRoom.eliminations, [Date.now()]: { playerId: p.id, playerName: p.name, method: 'voted' } } }, players);
            },
            () => {}
          );
        });
      }

      grid.appendChild(card);
    });

    // Elimination log
    logList.innerHTML = '';
    eliminations.forEach(elim => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,59,48,0.1);border-radius:10px;border:1px solid rgba(255,59,48,0.2)';
      row.innerHTML = `
        <span style="font-size:20px">💀</span>
        <div>
          <div style="font-weight:700">${elim.playerName}</div>
          <div style="font-size:12px;color:#888">${elim.method === 'voted' ? 'Voted out' : 'Eliminated'}</div>
        </div>
      `;
      logList.appendChild(row);
    });
  }

  function checkWinCondition(room, allPlayers) {
    const elimIds = new Set(Object.values(room.eliminations || {}).map(e => e.playerId));
    const alive = allPlayers.filter(p => !elimIds.has(p.id));
    const aliveRoles = alive.map(p => getRoleById(room.roleAssignments?.[p.id]));
    const aliveMafia = aliveRoles.filter(r => r.team === RoleTeam.MAFIA).length;
    const aliveCrew = aliveRoles.filter(r => r.team === RoleTeam.CREW).length;

    if (aliveMafia === 0) {
      setRoomStatus(code, 'game-over', { winner: { team: 'crew', label: 'Crew Wins!' } });
    } else if (aliveMafia >= aliveCrew) {
      setRoomStatus(code, 'game-over', { winner: { team: 'mafia', label: 'Mafia Wins!' } });
    }
  }

  const unsub = subscribeToRoom(code, (updatedRoom) => {
    if (!updatedRoom) { navigate('/'); return; }
    render(updatedRoom);
    if (updatedRoom.status === 'game-over') {
      unsub();
      navigate('/mp-game-over', { code, room: updatedRoom, isHost });
    }
  });

  render(initialRoom);

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
