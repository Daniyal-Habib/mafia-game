// WordsVotingView.js - Words Imposter voting phase
import { navigate, goBack } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { createNavBar, createNavButton, showConfirmDialog } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';

export function WordsVotingView(data) {
  const session = data?.session;
  if (!session) {
    goBack();
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view';
  
  el.appendChild(createNavBar('Discussion Phase', createNavButton('Quit', () => {
    if(confirm('Quit the game?')) navigate('/', null, {replace:true});
  })));

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  const header = document.createElement('div');
  header.style.cssText = 'padding:24px 16px;text-align:center;';
  header.innerHTML = `
    <div style="font-size:20px;font-weight:700;margin-bottom:8px">Who is the Imposter?</div>
    <div style="font-size:14px;color:#888">Discuss and select the player you suspect.</div>
  `;
  scroll.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid-3';
  
  session.players.forEach(player => {
    const card = document.createElement('button');
    card.className = 'player-game-card';
    
    const img = playerStore.getImage(player);
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar xl';
    if (img) avatarDiv.innerHTML = `<img src="${img}"/>`;
    else avatarDiv.innerHTML = `<span class="avatar-initial">${player.name.charAt(0)}</span>`;
    
    card.appendChild(avatarDiv);
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name';
    nameLabel.textContent = player.name;
    card.appendChild(nameLabel);

    card.onclick = () => {
      playTap();
      showConfirmDialog(
        'VOTE CONFIRMATION',
        `Vote out ${player.name}?`,
        'VOTE OUT',
        () => {
          session.voteOut(player);
          navigate('/words-result', { session }, { replace: true });
        }
      );
    };

    grid.appendChild(card);
  });
  
  scroll.appendChild(grid);
  el.appendChild(scroll);

  return { element: el };
}
