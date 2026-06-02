// MultiplayerWordsVotingView.js — Real-time voting for Words Imposter multiplayer
import { navigate } from '../lib/router.js';
import { createNavBar, createNavButton, showConfirmDialog } from '../components/Components.js';
import { playTap, playWarning } from '../lib/haptics.js';
import { subscribeToRoom, setRoomStatus, deviceId } from '../lib/roomStore.js';
import { playerStore } from '../models/Player.js';
import { createAvatar } from '../components/Components.js';

export function MultiplayerWordsVotingView(data) {
  const { code, room: initialRoom, isHost } = data || {};
  if (!code) { navigate('/'); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view';

  const nav = createNavBar('VOTE THE IMPOSTER');
  el.appendChild(nav);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';
  scroll.style.padding = '20px';
  el.appendChild(scroll);

  const hint = document.createElement('div');
  hint.style.cssText = 'color:#888;font-size:14px;text-align:center;margin-bottom:20px';
  hint.textContent = isHost ? 'Tap a player to vote them out as the imposter.' : 'Waiting for the host to vote…';
  scroll.appendChild(hint);

  const grid = document.createElement('div');
  grid.className = 'grid-3';
  scroll.appendChild(grid);

  const word = initialRoom.wordEntry?.word || '';
  const wordInfo = document.createElement('div');
  wordInfo.style.cssText = 'margin-top:24px;padding:16px;background:rgba(0,122,255,0.1);border:1px solid rgba(0,122,255,0.3);border-radius:12px;text-align:center';
  wordInfo.innerHTML = `<div style="color:#888;font-size:12px;margin-bottom:4px">THE WORD WAS</div><div style="font-size:24px;font-weight:800;color:#007aff">${word}</div>`;
  scroll.appendChild(wordInfo);

  function render(room) {
    const players = Object.values(room.players || {});
    grid.innerHTML = '';
    players.forEach(p => {
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

      if (isHost) {
        card.addEventListener('click', () => {
          playTap();
          showConfirmDialog(
            'Vote Out',
            `Is ${p.name} the Imposter?`,
            'Vote Out',
            async () => {
              playWarning();
              const votedPlayerIsImposter = p.id === room.imposterID;
              await setRoomStatus(code, 'words-game-over', {
                votedOutPlayerId: p.id,
                votedOutPlayerName: p.name,
                votedPlayerIsImposter,
                winner: votedPlayerIsImposter ? 'crew' : 'imposter',
              });
            },
            () => {}
          );
        });
      }

      grid.appendChild(card);
    });
  }

  const unsub = subscribeToRoom(code, (updatedRoom) => {
    if (!updatedRoom) { navigate('/'); return; }
    render(updatedRoom);
    if (updatedRoom.status === 'words-game-over') {
      unsub();
      navigate('/mp-words-result', { code, room: updatedRoom, isHost });
    }
  });

  render(initialRoom);

  return {
    element: el,
    cleanup: () => unsub(),
  };
}
