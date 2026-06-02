// WordsManagement.js - CRUD for words library
import { navigate, goBack } from '../lib/router.js';
import { wordStore } from '../models/WordStore.js';
import { playerStore } from '../models/Player.js';
import { createNavBar, createBackButton, createNavButton, createGameButton, createModal } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';

export function WordsManagement() {
  const el = document.createElement('div');
  el.className = 'view';
  
  el.appendChild(createNavBar('Words Library', 
    createBackButton(() => goBack()),
    createNavButton('+', () => showAddModal())
  ));

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  function render() {
    scroll.innerHTML = '';
    const words = wordStore.allWords;

    if (words.length === 0) {
      scroll.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 40px;gap:16px;text-align:center">
          <div style="font-size:60px;opacity:0.3">📚</div>
          <div style="font-size:17px;font-weight:700;color:#888">Empty Library</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.4)">Add words and hints to play Words Imposter.</div>
          <button style="margin-top:20px;padding:12px 24px;border:none;border-radius:12px;background:#007aff;color:#fff;font-weight:600;font-size:16px" onclick="document.getElementById('add-word-btn').click()">Add Word</button>
        </div>
      `;
      // hacky binding for the inline onclick above
      const btn = scroll.querySelector('button');
      if(btn) {
        btn.id = 'add-word-btn';
        btn.onclick = () => showAddModal();
      }
      return;
    }

    // Group by addedBy
    const grouped = {};
    words.forEach(w => {
      const pName = w.addedBy || 'Unknown';
      if (!grouped[pName]) grouped[pName] = [];
      grouped[pName].push(w);
    });

    Object.keys(grouped).sort().forEach(player => {
      const header = document.createElement('div');
      header.style.cssText = 'padding:16px 16px 8px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;';
      header.textContent = player;
      scroll.appendChild(header);

      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 16px;';

      grouped[player].forEach(word => {
        const row = document.createElement('div');
        row.className = 'word-entry-row';
        row.innerHTML = `
          <div class="word-icon">📝</div>
          <div class="word-details">
            <div class="word-text">${word.word}</div>
            <div class="hint-text">Hint: ${word.hint}</div>
          </div>
          <div class="actions">
            <button class="edit-btn">✏️</button>
            <button class="del-btn">🗑️</button>
          </div>
        `;
        row.querySelector('.edit-btn').onclick = () => showEditModal(word);
        row.querySelector('.del-btn').onclick = () => {
          if (confirm(`Delete "${word.word}"?`)) {
            wordStore.deleteWord(word);
          }
        };
        list.appendChild(row);
      });

      scroll.appendChild(list);
    });

    const spacer = document.createElement('div');
    spacer.style.height = '40px';
    scroll.appendChild(spacer);
  }

  function createWordForm(initialWord = '', initialHint = '', initialPlayer = '', onSave) {
    const content = document.createElement('div');
    content.style.padding = '24px 16px 40px';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '16px';

    const title = document.createElement('h3');
    title.style.cssText = 'font-size:20px;font-weight:700;text-align:center;margin-bottom:8px';
    title.textContent = initialWord ? 'Edit Word' : 'New Word';
    content.appendChild(title);

    const wInput = document.createElement('input');
    wInput.className = 'form-input';
    wInput.placeholder = 'Word (e.g. Apple)';
    wInput.value = initialWord;
    content.appendChild(wInput);

    const hInput = document.createElement('input');
    hInput.className = 'form-input';
    hInput.placeholder = 'Hint (e.g. Fruit)';
    hInput.value = initialHint;
    content.appendChild(hInput);

    const pSelect = document.createElement('select');
    pSelect.className = 'form-input';
    pSelect.style.appearance = 'none';
    pSelect.style.backgroundColor = 'rgba(255,255,255,0.1)';
    
    playerStore.players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      opt.style.color = '#000';
      pSelect.appendChild(opt);
    });
    
    if (initialPlayer) pSelect.value = initialPlayer;
    else if (playerStore.players.length > 0) pSelect.value = playerStore.players[0].name;

    if (playerStore.players.length === 0) {
      const opt = document.createElement('option');
      opt.value = 'Unknown';
      opt.textContent = 'No players available';
      opt.style.color = '#000';
      pSelect.appendChild(opt);
    }
    
    content.appendChild(pSelect);

    const saveBtn = createGameButton('SAVE WORD', 'blue', () => {
      const w = wInput.value.trim();
      const h = hInput.value.trim();
      const p = pSelect.value;
      if (!w || !h || !p) return;
      onSave(w, h, p);
    });
    content.appendChild(saveBtn);

    return content;
  }

  let modal = null;

  function showAddModal() {
    playTap();
    const form = createWordForm('', '', '', (w, h, p) => {
      wordStore.addWord(w, h, p);
      modal.remove();
    });
    modal = createModal(form, () => modal.remove());
    document.body.appendChild(modal);
    setTimeout(() => form.querySelector('input').focus(), 300);
  }

  function showEditModal(word) {
    playTap();
    const form = createWordForm(word.word, word.hint, word.addedBy, (w, h, p) => {
      word.word = w;
      word.hint = h;
      word.addedBy = p;
      wordStore.updateWord(word);
      modal.remove();
    });
    modal = createModal(form, () => modal.remove());
    document.body.appendChild(modal);
  }

  render();
  const unsub = wordStore.onChange(() => render());

  el.appendChild(scroll);

  return { element: el, cleanup: unsub };
}
