// HistoryView.js - Game history and leaderboard
import { navigate, goBack } from '../lib/router.js';
import { historyStore } from '../models/GameHistoryStore.js';
import { playerStore, winRate } from '../models/Player.js';
import { createNavBar, createBackButton, createAvatar } from '../components/Components.js';
import { playTap } from '../lib/haptics.js';

export function HistoryView() {
  const el = document.createElement('div');
  el.className = 'view';
  
  el.appendChild(createNavBar('History', createBackButton(() => goBack())));

  // Tab picker
  const tabs = document.createElement('div');
  tabs.className = 'tab-picker';
  
  const historyTabBtn = document.createElement('button');
  historyTabBtn.textContent = 'Game History';
  historyTabBtn.className = 'active';
  
  const leaderTabBtn = document.createElement('button');
  leaderTabBtn.textContent = 'Leaderboard';
  
  tabs.appendChild(historyTabBtn);
  tabs.appendChild(leaderTabBtn);
  el.appendChild(tabs);

  const contentArea = document.createElement('div');
  contentArea.className = 'scroll-content';
  contentArea.style.padding = '16px';
  el.appendChild(contentArea);

  let currentTab = 'history';

  historyTabBtn.addEventListener('click', () => {
    playTap();
    currentTab = 'history';
    historyTabBtn.className = 'active';
    leaderTabBtn.className = '';
    render();
  });

  leaderTabBtn.addEventListener('click', () => {
    playTap();
    currentTab = 'leaderboard';
    leaderTabBtn.className = 'active';
    historyTabBtn.className = '';
    render();
  });

  function renderHistory() {
    contentArea.innerHTML = '';
    
    // Stats overview
    const statsOverview = document.createElement('div');
    statsOverview.style.cssText = 'display:flex;justify-content:space-around;padding:24px 16px;background:rgba(255,255,255,0.05);border-radius:16px;margin-bottom:24px;';
    
    const games = historyStore.games;
    const total = games.length;
    
    statsOverview.innerHTML = `
      <div style="text-align:center"><div style="font-size:28px;font-weight:800">${total}</div><div style="font-size:12px;color:#888;margin-top:4px">Games Played</div></div>
      <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#ff3b30">${historyStore.mafiaWins}</div><div style="font-size:12px;color:#888;margin-top:4px">Mafia Wins</div></div>
      <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#34c759">${historyStore.crewWins}</div><div style="font-size:12px;color:#888;margin-top:4px">Crew Wins</div></div>
    `;
    contentArea.appendChild(statsOverview);

    // Achievements
    const achievementsHeader = document.createElement('h3');
    achievementsHeader.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:12px;color:#888';
    achievementsHeader.textContent = 'Achievements';
    contentArea.appendChild(achievementsHeader);

    const badgesContainer = document.createElement('div');
    badgesContainer.style.cssText = 'display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;margin-bottom:24px;scrollbar-width:none;';
    
    const badges = [
      { id: 'first_blood', emoji: '🩸', name: 'First Blood', earned: historyStore.mafiaWins >= 1, desc: '1+ Mafia Wins' },
      { id: 'guardian', emoji: '🛡️', name: 'Guardian', earned: historyStore.crewWins >= 3, desc: '3+ Crew Wins' },
      { id: 'newbie', emoji: '🌱', name: 'Newbie', earned: total >= 1, desc: '1+ Games Played' },
      { id: 'veteran', emoji: '⭐', name: 'Veteran', earned: total >= 5, desc: '5+ Games Played' },
      { id: 'champion', emoji: '🏆', name: 'Champion', earned: total >= 10, desc: '10+ Games Played' },
    ];

    badges.forEach(b => {
      const card = document.createElement('div');
      card.style.cssText = `flex-shrink:0;width:100px;padding:16px 8px;border-radius:16px;text-align:center;background:${b.earned ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};opacity:${b.earned ? '1' : '0.4'};border:1px solid ${b.earned ? 'rgba(255,255,255,0.2)' : 'transparent'};`;
      card.innerHTML = `
        <div style="font-size:32px;margin-bottom:8px">${b.emoji}</div>
        <div style="font-size:13px;font-weight:700;color:#fff">${b.name}</div>
        <div style="font-size:10px;color:#888;margin-top:4px">${b.desc}</div>
      `;
      badgesContainer.appendChild(card);
    });
    contentArea.appendChild(badgesContainer);

    if (total === 0) {
      contentArea.innerHTML += `<div style="text-align:center;color:#888;padding:40px">No games played yet.</div>`;
      return;
    }

    // List of games
    const listHeader = document.createElement('h3');
    listHeader.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:12px;color:#888';
    listHeader.textContent = 'Recent Games';
    contentArea.appendChild(listHeader);

    games.forEach(game => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;margin-bottom:8px;';
      
      const isMafia = game.winner.includes('Mafia');
      const isCrew = game.winner.includes('Crew');
      
      let icon = '🏆';
      let color = '#fff';
      if (isMafia) { icon = '🔫'; color = '#ff3b30'; }
      else if (isCrew) { icon = '🛡️'; color = '#34c759'; }
      else { icon = '🃏'; color = '#af52de'; }

      const date = new Date(game.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:24px">${icon}</div>
          <div>
            <div style="font-weight:700;color:${color}">${game.winner}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">${date} • ${game.playerCount} Players</div>
          </div>
        </div>
      `;
      contentArea.appendChild(row);
    });

    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = 'width:100%;padding:16px;border-radius:12px;background:rgba(255,59,48,0.1);color:#ff3b30;border:1px solid rgba(255,59,48,0.3);font-size:16px;font-weight:700;margin-top:24px;cursor:pointer;';
    resetBtn.textContent = 'Reset Stats';
    resetBtn.addEventListener('click', () => {
      playTap();
      if (confirm('Reset all game history and player stats?')) {
        historyStore.clearHistory();
        playerStore.players.forEach(p => { p.gamesPlayed = 0; p.gamesWon = 0; playerStore.updatePlayer(p); });
        render();
      }
    });
    contentArea.appendChild(resetBtn);
  }

  function renderLeaderboard() {
    contentArea.innerHTML = '';
    
    let sortedPlayers = [...playerStore.players].filter(p => p.gamesPlayed > 0);
    sortedPlayers.sort((a, b) => winRate(b) - winRate(a) || b.gamesPlayed - a.gamesPlayed);

    if (sortedPlayers.length === 0) {
      contentArea.innerHTML = `<div style="text-align:center;color:#888;padding:40px">No players with game records.</div>`;
      return;
    }

    sortedPlayers.forEach((player, idx) => {
      const row = document.createElement('div');
      row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
      
      const rankBadge = document.createElement('div');
      rankBadge.className = 'rank-badge';
      if (idx === 0) { rankBadge.style.background = '#ffcc00'; rankBadge.style.color = '#000'; rankBadge.textContent = '1'; }
      else if (idx === 1) { rankBadge.style.background = '#e5e4e2'; rankBadge.style.color = '#000'; rankBadge.textContent = '2'; }
      else if (idx === 2) { rankBadge.style.background = '#cd7f32'; rankBadge.style.color = '#fff'; rankBadge.textContent = '3'; }
      else { rankBadge.style.background = 'transparent'; rankBadge.style.color = '#888'; rankBadge.textContent = `${idx + 1}`; }
      row.appendChild(rankBadge);

      const avatar = createAvatar(player, playerStore.getImage(player));
      row.appendChild(avatar);

      const info = document.createElement('div');
      info.style.flex = '1';
      
      const wr = Math.round(winRate(player));
      
      info.innerHTML = `
        <div style="font-weight:700;font-size:16px">${player.name}</div>
        <div style="font-size:12px;color:#888;margin-top:2px">${player.gamesWon}W - ${player.gamesPlayed - player.gamesWon}L</div>
        <div class="win-rate-bar" style="margin-top:8px">
          <div class="bar-track"><div class="bar-fill" style="width:${wr}%"></div></div>
          <span style="font-size:12px;font-weight:700">${wr}%</span>
        </div>
      `;
      row.appendChild(info);

      contentArea.appendChild(row);
    });
  }

  function render() {
    if (currentTab === 'history') renderHistory();
    else renderLeaderboard();
  }

  render();
  return { element: el };
}
