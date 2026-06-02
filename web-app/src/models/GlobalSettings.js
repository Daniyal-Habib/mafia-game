// GlobalSettings — mirrors iOS GlobalSettings.swift
import { loadSettings, saveSettings } from '../lib/storage.js';
import { setHapticsEnabled } from '../lib/haptics.js';

class GlobalSettingsStore {
  constructor() {
    this._settings = loadSettings();
    this._listeners = [];
    setHapticsEnabled(this._settings.hapticsEnabled);
  }

  get settings() { return this._settings; }

  get(key) { return this._settings[key]; }

  set(key, value) {
    this._settings[key] = value;
    saveSettings(this._settings);
    if (key === 'hapticsEnabled') setHapticsEnabled(value);
    this._notify();
  }

  update(partial) {
    Object.assign(this._settings, partial);
    saveSettings(this._settings);
    if ('hapticsEnabled' in partial) setHapticsEnabled(this._settings.hapticsEnabled);
    this._notify();
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _notify() { this._listeners.forEach(fn => fn(this._settings)); }
}

export const globalSettings = new GlobalSettingsStore();
