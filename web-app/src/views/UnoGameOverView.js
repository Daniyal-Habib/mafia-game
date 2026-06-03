// UnoGameOverView.js — Winner screen with celebration
import { navigate } from '../lib/router.js';
import { createGameButton } from '../components/Components.js';
import { playSuccess, playTap } from '../lib/haptics.js';
import { leaveRoom, deviceId, setRoomStatus } from '../lib/roomStore.js';
import { calculateScore } from '../models/UnoEngine.js';

export function UnoGameOverView(data) {
  const { code, room, winner, isHost } = data || {};

  const el = document.createElement('div');
  el.className = 'view';

  const players = room?.players || {};
  const uno = room?.uno || {};
  const winnerName = players[winner]?.name || 'Unknown';
  const isMe = winner === deviceId;

  // Calculate scores for all players
  const scores = [];
  const turnOrder = uno.turnOrder || [];
  for (const pid of turnOrder) {
    const hand = uno.hands?.[pid] || [];
    scores.push({
      id: pid,
      name: players[pid]?.name || 'Player',
      cardCount: hand.length,
      score: calculateScore(hand),
      isWinner: pid === winner,
    });
  }
  scores.sort((a, b) => a.score - b.score);

  // Confetti canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'uno-confetti-canvas';
  el.appendChild(canvas);

  const content = document.createElement('div');
  content.className = 'scroll-content';
  content.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:24px;position:relative;z-index:1;';

  // Trophy
  content.innerHTML += `
    <div style="font-size:80px;animation:bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1);">🏆</div>
    <div style="text-align:center;">
      <div style="font-size:14px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
        ${isMe ? 'YOU WIN!' : 'WINNER'}
      </div>
      <div style="font-size:36px;font-weight:900;color:#fff;">
        ${winnerName}
      </div>
    </div>
  `;

  // Score table
  const scoreTable = document.createElement('div');
  scoreTable.style.cssText = 'width:100%;max-width:400px;display:flex;flex-direction:column;gap:8px;';

  const tableHeader = document.createElement('div');
  tableHeader.style.cssText = 'font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;';
  tableHeader.textContent = 'SCOREBOARD';
  scoreTable.appendChild(tableHeader);

  scores.forEach((s, i) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex;align-items:center;gap:12px;padding:12px 16px;
      background:${s.isWinner ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.05)'};
      border:1px solid ${s.isWinner ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.08)'};
      border-radius:12px;
    `;
    row.innerHTML = `
      <div style="width:28px;height:28px;border-radius:50%;background:${s.isWinner ? '#34c759' : 'rgba(255,255,255,0.1)'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${s.isWinner ? '#fff' : '#888'};">${i + 1}</div>
      <div style="flex:1;font-weight:600;">${s.name}${s.isWinner ? ' 🎉' : ''}</div>
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:700;color:${s.isWinner ? '#34c759' : '#fff'};">${s.score} pts</div>
        <div style="font-size:11px;color:#888;">${s.cardCount} cards left</div>
      </div>
    `;
    scoreTable.appendChild(row);
  });

  content.appendChild(scoreTable);

  // Buttons
  const btns = document.createElement('div');
  btns.style.cssText = 'width:100%;max-width:400px;display:flex;gap:12px;margin-top:12px;';

  const homeBtn = createGameButton('HOME', 'blue', async () => {
    playTap();
    await leaveRoom(code, isHost);
    navigate('/');
  });
  homeBtn.style.flex = '1';
  btns.appendChild(homeBtn);

  if (isHost) {
    const againBtn = createGameButton('PLAY AGAIN', 'default', async () => {
      playTap();
      await setRoomStatus(code, 'waiting', { uno: null });
      navigate('/mp-waiting', { code, player: players[deviceId], isHost: true, gameMode: 'uno' });
    });
    againBtn.style.flex = '1';
    btns.appendChild(againBtn);
  }

  content.appendChild(btns);
  el.appendChild(content);

  // Confetti animation
  playSuccess();
  setTimeout(() => startConfetti(canvas), 200);

  return { element: el };
}

function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#e53935', '#43a047', '#1e88e5', '#fdd835', '#ff9800', '#9c27b0'];
  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }

  let frame = 0;
  function animate() {
    if (frame > 300) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.vy += 0.05;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    frame++;
    requestAnimationFrame(animate);
  }
  animate();
}
