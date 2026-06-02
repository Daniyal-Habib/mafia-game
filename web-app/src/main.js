// main.js - Entry point for the Vite app
import './styles/index.css';
import { initRouter, registerRoute } from './lib/router.js';

// Import Views
import { SplashScreen } from './views/SplashScreen.js';
import { HomeView } from './views/HomeView.js';
import { PlayersView, AddPlayerView, EditPlayerView } from './views/PlayersView.js';
import { NewGameView } from './views/NewGameView.js';
import { RoleRevealView } from './views/RoleRevealView.js';
import { GameplayView } from './views/GameplayView.js';
import { EliminationAnnounce } from './views/EliminationAnnounce.js';
import { GameOverView } from './views/GameOverView.js';
import { SettingsView } from './views/SettingsView.js';
import { HistoryView } from './views/HistoryView.js';
import { WordsImposterSetup } from './views/WordsImposterSetup.js';
import { WordRevealView } from './views/WordRevealView.js';
import { WordsVotingView } from './views/WordsVotingView.js';
import { WordsVoteResult } from './views/WordsVoteResult.js';
import { WordsManagement } from './views/WordsManagement.js';
import { MultiplayerLobbyView } from './views/MultiplayerLobbyView.js';
import { MultiplayerWaitingView } from './views/MultiplayerWaitingView.js';
import { MultiplayerRoleRevealView } from './views/MultiplayerRoleRevealView.js';
import { MultiplayerWordRevealView } from './views/MultiplayerWordRevealView.js';
import { MultiplayerGameplayView } from './views/MultiplayerGameplayView.js';
import { MultiplayerWordsVotingView } from './views/MultiplayerWordsVotingView.js';
import { MultiplayerGameOverView } from './views/MultiplayerGameOverView.js';

// Register Routes
registerRoute('/', HomeView);
registerRoute('/splash', SplashScreen);
registerRoute('/players', PlayersView);
registerRoute('/add-player', AddPlayerView);
registerRoute('/edit-player', EditPlayerView);
registerRoute('/new-game', NewGameView);
registerRoute('/role-reveal', RoleRevealView);
registerRoute('/gameplay', GameplayView);
registerRoute('/elimination', EliminationAnnounce);
registerRoute('/game-over', GameOverView);
registerRoute('/settings', SettingsView);
registerRoute('/history', HistoryView);
registerRoute('/words-setup', WordsImposterSetup);
registerRoute('/words-reveal', WordRevealView);
registerRoute('/words-voting', WordsVotingView);
registerRoute('/words-result', WordsVoteResult);
registerRoute('/words-manage', WordsManagement);
registerRoute('/multiplayer', MultiplayerLobbyView);
registerRoute('/mp-waiting', MultiplayerWaitingView);
registerRoute('/mp-role-reveal', MultiplayerRoleRevealView);
registerRoute('/mp-word-reveal', MultiplayerWordRevealView);
registerRoute('/mp-gameplay', MultiplayerGameplayView);
registerRoute('/mp-words-voting', MultiplayerWordsVotingView);
registerRoute('/mp-words-result', MultiplayerGameOverView);
registerRoute('/mp-game-over', MultiplayerGameOverView);

// Start
document.addEventListener('DOMContentLoaded', () => {
  // If launching for the first time, start at splash, then route to home
  if (!window.location.hash || window.location.hash === '#/') {
    window.location.hash = '/splash';
  }
  initRouter();
});

// Prevent rubber-banding on iOS Safari
document.body.addEventListener('touchmove', (e) => {
  // Only prevent default if we're not inside a scroll-content div
  if (!e.target.closest('.scroll-content') && !e.target.closest('.modal-sheet')) {
    e.preventDefault();
  }
}, { passive: false });
