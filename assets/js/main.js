import { fetchTikTokStats } from './api/tiktok.js';
import { initRouting } from './core/router.js';
import { initDynamicBackground } from './core/background.js';
import { initMusicPlayer, syncPlayerElements, updateUI } from './components/player.js';
import { initNavigation, initProjectSlider, updateNavActiveState } from './core/ui.js';

initMusicPlayer();
initNavigation();

function detectMobile() {
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    document.body.classList.add('is-mobile');
  } else {
    document.body.classList.remove('is-mobile');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  detectMobile();
  initRouting();
  initDynamicBackground();
  fetchTikTokStats();
  initProjectSlider();
  updateNavActiveState();

  document.body.classList.add('loaded');
});

window.addEventListener('resize', detectMobile);

window.app = {
  syncPlayerElements,
  updateUI,
  loadPage: (url) => import('./core/router.js').then(m => m.loadPage(url, true))
};