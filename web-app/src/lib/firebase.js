// Firebase — Initialize app and export database reference
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC3AnLOYPB7TN61yJsNt4DGnBfGlZ-gjAs",
  authDomain: "mafia-game-amongus.firebaseapp.com",
  databaseURL: "https://mafia-game-amongus-default-rtdb.firebaseio.com",
  projectId: "mafia-game-amongus",
  storageBucket: "mafia-game-amongus.firebasestorage.app",
  messagingSenderId: "875268394308",
  appId: "1:875268394308:web:f3442b110a0250eba55b11",
  measurementId: "G-Y69LBPF48V",
};

let app = null;
let db = null;

export function initFirebase() {
  if (app) return db;
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    return db;
  } catch (e) {
    console.error('[Firebase] Init failed:', e);
    return null;
  }
}

export function getDb() {
  if (!db) return initFirebase();
  return db;
}

