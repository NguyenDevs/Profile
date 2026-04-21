import { initProjectSlider, updateNavActiveState } from './ui.js';
import { updateUI, syncPlayerElements } from './player.js';

let isTransitioning = false;

export function initRouting() {
  window.addEventListener('popstate', function () {
    loadPage(window.location.pathname, false);
  });

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const isInternal = !href.includes('://') && !href.startsWith('mailto:') && !href.startsWith('tel:');
    const isLocalFile = href.endsWith('.html') || href.startsWith('./') || href.startsWith('/') || !href.includes('.');

    if (isInternal && isLocalFile && !link.target && !link.hasAttribute('download') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const targetUrl = link.href;
      // Normalize URL for comparison
      const cleanTarget = targetUrl.replace(/\/index\.html$/, '/');
      const cleanCurrent = window.location.href.replace(/\/index\.html$/, '/');
      if (cleanTarget === cleanCurrent) return;

      loadPage(targetUrl, true);
    }
  }, true);

  document.addEventListener('forceMusicPlay', function (e) {
    const music = document.getElementById('bg-music');
    if (music && e.detail.wasPlaying && music.paused) {
      music.play().catch(() => { });
    }
    // Re-sync UI after page content swap
    updateUI();
  });
}

export function loadPage(url, push) {
  if (isTransitioning) return;
  isTransitioning = true;

  const music = document.getElementById('bg-music');
  const wasPlaying = music ? !music.paused : false;

  // Save current state before transition
  if (music) {
    localStorage.setItem('music_current_time', music.currentTime);
    localStorage.setItem('music_paused', music.paused);
  }

  // Show Loader
  let loader = document.getElementById('page-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'page-loader';
    document.body.appendChild(loader);
  }
  loader.className = 'page-loader loading';
  loader.style.opacity = '1';
  loader.style.width = '0%';
  setTimeout(() => { loader.style.width = '70%'; }, 10);

  const content = document.querySelector('.wrapper') || document.querySelector('.projects-container') || document.querySelector('.coming-soon');
  if (content) content.style.opacity = '0';

  fetch(url)
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      document.title = doc.title;

      const newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
      newLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!document.querySelector(`link[href="${href}"]`)) {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = href;
          document.head.appendChild(l);
        }
      });

      const newContent = doc.querySelector('.wrapper') || doc.querySelector('.projects-container') || doc.querySelector('.coming-soon');
      if (!newContent) {
        window.location.href = url;
        return;
      }

      if (push) {
        // Normalize URL for history: replace /index.html with /
        const displayUrl = url.replace(/\/index\.html$/, '/');
        history.pushState(null, '', displayUrl);
      }

      if (content) {
        content.parentElement.replaceChild(newContent, content);
        newContent.style.opacity = '0';
        newContent.offsetHeight;
        newContent.style.transition = 'opacity 0.4s ease';
        newContent.style.opacity = '1';
        window.scrollTo(0, 0);
      }

      if (newContent.classList.contains('projects-grid') || newContent.querySelector('.projects-grid')) {
        initProjectSlider();
      }

      const mPlayer = document.getElementById('mobile-music-player');
      if (mPlayer) {
        if (newContent.classList.contains('projects-container') || newContent.classList.contains('coming-soon')) {
          mPlayer.classList.add('mini-player-mode');
        } else {
          mPlayer.classList.remove('mini-player-mode');
        }
      }

      updateNavActiveState();

      syncPlayerElements(false);

      // Finish Loader
      if (loader) {
        loader.className = 'page-loader finished';
        setTimeout(() => {
          loader.className = 'page-loader';
          loader.style.opacity = '0';
          loader.style.width = '0%';
        }, 500);
      }

      const event = new CustomEvent('forceMusicPlay', { detail: { wasPlaying: wasPlaying, url: url } });
      document.dispatchEvent(event);

      isTransitioning = false;
    })
    .catch(err => {
      console.error('[SPA] Navigation Error:', err);
      window.location.href = url;
    });
}
