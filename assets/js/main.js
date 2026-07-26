import { fetchTikTokStats } from './api/tiktok.js';
import { initRouting } from './core/router.js';
import { initDynamicBackground, initBgTextStrip } from './core/background.js';
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
  initBgTextStrip();
  fetchTikTokStats();
  initProjectSlider();
  updateNavActiveState();

  document.body.classList.add('loaded');
});

window.addEventListener('resize', detectMobile);

let savedWallpaperConfig = null;

function toggleClockMode(force) {
  const cfg = window.wallpaperConfig;
  if (force === false) {
    if (!document.body.classList.contains('clock-mode')) return;
    document.body.classList.remove('clock-mode');
    if (savedWallpaperConfig && cfg) {
      Object.assign(cfg, savedWallpaperConfig);
      savedWallpaperConfig = null;
    }
    return;
  }
  if (!cfg) return;
  const isActive = document.body.classList.toggle('clock-mode');
  if (isActive) {
    savedWallpaperConfig = { zoom: cfg.zoom, offsetX: cfg.offsetX, offsetY: cfg.offsetY };
    Object.assign(cfg, { zoom: 15, offsetX: 0, offsetY: 0 });
  } else {
    if (savedWallpaperConfig) {
      Object.assign(cfg, savedWallpaperConfig);
      savedWallpaperConfig = null;
    }
  }
}

document.getElementById('nav-clock')?.addEventListener('click', (e) => {
  e.preventDefault();
  toggleClockMode();
});

window.app = {
  syncPlayerElements,
  updateUI,
  loadPage: (url) => import('./core/router.js').then(m => m.loadPage(url, true)),
  toggleClockMode
};