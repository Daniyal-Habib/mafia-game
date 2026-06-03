// Firebase — Initialize app and export database reference
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

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
export let auth = null;
export let googleProvider = null;

export function initFirebase() {
  if (app) return db;
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
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

export async function signInWithGoogle() {
  if (!auth) initFirebase();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('[Firebase] Google sign-in failed:', error);
    throw error;
  }
}

export async function logOut() {
  if (!auth) return;
  await signOut(auth);
}

export function onUserChange(callback) {
  if (!auth) initFirebase();
  return onAuthStateChanged(auth, callback);
}

