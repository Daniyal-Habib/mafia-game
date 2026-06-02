import { loadWords, saveWords } from '../lib/storage.js';
import { generateId } from '../lib/utils.js';

export function createWordEntry(word, hint, addedBy) {
  return { id: generateId(), word, hint, addedBy };
}

class WordStoreClass {
  constructor() {
    this.wordEntries = loadWords();
    this._listeners = [];
  }

  get allWords() { return this.wordEntries; }

  addWord(word, hint, byPlayer) {
    const entry = createWordEntry(word, hint, byPlayer);
    this.wordEntries.push(entry);
    this._save();
    return entry;
  }

  deleteWord(entry) {
    this.wordEntries = this.wordEntries.filter(w => w.id !== entry.id);
    this._save();
  }

  updateWord(entry) {
    const idx = this.wordEntries.findIndex(w => w.id === entry.id);
    if (idx !== -1) { this.wordEntries[idx] = entry; this._save(); }
  }

  safeWords(forImposterName) {
    return this.wordEntries.filter(w => w.addedBy !== forImposterName);
  }

  pickWord(imposterName) {
    if (this.wordEntries.length === 0) return null;
    const safe = this.safeWords(imposterName);
    const own = this.wordEntries.filter(w => w.addedBy === imposterName);
    if (safe.length === 0) return this.wordEntries[Math.floor(Math.random() * this.wordEntries.length)];
    // ~20% chance imposter gets their own word
    if (Math.random() < 0.2 && own.length > 0) {
      return own[Math.floor(Math.random() * own.length)];
    }
    return safe[Math.floor(Math.random() * safe.length)];
  }

  _save() { saveWords(this.wordEntries); this._notify(); }
  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _notify() { this._listeners.forEach(fn => fn(this.wordEntries)); }
}

export const wordStore = new WordStoreClass();
