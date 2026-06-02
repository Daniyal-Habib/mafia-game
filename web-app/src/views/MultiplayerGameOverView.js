// MultiplayerGameOverView.js — End screen for both Mafia and Words Imposter multiplayer
import { navigate } from '../lib/router.js';
import { createGameButton } from '../components/Components.js';
import { playSuccess, playError, playTap } from '../lib/haptics.js';
import { leaveRoom, setRoomStatus, deviceId } from '../lib/roomStore.js';
import { subscribeToRoom } from '../lib/roomStore.js';
import { getRoleById, RoleTeam } from '../models/Role.js';

export function MultiplayerGameOverView(data) {
  const { code, room, isHost } = data || {};
  if (!code || !room) { navigate('/'); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view';

  const winner = room.winner || {};
  const isMafiaMode = !room.imposterID || room.status === 'game-over';

  // Determine result
  let isWinner = false;
  let headline = winner.label || 'Game Over';
  let emoji = '🎮';

  if (isMafiaMode) {
    const myRole = getRoleById(room.roleAssignments?.[deviceId]);
    if (winner.team === 'crew' && myRole?.team === RoleTeam.CREW) { isWinner = true; emoji = '👮'; }
    if (winner.team === 'mafia' && myRole?.team === RoleTeam.MAFIA) { isWinner = true; emoji = '🔫'; }
  } else {
    // Words mode
    const iAmImposter = room.imposterID === deviceId;
    const crewWon = room.winner === 'crew';
    isWinner = (crewWon && !iAmImposter) || (!crewWon && iAmImposter);
    headline = crewWon ? 'Crew Found the Imposter!' : 'Imposter Got Away!';
    emoji = crewWon ? '🎉' : '🕵️';
  }

  if (isWinner) playSuccess(); else playError();

  const content = document.createElement('div');
  content.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px 24px;text-align:center;gap:20px';

  // Animated result
  const emojiEl = document.createElement('div');
  emojiEl.style.cssText = 'font-size:80px;animation:bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)';
  emojiEl.textContent = emoji;
  content.appendChild(emojiEl);

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `font-size:32px;font-weight:900;background:linear-gradient(to bottom,${isWinner ? '#ffe680,#ff8000' : '#888,#555'});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`;
  titleEl.textContent = headline;
  content.appendChild(titleEl);

  const youEl = document.createElement('div');
  youEl.style.cssText = `font-size:18px;font-weight:700;color:${isWinner ? '#34c759' : '#ff3b30'}`;
  youEl.textContent = isWinner ? '🏆 You Won!' : '💀 You Lost';
  content.appendChild(youEl);

  // Players + roles reveal
  if (isMafiaMode && room.roleAssignments) {
    const revealBox = document.createElement('div');
    revealBox.style.cssText = 'width:100%;max-width:360px;margin-top:16px;background:rgba(255,255,255,0.05);border-radius:16px;overflow:hidden';
    revealBox.innerHTML = `<div style="padding:10px 16px;font-size:11px;color:#888;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.08)">ROLES REVEALED</div>`;
    Object.values(room.players || {}).forEach(p => {
      const role = getRoleById(room.roleAssignments[p.id]);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05)';
      row.innerHTML = `
        <span style="font-weight:600">${p.name}${p.id === deviceId ? ' <span style="color:#888;font-size:11px">(you)</span>' : ''}</span>
        <span style="color:${role.color}">${role.icon} ${role.name}</span>
      `;
      revealBox.appendChild(row);
    });
    content.appendChild(revealBox);
  }

  // Words mode reveal
  if (!isMafiaMode) {
    const imposterPlayer = Object.values(room.players || {}).find(p => p.id === room.imposterID);
    const votedOut = room.votedOutPlayerName;
    const correct = room.votedPlayerIsImposter;

    const revealBox = document.createElement('div');
    revealBox.style.cssText = 'width:100%;max-width:360px;background:rgba(255,255,255,0.05);border-radius:16px;padding:16px;text-align:left;margin-top:8px';
    revealBox.innerHTML = `
      <div style="font-size:12px;color:#888;margin-bottom:8px">THE WORD WAS</div>
      <div style="font-size:24px;font-weight:800;color:#007aff;margin-bottom:16px">${room.wordEntry?.word || '?'}</div>
      <div style="font-size:12px;color:#888;margin-bottom:6px">THE IMPOSTER WAS</div>
      <div style="font-size:18px;font-weight:700;color:#ff3b30">${imposterPlayer?.name || '?'}</div>
      <div style="font-size:13px;color:#888;margin-top:12px">Crew voted out: <strong style="color:${correct ? '#34c759' : '#ff3b30'}">${votedOut}</strong> ${correct ? '✅' : '❌'}</div>
    `;
    content.appendChild(revealBox);
  }

  // Buttons
  const btns = document.createElement('div');
  btns.style.cssText = 'width:100%;max-width:360px;display:flex;flex-direction:column;gap:12px;margin-top:8px';

  if (isHost) {
    const playAgainBtn = createGameButton('PLAY AGAIN', 'default', async () => {
      playTap();
      await setRoomStatus(code, 'waiting', { roleAssignments: {}, eliminations: {}, winner: null, round: 1 });
      navigate('/mp-waiting', { code, player: Object.values(room.players).find(p => p.id === deviceId), isHost: true, gameMode: room.gameMode || 'mafia' });
    });
    btns.appendChild(playAgainBtn);
  }

  const homeBtn = createGameButton('HOME', 'green', async () => {
    playTap();
    await leaveRoom(code, isHost);
    navigate('/');
  });
  btns.appendChild(homeBtn);
  content.appendChild(btns);

  el.appendChild(content);

  // Subscribe in case other players rejoin
  const unsub = subscribeToRoom(code, (updatedRoom) => {
    if (!updatedRoom) { navigate('/'); }
    if (isHost && updatedRoom?.status === 'waiting') {
      unsub();
      navigate('/mp-waiting', { code, player: Object.values(updatedRoom.players).find(p => p.id === deviceId), isHost: true, gameMode: updatedRoom.gameMode || 'mafia' });
    }
  });

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
