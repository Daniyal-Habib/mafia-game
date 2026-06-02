// SplashScreen — animated splash matching iOS SplashScreenView.swift
import { navigate } from '../lib/router.js';

export function SplashScreen() {
  const el = document.createElement('div');
  el.className = 'view';
  el.style.cssText = 'background:#000;display:flex;align-items:center;justify-content:center;';

  el.innerHTML = `
    <div style="text-align:center;transform:scale(0.8);opacity:0.5;transition:transform 1.2s ease,opacity 1.2s ease" id="splash-content">
      <div style="position:relative;display:inline-block">
        <div style="width:150px;height:150px;border-radius:50%;background:rgba(204,26,10,0.4);filter:blur(20px);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
        <div style="font-size:80px;position:relative;background:linear-gradient(135deg,#cc1a0a,#ff8000);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🌙</div>
      </div>
      <div style="font-size:24px;font-weight:700;color:rgba(204,26,10,0.8);margin-top:20px;letter-spacing:2px">MAFIA AMONGUS</div>
    </div>
  `;

  let timeout;
  const cleanup = () => { clearTimeout(timeout); };

  requestAnimationFrame(() => {
    const content = el.querySelector('#splash-content');
    if (content) {
      content.style.transform = 'scale(1)';
      content.style.opacity = '1';
    }
  });

  timeout = setTimeout(() => {
    navigate('/', null, { replace: true });
  }, 2000);

  return { element: el, cleanup };
}
