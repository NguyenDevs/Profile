import { fetchTikTokStats } from './tiktok.js';
import { initRouting } from './router.js';
import { initDynamicBackground } from './background.js';
import { initMusicPlayer, syncPlayerElements, updateUI } from './player.js';
import { initNavigation, initProjectSlider, updateNavActiveState } from './ui.js';

// Initialize music player early to start loading
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

// Optionally expose some functions for debugging in console if needed
window.app = {
  syncPlayerElements,
  updateUI,
  loadPage: (url) => import('./router.js').then(m => m.loadPage(url, true))
};