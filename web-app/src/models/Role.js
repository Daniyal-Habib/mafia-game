// Role model — mirrors iOS Role.swift exactly
export const RoleTeam = {
  MAFIA: 'mafia',
  CREW: 'crew',
  NEUTRAL: 'neutral',
};

export const Roles = {
  mafia: {
    id: 'mafia',
    name: 'Mafia',
    icon: '🔫',
    emoji: '🔫',
    color: '#ff3b30',
    team: RoleTeam.MAFIA,
    shortDescription: 'Eliminate crew members',
    description: 'Eliminate crew members each night. Win when Mafia equals or outnumbers the crew.',
    minRequired: 1,
    order: 0,
  },
  detective: {
    id: 'detective',
    name: 'Detective',
    icon: '🔍',
    emoji: '🔍',
    color: '#007aff',
    team: RoleTeam.CREW,
    shortDescription: 'Investigate suspicious players',
    description: 'Each night, investigate one player to learn if they are Mafia or not.',
    minRequired: 0,
    order: 1,
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    icon: '💉',
    emoji: '💉',
    color: '#34c759',
    team: RoleTeam.CREW,
    shortDescription: 'Save one player each night',
    description: 'Each night, choose one player to protect. If the Mafia targets them, they survive.',
    minRequired: 0,
    order: 2,
  },
  jester: {
    id: 'jester',
    name: 'Jester',
    icon: '🃏',
    emoji: '🃏',
    color: '#af52de',
    team: RoleTeam.NEUTRAL,
    shortDescription: 'Get yourself voted out to win',
    description: 'Win the game by getting yourself voted out during the day. You have no team.',
    minRequired: 0,
    order: 3,
  },
  civilian: {
    id: 'civilian',
    name: 'Civilian',
    icon: '👤',
    emoji: '👤',
    color: '#8e8e93',
    team: RoleTeam.CREW,
    shortDescription: 'Find and eliminate the Mafia',
    description: 'Participate in discussions and vote to eliminate suspected Mafia members.',
    minRequired: 0,
    order: 4,
  },
};

export function getRoleById(id) { return Roles[id] || Roles.civilian; }
export function getAllRoles() { return Object.values(Roles).sort((a, b) => a.order - b.order); }
export function getConfigurableRoles() { return getAllRoles(); }
