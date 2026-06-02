// WordsVoteResult.js - Typewriter reveal followed by photo and word card
import { navigate } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { historyStore } from '../models/GameHistoryStore.js';
import { playSuccess, playError, playHeavy, playTap } from '../lib/haptics.js';

export function WordsVoteResult(data) {
  const session = data?.session;
  if (!session) {
    navigate('/', null, { replace: true });
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view';
  el.style.background = '#000';

  const voted = session.votedOutPlayer;
  const isImposter = session.votedPlayerIsImposter;

  if (!session._statsRecorded) {
    // Record history
    historyStore.addGame(
      isImposter ? 'Crew Wins' : 'Imposter Wins',
      session.players.length,
      1 // dummy duration
    );

    // Stats update
    session.players.forEach(p => {
      const player = playerStore.getById(p.id);
      if (player) {
        player.gamesPlayed++;
        if (isImposter && p.id !== session.imposterID) player.gamesWon++;
        if (!isImposter && p.id === session.imposterID) player.gamesWon++;
        playerStore.updatePlayer(player);
      }
    });
    session._statsRecorded = true;
  }

  const typewriterView = document.createElement('div');
  typewriterView.className = 'typewriter-view';
  const textEl = document.createElement('div');
  textEl.className = 'typewriter-text';
  typewriterView.appendChild(textEl);
  el.appendChild(typewriterView);

  const fullRevealView = document.createElement('div');
  fullRevealView.className = 'photo-reveal';
  fullRevealView.style.display = 'none';
  fullRevealView.style.opacity = '0';
  fullRevealView.style.transition = 'opacity 0.8s ease';

  const img = playerStore.getImage(voted);
  fullRevealView.innerHTML = `
    <div class="photo-bg">
      ${img ? `<img src="${img}"/>` : `<div style="width:100%;height:100%;background:linear-gradient(135deg, ${isImposter?'#cc1a0a':'#007aff'}, #000)"></div>`}
    </div>
    <div class="top-gradient"></div>
    <div class="tint" style="background:${isImposter ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)'}"></div>
    <div class="top-info">
      <div class="label" style="color:${isImposter ? '#ff3b30' : '#34c759'}">
        ${isImposter ? 'IMPOSTER CAUGHT' : 'WRONG PERSON'}
      </div>
      <div class="name">${voted.name}</div>
    </div>
    <div class="bottom-panel">
      <div class="bottom-fade"></div>
      <div class="bottom-content" id="bottom-content-area"></div>
    </div>
  `;
  el.appendChild(fullRevealView);

  const bottomArea = fullRevealView.querySelector('#bottom-content-area');

  const wordCardHtml = `
    <div class="word-card-result">
      <div class="word-label-sm">THE WORD WAS</div>
      <div class="word-value-sm" style="color:#007aff">${session.selectedWord.word}</div>
      <div class="word-hint-sm">${session.selectedWord.hint}</div>
    </div>
  `;

  if (isImposter) {
    bottomArea.innerHTML = wordCardHtml + `
      <div class="result-buttons">
        <button class="home-btn" onclick="window.location.hash='/';">🏠 Home</button>
        <button class="again-btn" onclick="window.location.hash='/words-setup';">🎮 Play Again</button>
      </div>
    `;
  } else {
    // If wrong, show "Reveal Imposter" button first
    bottomArea.innerHTML = `
      <button class="reveal-imposter-btn" id="reveal-btn">
        <span>Reveal Imposter</span>
        <span style="font-size:20px">👁️</span>
      </button>
    `;
    const revealBtn = bottomArea.querySelector('#reveal-btn');
    revealBtn.onclick = () => {
      playTap();
      const imposterImg = playerStore.getImage(session.imposter);
      fullRevealView.querySelector('.photo-bg').innerHTML = imposterImg 
        ? `<img src="${imposterImg}"/>` 
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg, #cc1a0a, #000)"></div>`;
      fullRevealView.querySelector('.tint').style.background = 'rgba(255,59,48,0.2)';
      fullRevealView.querySelector('.label').textContent = 'THE IMPOSTER WAS';
      fullRevealView.querySelector('.label').style.color = '#ff3b30';
      fullRevealView.querySelector('.name').textContent = session.imposter.name;

      bottomArea.innerHTML = wordCardHtml + `
        <div class="result-buttons">
          <button class="home-btn" onclick="window.location.hash='/';">🏠 Home</button>
          <button class="again-btn" onclick="window.location.hash='/words-setup';">🎮 Play Again</button>
        </div>
      `;
    };
  }

  // Typewriter sequence
  const lines = [
    `${voted.name} was...`,
    isImposter ? 'The Imposter.' : 'Not The Imposter.'
  ];

  let timer1, timer2, timer3;

  requestAnimationFrame(() => {
    // Show line 1
    textEl.textContent = lines[0];
    playHeavy();

    // Show line 2
    timer1 = setTimeout(() => {
      textEl.style.animation = 'none';
      void textEl.offsetWidth; // trigger reflow
      textEl.textContent = lines[1];
      textEl.style.color = isImposter ? '#ff3b30' : '#34c759';
      textEl.style.animation = 'pulseFade 0.35s ease';
      if (isImposter) playSuccess(); else playError();
    }, 2000);

    // Show full reveal
    timer2 = setTimeout(() => {
      typewriterView.style.display = 'none';
      fullRevealView.style.display = 'block';
      void fullRevealView.offsetWidth;
      fullRevealView.style.opacity = '1';
    }, 4500);
  });

  const cleanup = () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
    clearTimeout(timer3);
  };

  return { element: el, cleanup };
}
