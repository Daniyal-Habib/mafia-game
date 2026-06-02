// WordsImposterSetup.js - Words Imposter player select + start
import { navigate, goBack } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { wordStore } from '../models/WordStore.js';
import { WordsGameSession } from '../models/WordsGameSession.js';
import { createNavBar, createBackButton, createPlayerSelectCard, createGameButton } from '../components/Components.js';
import { playTap, playSuccess } from '../lib/haptics.js';

export function WordsImposterSetup() {
  const el = document.createElement('div');
  el.className = 'view';
  
  el.appendChild(createNavBar('Words Setup', createBackButton(() => goBack())));

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  let selectedIds = new Set();

  function render() {
    scroll.innerHTML = '';
    const totalPlayers = selectedIds.size;

    // Words Library Banner
    const wordsBanner = document.createElement('div');
    wordsBanner.style.cssText = 'margin:16px;padding:16px;background:linear-gradient(135deg, rgba(0,122,255,0.2), rgba(0,64,128,0.4));border:1px solid rgba(0,122,255,0.3);border-radius:16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;';
    wordsBanner.innerHTML = `
      <div>
        <div style="font-size:16px;font-weight:700;color:#fff">Words Library</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">${wordStore.allWords.length} words available</div>
      </div>
      <div style="font-size:24px;color:#007aff">›</div>
    `;
    wordsBanner.onclick = () => { playTap(); navigate('/words-manage'); };
    scroll.appendChild(wordsBanner);

    // Player Selection
    const selectHeader = document.createElement('div');
    selectHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;';
    selectHeader.innerHTML = `
      <span style="font-size:17px;font-weight:700">Select Players</span>
      <span style="font-size:13px;color:#888">${totalPlayers} selected</span>
    `;
    scroll.appendChild(selectHeader);

    const grid = document.createElement('div');
    grid.className = 'grid-3';
    playerStore.players.forEach(player => {
      const img = playerStore.getImage(player);
      const card = createPlayerSelectCard(player, img, selectedIds.has(player.id), (p) => {
        playTap();
        if (selectedIds.has(p.id)) selectedIds.delete(p.id);
        else selectedIds.add(p.id);
        updateBottomBar();
        render(); // Update selection visually
      });
      grid.appendChild(card);
    });
    scroll.appendChild(grid);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.height = '100px';
    scroll.appendChild(spacer);
  }

  render();
  el.appendChild(scroll);

  // Bottom Bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';

  function updateBottomBar() {
    bottomBar.innerHTML = '';
    const totalPlayers = selectedIds.size;
    const wordsCount = wordStore.allWords.length;
    
    let valid = true;
    let msg = 'Ready to play!';
    if (totalPlayers < 3) { valid = false; msg = 'Need at least 3 players'; }
    else if (wordsCount === 0) { valid = false; msg = 'Need at least 1 word in library'; }

    const inner = document.createElement('div');
    inner.className = 'bottom-bar-inner';

    inner.innerHTML = `
      <div class="validation">
        <span class="validation-icon">${valid ? '✅' : '⚠️'}</span>
        <span class="validation-text">${msg}</span>
      </div>
    `;

    const startBtn = createGameButton('START', 'blue', () => {
      if (!valid) return;
      playSuccess();
      const session = new WordsGameSession();
      const players = playerStore.players.filter(p => selectedIds.has(p.id));
      
      // We don't pick the word yet, we pick it based on the assigned imposter inside the session logic, 
      // but for simplicity we can assign the imposter first, then pick word.
      session.setupGame(players, null); 
      // setupGame sets random imposter, now we pick a safe word for that imposter
      session.selectedWord = wordStore.pickWord(session.imposter.name);
      
      navigate('/words-reveal', { session });
    }, { small: true, width: '140px', disabled: !valid });

    inner.appendChild(startBtn);
    bottomBar.appendChild(inner);
  }

  updateBottomBar();
  el.appendChild(bottomBar);

  return { element: el };
}
