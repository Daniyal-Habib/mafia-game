// GameSetup — mirrors iOS GameSetup.swift
// Handles role configuration and auto-balance

import { Roles, RoleTeam } from './Role.js';

export function createGameSetup() {
  return {
    roleCounts: {
      mafia: 1,
      detective: 0,
      doctor: 0,
      jester: 0,
      civilian: 0,
    },
  };
}

// Recalculate civilians to fill remaining spots
export function autoBalanceCivilians(setup, totalPlayers) {
  const specialCount = setup.roleCounts.mafia +
    setup.roleCounts.detective +
    setup.roleCounts.doctor +
    setup.roleCounts.jester;
  setup.roleCounts.civilian = Math.max(0, totalPlayers - specialCount);
  return setup;
}

// Recalculate all roles based on total players
export function autoBalanceAllRoles(setup, totalPlayers) {
  if (totalPlayers < 3) {
    setup.roleCounts = { mafia: 0, detective: 0, doctor: 0, jester: 0, civilian: 0 };
    return setup;
  }
  // Determine mafia count
  if (totalPlayers >= 10) setup.roleCounts.mafia = 3;
  else if (totalPlayers >= 7) setup.roleCounts.mafia = 2;
  else setup.roleCounts.mafia = 1;
  
  // Special roles
  setup.roleCounts.doctor = totalPlayers >= 5 ? 1 : 0;
  setup.roleCounts.detective = totalPlayers >= 6 ? 1 : 0;
  
  // Jester stays at current value
  const assigned = setup.roleCounts.mafia + setup.roleCounts.detective + setup.roleCounts.doctor + setup.roleCounts.jester;
  setup.roleCounts.civilian = Math.max(0, totalPlayers - assigned);
  return setup;
}

// Check role counts are valid for player count
export function validateSetup(setup, totalPlayers) {
  const total = Object.values(setup.roleCounts).reduce((a, b) => a + b, 0);
  if (total !== totalPlayers) return { valid: false, message: `Role count (${total}) ≠ player count (${totalPlayers})` };
  if (setup.roleCounts.mafia < 1) return { valid: false, message: 'Need at least 1 Mafia' };
  if (totalPlayers < 3) return { valid: false, message: 'Need at least 3 players' };
  return { valid: true, message: `${totalPlayers} players · ready!` };
}

// Increment a role count
export function incrementRole(setup, roleId, totalPlayers) {
  const maxForRole = roleId === 'civilian' ? totalPlayers : Math.floor(totalPlayers / 2);
  if (setup.roleCounts[roleId] < maxForRole) {
    setup.roleCounts[roleId]++;
    if (roleId !== 'civilian') {
      autoBalanceCivilians(setup, totalPlayers);
    }
  }
  return setup;
}

// Decrement a role count
export function decrementRole(setup, roleId, totalPlayers) {
  const min = Roles[roleId].minRequired;
  if (setup.roleCounts[roleId] > min) {
    setup.roleCounts[roleId]--;
    if (roleId !== 'civilian') {
      autoBalanceCivilians(setup, totalPlayers);
    }
  }
  return setup;
}

// Assign roles randomly to players
export function assignRoles(players, setup) {
  const rolePool = [];
  for (const [roleId, count] of Object.entries(setup.roleCounts)) {
    for (let i = 0; i < count; i++) rolePool.push(roleId);
  }
  // Shuffle
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
  }
  const assignments = {};
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  shuffledPlayers.forEach((player, i) => {
    assignments[player.id] = rolePool[i] || 'civilian';
  });
  return assignments;
}
