// EliminationAnnounce.js - Night kill / vote out animations
import { navigate } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { playHeavy, playError } from '../lib/haptics.js';

export function EliminationAnnounce(data) {
  const session = data?.session;
  const record = data?.record;
  const winState = data?.winState;
  
  if (!session || !record) {
    navigate('/', null, {replace: true});
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view elimination-view';

  const img = playerStore.getImage(record.player);
  let timer;

  if (record.method === 'killed') {
    // --- Sword Slice Animation ---
    const container = document.createElement('div');
    container.className = 'slice-container';

    // Top Right Part
    const tr = document.createElement('div');
    tr.className = 'slice-part top-right';
    tr.style.background = img ? `url(${img}) center/cover` : 'linear-gradient(135deg, #cc1a0a, #ff8000)';
    container.appendChild(tr);

    // Bottom Left Part
    const bl = document.createElement('div');
    bl.className = 'slice-part bottom-left';
    bl.style.background = img ? `url(${img}) center/cover` : 'linear-gradient(135deg, #cc1a0a, #ff8000)';
    container.appendChild(bl);

    // Flash line
    const flash = document.createElement('div');
    flash.className = 'slice-flash';
    container.appendChild(flash);

    // Text
    const text = document.createElement('div');
    text.className = 'slice-text';
    text.innerHTML = `
      <div class="name">${record.player.name}</div>
      <div class="subtitle">was killed in the night</div>
    `;
    container.appendChild(text);
    
    el.appendChild(container);

    // Animation sequence
    requestAnimationFrame(() => {
      // 1. Flash
      setTimeout(() => {
        playHeavy();
        flash.style.opacity = '1';
      }, 500);

      // 2. Slice apart
      setTimeout(() => {
        flash.style.opacity = '0';
        tr.style.transform = 'translate(30px, -30px) rotate(5deg)';
        bl.style.transform = 'translate(-30px, 30px) rotate(-5deg)';
        
        // Darken the background halves
        tr.style.filter = 'brightness(0.3)';
        bl.style.filter = 'brightness(0.3)';
        
        text.style.opacity = '1';
        playError();
      }, 800);

      // 3. Move to next view
      if (!winState) {
        timer = setTimeout(() => showImposterCount(), 4000);
      } else {
        timer = setTimeout(() => finishSequence(), 4000);
      }
    });

  } else {
    // --- Ejection Animation (Voted Out) ---
    const container = document.createElement('div');
    container.className = 'ejection-container';

    // Stars background
    const starsBg = document.createElement('div');
    starsBg.className = 'stars-bg';
    for(let i=0; i<30; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random()*100}%`;
      star.style.top = `${Math.random()*100}%`;
      star.style.animationDelay = `${Math.random()*2}s`;
      starsBg.appendChild(star);
    }
    container.appendChild(starsBg);

    // Ejected Avatar
    const avatar = document.createElement('div');
    avatar.className = 'eject-avatar';
    avatar.style.left = '-200px';
    if (img) {
      avatar.innerHTML = `<img src="${img}" />`;
    } else {
      avatar.innerHTML = `<div class="fallback" style="background:#ff8000;display:flex;align-items:center;justify-content:center;font-size:80px;font-weight:700">${record.player.name.charAt(0)}</div>`;
    }
    container.appendChild(avatar);

    // Result Text
    const isMafia = record.role.team === 'mafia';
    const isJester = record.role.id === 'jester';
    const revealColor = isJester ? '#ff3b30' : (isMafia ? '#34c759' : '#ff3b30');
    const revealText = isJester ? 'Was Not An Imposter' : (isMafia ? 'Was An Imposter' : 'Was Not An Imposter');
    const resultText = document.createElement('div');
    resultText.className = 'eject-result';
    resultText.innerHTML = `
      <div class="name">${record.player.name}</div>
      <div class="verdict" style="color:${revealColor}">
        ${revealText}
      </div>
    `;
    container.appendChild(resultText);

    el.appendChild(container);

    requestAnimationFrame(() => {
      // Fly across
      setTimeout(() => {
        playHeavy();
        avatar.style.transform = 'translateX(calc(100vw + 400px)) rotate(720deg)';
      }, 500);

      // Show text
      setTimeout(() => {
        resultText.style.opacity = '1';
        playError();

        // If not mafia and not jester, show Continue -> Reveal Real Imposters flow
        if (!isMafia && !isJester && !winState) {
          const continueBtn = document.createElement('button');
          continueBtn.className = 'continue-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.style.cssText = 'margin-top:24px;padding:12px 32px;font-size:16px;font-weight:600;border:none;border-radius:12px;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;animation:pulseFade 1.5s infinite;backdrop-filter:blur(4px);';
          resultText.appendChild(continueBtn);

          continueBtn.addEventListener('click', () => {
            continueBtn.remove();
            // Reveal the real living imposters
            const realImposters = session.alivePlayers.filter(p => session.getRoleForPlayer(p.id).team === 'mafia');
            const revealEl = document.createElement('div');
            revealEl.className = 'real-imposters-reveal';
            revealEl.style.cssText = 'margin-top:24px;text-align:center;opacity:0;transition:opacity 0.5s ease;';
            revealEl.innerHTML = `
              <div style="font-size:14px;color:#ff3b30;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">The Real Imposter${realImposters.length !== 1 ? 's' : ''}</div>
              ${realImposters.map(p => `<div style="font-size:22px;font-weight:700;color:#fff;margin:6px 0;">${p.name}</div>`).join('')}
            `;
            resultText.appendChild(revealEl);
            requestAnimationFrame(() => { revealEl.style.opacity = '1'; });

            // After 2 seconds, show imposter count
            timer = setTimeout(() => showImposterCount(), 2000);
          });
        } else if (!winState) {
          // Mafia or Jester ejection without win: go to imposter count after delay
          timer = setTimeout(() => showImposterCount(), 2500);
        } else {
          timer = setTimeout(() => finishSequence(), 2500);
        }
      }, 2000);
    });
  }

  function showImposterCount() {
    el.innerHTML = '';
    const countView = document.createElement('div');
    countView.className = 'imposter-count';
    
    const count = session.mafiaAliveCount;
    
    countView.innerHTML = `
      <div class="count-text">${count} Imposter${count !== 1 ? 's' : ''} remain.</div>
      <div class="icons">${'🔪'.repeat(count)}</div>
      <div style="font-size:12px;color:#888;margin-top:40px;animation:pulseFade 1.5s infinite">Tap to continue</div>
    `;
    
    el.appendChild(countView);
    
    setTimeout(() => {
      countView.style.opacity = '1';
    }, 100);

    countView.addEventListener('click', () => {
      finishSequence();
    });
  }

  function finishSequence() {
    if (winState) {
      navigate('/game-over', { session, winState }, { replace: true });
    } else {
      navigate('/gameplay', { session }, { replace: true });
    }
  }

  const cleanup = () => { clearTimeout(timer); };
  return { element: el, cleanup };
}
