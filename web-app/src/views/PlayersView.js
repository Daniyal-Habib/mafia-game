// PlayersView, AddPlayerView, EditPlayerView — mirrors iOS
import { navigate, goBack } from '../lib/router.js';
import { playerStore, winRate } from '../models/Player.js';
import { createNavBar, createNavButton, createBackButton, createAvatar, createGameButton } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';
import { compressImage } from '../lib/storage.js';

export function PlayersView() {
  const el = document.createElement('div');
  el.className = 'view';

  const nav = createNavBar('Players',
    createBackButton(() => goBack()),
    createNavButton('+', () => { playTap(); navigate('/add-player'); })
  );
  el.appendChild(nav);

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  function render() {
    scroll.innerHTML = '';
    if (playerStore.players.length === 0) {
      scroll.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 40px;gap:16px">
          <div style="font-size:60px;opacity:0.3">👤</div>
          <div style="font-size:17px;font-weight:600;color:#888">No Players Yet</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.4);text-align:center">Add players to start playing Mafia or Words Imposter</div>
        </div>
      `;
      return;
    }

    playerStore.players.forEach(player => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.addEventListener('click', () => { playTap(); navigate('/edit-player', { player }); });

      const img = playerStore.getImage(player);
      row.appendChild(createAvatar(player, img));

      const info = document.createElement('div');
      info.className = 'player-info';
      info.innerHTML = `<h3>${player.name}</h3><div class="stats"><span>🎮 ${player.gamesPlayed} played</span><span>🏆 ${player.gamesWon} won</span></div>`;
      row.appendChild(info);

      if (player.gamesPlayed > 0) {
        const badge = document.createElement('div');
        badge.className = 'win-badge';
        badge.textContent = `${Math.round(winRate(player))}%`;
        row.appendChild(badge);
      }

      const chevron = document.createElement('span');
      chevron.style.cssText = 'color:#555;font-size:20px;';
      chevron.textContent = '›';
      row.appendChild(chevron);

      scroll.appendChild(row);
    });
  }

  render();
  const unsub = playerStore.onChange(() => render());
  el.appendChild(scroll);
  return { element: el, cleanup: unsub };
}

export function AddPlayerView() {
  const el = document.createElement('div');
  el.className = 'view';
  el.appendChild(createNavBar('Add Player', createBackButton(() => goBack())));

  const form = document.createElement('div');
  form.style.cssText = 'padding:24px 16px;display:flex;flex-direction:column;gap:24px;align-items:center;';

  let imageDataUrl = null;

  // Photo picker
  const photoContainer = document.createElement('div');
  photoContainer.style.cssText = 'position:relative;cursor:pointer;';
  const avatarPreview = document.createElement('div');
  avatarPreview.className = 'avatar large';
  avatarPreview.innerHTML = '<span class="avatar-initial" style="font-size:40px">📷</span>';
  photoContainer.appendChild(avatarPreview);

  const badge = document.createElement('div');
  badge.style.cssText = 'position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:#cc1a0a;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;border:3px solid #000;';
  badge.textContent = '+';
  photoContainer.appendChild(badge);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    imageDataUrl = await compressImage(file);
    avatarPreview.innerHTML = `<img src="${imageDataUrl}" alt="preview" />`;
  });
  photoContainer.appendChild(fileInput);
  photoContainer.addEventListener('click', () => fileInput.click());
  form.appendChild(photoContainer);

  // Name input
  const field = document.createElement('div');
  field.className = 'form-field';
  field.style.width = '100%';
  field.innerHTML = '<label class="form-label">Player Name</label>';
  const nameInput = document.createElement('input');
  nameInput.className = 'form-input';
  nameInput.placeholder = 'Enter name';
  nameInput.autocomplete = 'off';
  nameInput.maxLength = 20;
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });
  field.appendChild(nameInput);
  form.appendChild(field);

  function doSave() {
    const name = nameInput.value.trim();
    if (!name) return;
    playerStore.addPlayer(name, imageDataUrl);
    playTap();
    goBack();
  }

  form.appendChild(createGameButton('ADD PLAYER', 'default', doSave, { width: '100%' }));
  el.appendChild(form);
  setTimeout(() => nameInput.focus(), 300);
  return { element: el };
}

export function EditPlayerView(data) {
  const player = data?.player;
  if (!player) { goBack(); return { element: document.createElement('div') }; }

  const el = document.createElement('div');
  el.className = 'view';
  el.appendChild(createNavBar('Edit Player', createBackButton(() => goBack())));

  const form = document.createElement('div');
  form.style.cssText = 'padding:24px 16px;display:flex;flex-direction:column;gap:24px;align-items:center;';

  let currentImage = playerStore.getImage(player);

  const photoContainer = document.createElement('div');
  photoContainer.style.cssText = 'position:relative;cursor:pointer;';
  const avatarPreview = document.createElement('div');
  avatarPreview.className = 'avatar large';
  avatarPreview.innerHTML = currentImage
    ? `<img src="${currentImage}" alt="${player.name}" />`
    : `<span class="avatar-initial" style="font-size:50px">${player.name.charAt(0).toUpperCase()}</span>`;
  photoContainer.appendChild(avatarPreview);

  const editBadge = document.createElement('div');
  editBadge.style.cssText = 'position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:#cc1a0a;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;border:3px solid #000;';
  editBadge.textContent = '✏️';
  photoContainer.appendChild(editBadge);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentImage = await compressImage(file);
    avatarPreview.innerHTML = `<img src="${currentImage}" alt="preview" />`;
    playerStore.setImage(player, currentImage);
  });
  photoContainer.appendChild(fileInput);
  photoContainer.addEventListener('click', () => fileInput.click());
  form.appendChild(photoContainer);

  // Name
  const field = document.createElement('div');
  field.className = 'form-field';
  field.style.width = '100%';
  field.innerHTML = '<label class="form-label">Player Name</label>';
  const nameInput = document.createElement('input');
  nameInput.className = 'form-input';
  nameInput.value = player.name;
  nameInput.maxLength = 20;
  nameInput.addEventListener('change', () => {
    const name = nameInput.value.trim();
    if (name) { player.name = name; playerStore.updatePlayer(player); }
  });
  field.appendChild(nameInput);
  form.appendChild(field);

  // Stats
  const stats = document.createElement('div');
  stats.style.cssText = 'width:100%;display:flex;gap:16px;justify-content:center;margin-top:8px;';
  stats.innerHTML = `
    <div style="text-align:center"><div style="font-size:24px;font-weight:700">${player.gamesPlayed}</div><div style="font-size:12px;color:#888">Played</div></div>
    <div style="text-align:center"><div style="font-size:24px;font-weight:700">${player.gamesWon}</div><div style="font-size:12px;color:#888">Won</div></div>
    <div style="text-align:center"><div style="font-size:24px;font-weight:700">${Math.round(winRate(player))}%</div><div style="font-size:12px;color:#888">Win Rate</div></div>
  `;
  form.appendChild(stats);

  const deleteBtn = document.createElement('button');
  deleteBtn.style.cssText = 'background:none;border:none;color:#ff3b30;font-size:17px;font-weight:600;cursor:pointer;padding:16px;margin-top:16px;';
  deleteBtn.textContent = 'Delete Player';
  deleteBtn.addEventListener('click', () => {
    if (confirm(`Delete ${player.name}?`)) { playerStore.deletePlayer(player); playTap(); goBack(); }
  });
  form.appendChild(deleteBtn);

  el.appendChild(form);
  return { element: el };
}
