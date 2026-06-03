// Player model + store — mirrors iOS Player.swift + PlayerStore.swift
import { loadPlayers, savePlayers, savePlayerImage, loadPlayerImage, deletePlayerImage, compressImage } from '../lib/storage.js';
import { generateId } from '../lib/utils.js';

export function createPlayer(name, imageDataUrl = null) {
  return {
    id: generateId(),
    name,
    imageId: null,
    gamesPlayed: 0,
    gamesWon: 0,
  };
}

export function winRate(player) {
  if (player.gamesPlayed === 0) return 0;
  return (player.gamesWon / player.gamesPlayed) * 100;
}

// ---------- PlayerStore (singleton) ----------
class PlayerStore {
  constructor() {
    this.players = loadPlayers();
    this._listeners = [];
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _notify() { this._listeners.forEach(fn => fn(this.players)); savePlayers(this.players); }

  addPlayer(name, imageDataUrl = null) {
    const player = createPlayer(name);
    if (imageDataUrl) {
      player.imageId = player.id;
      savePlayerImage(player.id, imageDataUrl);
    }
    this.players.push(player);
    this._notify();
    return player;
  }

  deletePlayer(player) {
    if (player.imageId) deletePlayerImage(player.imageId);
    this.players = this.players.filter(p => p.id !== player.id);
    this._notify();
  }

  updatePlayer(updated) {
    const idx = this.players.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      this.players[idx] = updated;
      this._notify();
    }
  }

  getImage(player) {
    if (!player.imageId) return null;
    return loadPlayerImage(player.imageId);
  }

  setImage(player, dataUrl) {
    player.imageId = player.id;
    savePlayerImage(player.id, dataUrl);
    this.updatePlayer(player);
  }

  removeImage(player) {
    if (player.imageId) deletePlayerImage(player.imageId);
    player.imageId = null;
    this.updatePlayer(player);
  }

  getById(id) { return this.players.find(p => p.id === id) || null; }
}

export const playerStore = new PlayerStore();

window.addEventListener('cloudSyncComplete', () => {
  playerStore.players = loadPlayers();
  playerStore._notify();
});
