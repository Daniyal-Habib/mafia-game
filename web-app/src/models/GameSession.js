// GameSession — mirrors iOS GameSession.swift
// Core game state: players, role assignments, elimination, win conditions

import { Roles, RoleTeam, getRoleById } from './Role.js';
import { saveActiveGame, clearActiveGame } from '../lib/storage.js';

export class GameSession {
  constructor() {
    this.players = [];
    this.roleAssignments = {}; // { playerId: roleId }
    this.currentPlayerIndex = 0;
    this.eliminatedPlayers = []; // { player, role, method, round }
    this.round = 1;
    this.phase = 'role-reveal'; // 'role-reveal' | 'gameplay' | 'game-over'
    this.winner = null;
    this.undoStack = [];
    this.startTime = Date.now();
  }

  setupGame(players, roleAssignments) {
    this.players = [...players].sort(() => Math.random() - 0.5);
    this.roleAssignments = roleAssignments;
    this.currentPlayerIndex = 0;
    this.eliminatedPlayers = [];
    this.round = 1;
    this.phase = 'role-reveal';
    this.winner = null;
    this.undoStack = [];
    this.startTime = Date.now();
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  get isLastPlayer() {
    return this.currentPlayerIndex >= this.players.length - 1;
  }

  moveToNextPlayer() {
    if (this.currentPlayerIndex < this.players.length - 1) {
      this.currentPlayerIndex++;
    }
  }

  getRoleForPlayer(playerId) {
    return getRoleById(this.roleAssignments[playerId]);
  }

  get alivePlayers() {
    const deadIds = new Set(this.eliminatedPlayers.map(e => e.player.id));
    return this.players.filter(p => !deadIds.has(p.id));
  }

  get deadPlayers() {
    return this.eliminatedPlayers.map(e => e.player);
  }

  isAlive(playerId) {
    return !this.eliminatedPlayers.some(e => e.player.id === playerId);
  }

  eliminatePlayer(player, method = 'voted') {
    const role = this.getRoleForPlayer(player.id);
    const record = { player, role, method, round: this.round };
    this.eliminatedPlayers.push(record);
    this.undoStack.push(record);
    this.saveGame();
    return record;
  }

  undoLastElimination() {
    if (this.eliminatedPlayers.length === 0) return null;
    const last = this.eliminatedPlayers.pop();
    this.undoStack.pop();
    this.saveGame();
    return last;
  }

  // Win conditions — mirrors iOS exactly
  checkWinCondition() {
    const alive = this.alivePlayers;
    const aliveRoles = alive.map(p => this.roleAssignments[p.id]);
    const aliveMafia = aliveRoles.filter(r => getRoleById(r).team === RoleTeam.MAFIA).length;
    const aliveCrew = aliveRoles.filter(r => getRoleById(r).team === RoleTeam.CREW).length;

    // Jester win: check if a jester was voted out
    const lastEliminated = this.eliminatedPlayers[this.eliminatedPlayers.length - 1];
    if (lastEliminated && lastEliminated.method === 'voted' &&
        getRoleById(this.roleAssignments[lastEliminated.player.id]).team === RoleTeam.NEUTRAL &&
        this.roleAssignments[lastEliminated.player.id] === 'jester') {
      this.winner = { team: RoleTeam.NEUTRAL, label: `Jester (${lastEliminated.player.name}) Wins!` };
      this.phase = 'game-over';
      return this.winner;
    }

    // Crew wins: all mafia eliminated
    if (aliveMafia === 0) {
      this.winner = { team: RoleTeam.CREW, label: 'Crew Wins!' };
      this.phase = 'game-over';
      return this.winner;
    }

    // Mafia wins: mafia >= crew (neutrals excluded, matching iOS)
    if (aliveMafia > 0 && aliveMafia >= aliveCrew) {
      this.winner = { team: RoleTeam.MAFIA, label: 'Mafia Wins!' };
      this.phase = 'game-over';
      return this.winner;
    }

    return null;
  }

  // Mafia count for imposter count screen
  get mafiaAliveCount() {
    return this.alivePlayers.filter(p => getRoleById(this.roleAssignments[p.id]).team === RoleTeam.MAFIA).length;
  }

  get gameDuration() {
    return (Date.now() - this.startTime) / 1000;
  }

  // Get winners (players on winning team)
  getWinners() {
    if (!this.winner) return [];
    return this.players.filter(p => {
      const role = getRoleById(this.roleAssignments[p.id]);
      if (this.winner.team === RoleTeam.NEUTRAL) {
        // Jester win — only the jester wins
        return this.roleAssignments[p.id] === 'jester' &&
               this.eliminatedPlayers.some(e => e.player.id === p.id && e.method === 'voted');
      }
      return role.team === this.winner.team;
    });
  }

  // Persistence
  saveGame() {
    const data = {
      players: this.players,
      roleAssignments: this.roleAssignments,
      currentPlayerIndex: this.currentPlayerIndex,
      eliminatedPlayers: this.eliminatedPlayers,
      undoStack: this.undoStack,
      winner: this.winner,
      round: this.round,
      phase: this.phase,
      startTime: this.startTime,
    };
    saveActiveGame(data);
  }

  loadFromSave(data) {
    this.players = data.players;
    this.roleAssignments = data.roleAssignments;
    this.currentPlayerIndex = data.currentPlayerIndex;
    this.eliminatedPlayers = data.eliminatedPlayers;
    this.undoStack = data.undoStack || [];
    this.winner = data.winner || null;
    this.round = data.round || 1;
    this.phase = data.phase || 'gameplay';
    this.startTime = data.startTime || Date.now();
  }

  clearSave() {
    clearActiveGame();
  }
}
