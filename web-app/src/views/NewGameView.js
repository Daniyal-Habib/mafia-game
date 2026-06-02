// NewGameView — mirrors iOS NewGameView.swift
// Player selection grid + role configuration + start game
import { navigate, goBack } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { createNavBar, createBackButton, createPlayerSelectCard, createGameButton } from '../components/Components.js';
import { Roles, getAllRoles } from '../models/Role.js';
import { createGameSetup, autoBalanceAllRoles, validateSetup, incrementRole, decrementRole, assignRoles } from '../models/GameSetup.js';
import { GameSession } from '../models/GameSession.js';
import { playTap, playSuccess } from '../lib/haptics.js';

export function NewGameView() {
  const el = document.createElement('div');
  el.className = 'view';

  el.appendChild(createNavBar('New Game', createBackButton(() => goBack())));

  const scroll = document.createElement('div');
  scroll.className = 'scroll-content';

  let selectedIds = new Set();
  let setup = createGameSetup();

  function getSelectedPlayers() {
    return playerStore.players.filter(p => selectedIds.has(p.id));
  }

  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';

  function updateBottomBar() {
    const totalPlayers = selectedIds.size;
    const validation = validateSetup(setup, totalPlayers);
    bottomBar.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'bottom-bar-inner';

    const valDiv = document.createElement('div');
    valDiv.className = 'validation';
    valDiv.innerHTML = `
      <span class="validation-icon">${validation.valid ? '✅' : '⚠️'}</span>
      <span class="validation-text">${validation.message}</span>
    `;
    inner.appendChild(valDiv);

    const startBtn = createGameButton('START', 'default', () => {
      if (!validation.valid) return;
      playSuccess();
      const session = new GameSession();
      const players = getSelectedPlayers();
      const roles = assignRoles(players, setup);
      session.setupGame(players, roles);
      navigate('/role-reveal', { session });
    }, { small: true, width: '160px', disabled: !validation.valid });
    inner.appendChild(startBtn);

    bottomBar.appendChild(inner);
  }

  function render() {
    scroll.innerHTML = '';
    const totalPlayers = selectedIds.size;

    // --- Player Selection ---
    const selectHeader = document.createElement('div');
    selectHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;';
    selectHeader.innerHTML = `
      <span style="font-size:17px;font-weight:700">Select Players</span>
      <span style="font-size:13px;color:#888">${totalPlayers} selected</span>
    `;
    const selectAllBtn = document.createElement('button');
    selectAllBtn.style.cssText = 'background:none;border:none;color:#ff8000;font-size:13px;cursor:pointer;margin-left:8px;';
    selectAllBtn.textContent = selectedIds.size === playerStore.players.length ? 'Deselect All' : 'Select All';
    selectAllBtn.addEventListener('click', () => {
      playTap();
      if (selectedIds.size === playerStore.players.length) selectedIds.clear();
      else playerStore.players.forEach(p => selectedIds.add(p.id));
      setup = autoBalanceAllRoles(setup, selectedIds.size);
      render();
    });
    selectHeader.appendChild(selectAllBtn);
    scroll.appendChild(selectHeader);

    // Player grid
    const grid = document.createElement('div');
    grid.className = 'grid-3';
    playerStore.players.forEach(player => {
      const img = playerStore.getImage(player);
      const card = createPlayerSelectCard(player, img, selectedIds.has(player.id), (p) => {
        playTap();
        if (selectedIds.has(p.id)) selectedIds.delete(p.id);
        else selectedIds.add(p.id);
        setup = autoBalanceAllRoles(setup, selectedIds.size);
        render();
      });
      grid.appendChild(card);
    });
    scroll.appendChild(grid);

    if (playerStore.players.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:40px;';
      empty.innerHTML = `<div style="font-size:40px;opacity:0.3">👤</div><div style="color:#888;margin-top:8px">No players. Add some first!</div>`;
      const addBtn = createGameButton('ADD PLAYERS', 'green', () => navigate('/players'), { small: true, width: '200px' });
      addBtn.style.margin = '16px auto 0';
      empty.appendChild(addBtn);
      scroll.appendChild(empty);
    }

    // --- Divider ---
    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.1);margin:24px 16px 16px;';
    scroll.appendChild(divider);

    // --- Role Configuration ---
    if (totalPlayers >= 3) {
      const roleHeader = document.createElement('div');
      roleHeader.style.cssText = 'padding:0 16px 12px;';
      roleHeader.innerHTML = `
        <div style="font-size:17px;font-weight:700">Configure Roles</div>
        <div style="font-size:12px;color:#888;margin-top:4px">${totalPlayers} players · assign roles below</div>
      `;
      scroll.appendChild(roleHeader);

      const rolesContainer = document.createElement('div');
      rolesContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 16px;';

      getAllRoles().forEach(role => {
        const row = document.createElement('div');
        row.className = 'role-config-row';

        const icon = document.createElement('div');
        icon.className = 'role-icon';
        icon.textContent = role.emoji;
        row.appendChild(icon);

        const info = document.createElement('div');
        info.className = 'role-info';
        info.innerHTML = `<div class="role-name" style="color:${role.color}">${role.name}</div><div class="role-desc">${role.shortDescription}</div>`;
        row.appendChild(info);

        if (role.id !== 'civilian') {
          const counter = document.createElement('div');
          counter.className = 'counter';

          const minus = document.createElement('button');
          minus.textContent = '➖';
          minus.disabled = setup.roleCounts[role.id] <= role.minRequired;
          minus.addEventListener('click', () => {
            playTap();
            setup = decrementRole(setup, role.id, totalPlayers);
            render();
          });
          counter.appendChild(minus);

          const count = document.createElement('span');
          count.className = 'count';
          count.textContent = setup.roleCounts[role.id];
          counter.appendChild(count);

          const plus = document.createElement('button');
          plus.textContent = '➕';
          plus.disabled = setup.roleCounts[role.id] >= Math.floor(totalPlayers / 2);
          plus.addEventListener('click', () => {
            playTap();
            setup = incrementRole(setup, role.id, totalPlayers);
            render();
          });
          counter.appendChild(plus);

          row.appendChild(counter);
        } else {
          const count = document.createElement('div');
          count.style.cssText = 'font-size:24px;font-weight:700;color:#fff;min-width:30px;text-align:center;';
          count.textContent = setup.roleCounts.civilian;
          row.appendChild(count);
        }

        rolesContainer.appendChild(row);
      });
      scroll.appendChild(rolesContainer);
    }

    // Spacer for bottom bar
    const spacer = document.createElement('div');
    spacer.style.height = '100px';
    scroll.appendChild(spacer);

    updateBottomBar();
  }

  el.appendChild(scroll);

  render();
  el.appendChild(bottomBar);
  return { element: el };
}
