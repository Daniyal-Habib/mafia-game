// GameButton — renders the cut-corner styled button matching iOS GameButtonStyle
// Usage: createGameButton('START GAME', 'default', () => {})
// Variants: 'default' (red), 'blue', 'green', 'livegreen'

export function createGameButton(label, variant = 'default', onClick = null, options = {}) {
  const { small = false, disabled = false, width = null } = options;
  const btn = document.createElement('button');
  btn.className = `game-btn${small ? ' small' : ''}`;
  if (disabled) btn.disabled = true;
  if (width) btn.style.width = width;

  btn.innerHTML = `
    <div class="game-btn-inner">
      <div class="game-btn-bg ${variant}"></div>
      <span class="game-btn-label">${label}</span>
    </div>
  `;

  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

// Avatar component
export function createAvatar(player, imageDataUrl = null, size = '') {
  const div = document.createElement('div');
  div.className = `avatar${size ? ' ' + size : ''}`;
  if (imageDataUrl) {
    const img = document.createElement('img');
    img.src = imageDataUrl;
    img.alt = player.name;
    img.draggable = false;
    div.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.className = 'avatar-initial';
    span.textContent = player.name.charAt(0).toUpperCase();
    div.appendChild(span);
  }
  return div;
}

// Player Select Card for grids
export function createPlayerSelectCard(player, imageDataUrl, isSelected, onToggle) {
  const card = document.createElement('button');
  card.className = `player-select-card ${isSelected ? 'selected' : 'unselected'}`;
  card.addEventListener('click', () => onToggle(player));

  card.innerHTML = `<div class="card-bg"></div>`;
  const avatar = createAvatar(player, imageDataUrl);
  card.appendChild(avatar);

  const name = document.createElement('span');
  name.className = 'player-name';
  name.textContent = player.name;
  card.appendChild(name);

  return card;
}

// NavBar
export function createNavBar(title, leftBtn = null, rightBtn = null) {
  const nav = document.createElement('div');
  nav.className = 'nav-bar';

  const left = document.createElement('div');
  left.style.minWidth = '60px';
  if (leftBtn) left.appendChild(leftBtn);
  nav.appendChild(left);

  const h1 = document.createElement('h1');
  h1.textContent = title;
  nav.appendChild(h1);

  const right = document.createElement('div');
  right.style.minWidth = '60px';
  right.style.display = 'flex';
  right.style.justifyContent = 'flex-end';
  if (rightBtn) right.appendChild(rightBtn);
  nav.appendChild(right);

  return nav;
}

export function createNavButton(label, onClick, options = {}) {
  const { icon = false } = options;
  const btn = document.createElement('button');
  btn.className = `nav-btn${icon ? ' icon-btn' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

export function createBackButton(onClick) {
  const btn = createNavButton('‹', onClick, { icon: true });
  btn.style.fontSize = '28px';
  return btn;
}

// Modal / Sheet
export function createModal(content, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });

  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';

  const handle = document.createElement('div');
  handle.className = 'modal-handle';
  sheet.appendChild(handle);

  sheet.appendChild(content);
  overlay.appendChild(sheet);
  return overlay;
}

// Confirmation dialog
export function showConfirmDialog(title, message, confirmLabel, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'vote-confirm-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); onCancel?.(); }
  });

  const card = document.createElement('div');
  card.className = 'vote-confirm-card';
  card.innerHTML = `
    <div style="text-align:center">
      <div style="font-size:12px;color:#ff3b30;letter-spacing:2px;margin-bottom:8px">${title.toUpperCase()}</div>
      <div style="font-size:20px;font-weight:700;color:#fff">${message}</div>
    </div>
    <div class="confirm-btns">
      <button class="cancel-btn">Cancel</button>
      <button class="confirm-btn">${confirmLabel}</button>
    </div>
  `;

  card.querySelector('.cancel-btn').addEventListener('click', () => { overlay.remove(); onCancel?.(); });
  card.querySelector('.confirm-btn').addEventListener('click', () => { overlay.remove(); onConfirm(); });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  return overlay;
}
