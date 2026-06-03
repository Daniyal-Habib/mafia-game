// GameHistoryStore — mirrors iOS GameHistoryStore.swift
import { loadHistory, saveHistory } from '../lib/storage.js';
import { generateId } from '../lib/utils.js';

class GameHistoryStoreClass {
  constructor() {
    this.games = loadHistory();
    this._listeners = [];
  }

  get totalGamesPlayed() { return this.games.length; }
  get mafiaWins() { return this.games.filter(g => g.winner.includes('Mafia')).length; }
  get crewWins() { return this.games.filter(g => g.winner.includes('Crew')).length; }

  addGame(winner, playerCount, duration) {
    const record = {
      id: generateId(),
      date: new Date().toISOString(),
      winner,
      playerCount,
      duration,
    };
    this.games.unshift(record); // newest first
    saveHistory(this.games);
    this._notify();
  }

  clearHistory() {
    this.games = [];
    saveHistory(this.games);
    this._notify();
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _notify() { this._listeners.forEach(fn => fn(this.games)); }
}

export const historyStore = new GameHistoryStoreClass();

window.addEventListener('cloudSyncComplete', () => {
  historyStore.games = loadHistory();
  historyStore._notify();
});
