import { fetchTikTokStats } from './tiktok.js';
import { initRouting } from './router.js';
import { initDynamicBackground } from './background.js';
import { initMusicPlayer, syncPlayerElements, updateUI } from './player.js';
import { initNavigation, initProjectSlider, updateNavActiveState } from './ui.js';

// Initialize music player early to start loading
initMusicPlayer();
initNavigation();

document.addEventListener('DOMContentLoaded', () => {
  initRouting();
  initDynamicBackground();
  fetchTikTokStats();
  initProjectSlider();
  updateNavActiveState();

  document.body.classList.add('loaded');
});

// Optionally expose some functions for debugging in console if needed
window.app = {
  syncPlayerElements,
  updateUI,
  loadPage: (url) => import('./router.js').then(m => m.loadPage(url, true))
};