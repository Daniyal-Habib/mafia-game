// WordRevealView.js - Swipe to reveal word or hint for Words Imposter mode
import { navigate, goBack } from '../lib/router.js';
import { playerStore } from '../models/Player.js';
import { createGameButton, createNavBar, createNavButton } from '../components/Components.js';
import { playScrub, playSuccess, playTap } from '../lib/haptics.js';

export function WordRevealView(data) {
  const session = data?.session;
  if (!session) {
    goBack();
    return { element: document.createElement('div') };
  }

  const el = document.createElement('div');
  el.className = 'view';
  el.style.overflow = 'hidden';

  // State
  let dragOffset = 0;
  let hasRevealed = false;
  let showPassDevice = false;
  let isTransitioning = false;
  let lastDragY = null;
  
  const revealThreshold = 80;
  const maxDrag = window.innerHeight * 0.35;

  const container = document.createElement('div');
  container.className = 'role-reveal-container';
  el.appendChild(container);

  // We need a nav bar
  let uTurnBtn = document.createElement('button');
  uTurnBtn.className = 'nav-btn icon-btn';
  uTurnBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
  `;
  uTurnBtn.style.display = 'none';
  uTurnBtn.onclick = () => {
    showPassDevice = false;
    hasRevealed = false;
    dragOffset = 0;
    render();
  };

  const nav = createNavBar('', 
    createNavButton('‹', () => goBack(), { icon: true }),
    uTurnBtn
  );
  nav.style.position = 'absolute';
  nav.style.top = '0';
  nav.style.left = '0';
  nav.style.right = '0';
  nav.style.zIndex = '100';
  nav.style.background = 'transparent';
  nav.style.borderBottom = 'none';
  el.appendChild(nav);

  function renderLayer(playerIndex, isIncoming = false) {
    const player = session.players[playerIndex];
    if (!player) return null;
    
    // Check if player is imposter by directly comparing to session imposterID
    const isImposter = session.imposterID === player.id;
    const reveal = {
      type: isImposter ? 'hint' : 'word',
      value: isImposter ? session.selectedWord.hint : session.selectedWord.word
    };

    const img = playerStore.getImage(player);

    const layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.willChange = 'transform';
    layer.style.transition = isIncoming ? 'transform 0.35s ease-in-out' : 'none';
    if (isIncoming) {
      layer.style.transform = `translateX(100%)`;
      layer.style.zIndex = '50';
    } else {
      layer.style.zIndex = '10';
    }

    // Role layer (bottom)
    const wordLayer = document.createElement('div');
    wordLayer.className = `word-reveal-layer ${isImposter ? 'imposter-bg' : 'normal-bg'}`;
    
    if (isImposter) {
      wordLayer.innerHTML = `
        <div class="word-label">You are the</div>
        <div class="word-value" style="color:#ff3b30">Imposter</div>
        <div style="font-size:16px;color:#888;margin:20px 0 10px">The word is related to:</div>
        <div class="hint-value">${reveal.value}</div>
      `;
    } else {
      wordLayer.innerHTML = `
        <div class="word-label">The Word Is</div>
        <div class="word-value" style="color:#007aff">${reveal.value}</div>
        <div style="font-size:14px;color:#888;margin-top:20px;padding:0 30px;text-align:center">
          Find the imposter who doesn't know this word.
        </div>
      `;
    }
    layer.appendChild(wordLayer);

    // Player card (top)
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card-layer';
    playerCard.style.transform = `translateY(${isIncoming ? 0 : -dragOffset}px)`;
    if (!isIncoming) {
      playerCard.style.borderRadius = dragOffset > 0 ? '0 0 30px 30px' : '0';
      if (!isTransitioning && !showPassDevice) {
        playerCard.addEventListener('touchstart', onTouchStart, {passive: false});
        playerCard.addEventListener('touchmove', onTouchMove, {passive: false});
        playerCard.addEventListener('touchend', onTouchEnd);
        playerCard.addEventListener('mousedown', onMouseDown);
      }
    }

    const bg = document.createElement('div');
    bg.className = 'player-card-bg';
    if (img) {
      bg.innerHTML = `<img src="${img}" alt="${player.name}" />`;
    } else {
      bg.innerHTML = `<div class="fallback-bg" style="background:linear-gradient(135deg, #004080, #007aff)"><div class="fallback-initial">${player.name.charAt(0).toUpperCase()}</div></div>`;
    }
    playerCard.appendChild(bg);

    const grad = document.createElement('div');
    grad.className = 'player-card-gradient';
    playerCard.appendChild(grad);

    const content = document.createElement('div');
    content.className = 'player-card-content';
    // Removed progress bar dots
    content.innerHTML = '';
    
    const flexSpacer = document.createElement('div');
    flexSpacer.style.flex = '1';
    content.appendChild(flexSpacer);
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-card-name';
    nameLabel.textContent = player.name;
    content.appendChild(nameLabel);

    if (showPassDevice && !isIncoming) {
      const passPrompt = document.createElement('div');
      passPrompt.className = 'pass-device-prompt';
      passPrompt.innerHTML = '<p>Pass the device to the<br/>next player</p>';
      const contBtn = createGameButton('CONTINUE', 'default', () => continueToNext(), {width:'200px'});
      contBtn.style.margin = '0 auto';
      passPrompt.appendChild(contBtn);
      content.appendChild(passPrompt);
    } else if (!showPassDevice) {
      const swipePrompt = document.createElement('div');
      swipePrompt.className = 'swipe-prompt';
      swipePrompt.style.opacity = Math.max(0, 1 - (dragOffset / maxDrag));
      swipePrompt.innerHTML = `
        <p>Swipe up to see your word</p>
        <div class="chevron">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </div>
      `;
      content.appendChild(swipePrompt);
    } else {
      const emptySpace = document.createElement('div');
      emptySpace.style.height = '150px';
      content.appendChild(emptySpace);
    }

    playerCard.appendChild(content);
    layer.appendChild(playerCard);

    return layer;
  }

  function render() {
    container.innerHTML = '';
    
    uTurnBtn.style.display = showPassDevice ? 'flex' : 'none';

    if (!isTransitioning) {
      const currentLayer = renderLayer(session.currentPlayerIndex);
      if (currentLayer) container.appendChild(currentLayer);
    } else {
      const currentLayer = renderLayer(session.currentPlayerIndex);
      const incomingLayer = renderLayer(session.currentPlayerIndex + 1, true);
      
      container.appendChild(currentLayer);
      if (incomingLayer) container.appendChild(incomingLayer);

      requestAnimationFrame(() => {
        currentLayer.style.transition = 'transform 0.35s ease-in-out';
        currentLayer.style.transform = 'translateX(-100%)';
        if (incomingLayer) {
          incomingLayer.style.transform = 'translateX(0)';
        }
      });
    }
  }

  // Touch Handling
  let isDragging = false;
  
  function onTouchStart(e) {
    if (showPassDevice || isTransitioning) return;
    isDragging = true;
    lastDragY = e.touches ? e.touches[0].clientY : e.clientY;
    const card = container.querySelector('.player-card-layer');
    if (card) card.style.transition = 'none';
  }

  let lastHapticDragPosition = 0;
  let lastDragDirection = 0;

  function onTouchMove(e) {
    if (!isDragging) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const dragAmount = lastDragY - currentY;
    
    if (dragAmount > 0) {
      const newOffset = Math.min(dragAmount, maxDrag);
      const direction = newOffset > dragOffset ? 1 : (newOffset < dragOffset ? -1 : 0);
      const movementSinceLastHaptic = Math.abs(newOffset - lastHapticDragPosition);
      
      if (direction !== 0 && direction !== lastDragDirection) {
        playScrub();
        lastHapticDragPosition = newOffset;
        lastDragDirection = direction;
      } else if (movementSinceLastHaptic >= 20) {
        playScrub();
        lastHapticDragPosition = newOffset;
      }
      
      dragOffset = newOffset;
      
      const card = container.querySelector('.player-card-layer');
      if (card) {
        card.style.transform = `translateY(${-dragOffset}px)`;
        card.style.borderRadius = dragOffset > 0 ? '0 0 30px 30px' : '0';
      }
      const prompt = container.querySelector('.swipe-prompt');
      if (prompt) prompt.style.opacity = Math.max(0, 1 - (dragOffset / maxDrag));
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    lastHapticDragPosition = 0;
    lastDragDirection = 0;
    
    if (dragOffset > revealThreshold) {
      hasRevealed = true;
      showPassDevice = true;
      playSuccess();
    }
    
    const card = container.querySelector('.player-card-layer');
    if (card) {
      card.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.transform = 'translateY(0)';
      card.style.borderRadius = '0';
    }
    dragOffset = 0;
    setTimeout(() => {
      render();
    }, 400);
  }

  function onMouseDown(e) {
    onTouchStart(e);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e) { onTouchMove(e); }
  function onMouseUp(e) {
    onTouchEnd(e);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function continueToNext() {
    playTap();
    if (session.isLastPlayer) {
      navigate('/words-voting', { session }, { replace: true });
    } else {
      isTransitioning = true;
      render();
      
      setTimeout(() => {
        session.moveToNextPlayer();
        hasRevealed = false;
        showPassDevice = false;
        isTransitioning = false;
        dragOffset = 0;
        render();
      }, 350);
    }
  }

  render();

  return { element: el };
}
