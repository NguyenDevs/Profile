import { initProjectSlider, updateNavActiveState } from './ui.js';
import { updateUI, syncPlayerElements } from './player.js';

let isTransitioning = false;
let currentFetchController = null;

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeUrl(url) {
  return url
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, '');
}

function toFetchUrl(url) {
  if (url.endsWith('.html')) return url;
  if (url.endsWith('/')) return url + 'index.html';
  return url + '.html';
}

function isSameUrl(a, b) {
  return normalizeUrl(a) === normalizeUrl(b);
}

function isInfoPage(url) {
  // Chỉ match đúng /info hoặc /info/ — không match /info-page hay /portfolio-info
  return /\/info\/?$/.test(normalizeUrl(url));
}

// ─── Cleanup helpers ───────────────────────────────────────────────────────

function cleanupPageSpecificResources() {
  if (window._livedTimeInterval) {
    clearInterval(window._livedTimeInterval);
    window._livedTimeInterval = null;
  }
  if (window._threejsRafId) {
    cancelAnimationFrame(window._threejsRafId);
    window._threejsRafId = null;
  }
  if (window._endskyRafId) {
    cancelAnimationFrame(window._endskyRafId);
    window._endskyRafId = null;
  }

  document
      .querySelectorAll('#threejs-canvas, #endsky-canvas, #speed-slider-container')
      .forEach(el => el.remove());

  document.querySelectorAll('script[src*="threejs-bg.js"], script[src*="endsky-bg.js"], script[src*="three.min.js"]')
      .forEach(s => s.remove());

  // Xóa injected styles từ trang trước
  document.querySelectorAll('style[data-spa-injected]').forEach(s => s.remove());

  // Xóa injected external scripts từ trang trước
  document.querySelectorAll('script[data-spa-injected]').forEach(s => s.remove());
}

function applyPageBodyStyles(url) {
  const gradientBg = document.querySelector('.gradient-bg');
  const bgNoise = document.querySelector('.bg-noise');

  if (isInfoPage(url)) {
    document.body.style.background = '#08080e';
    document.body.style.overflow = 'hidden';
    gradientBg?.style.setProperty('display', 'none');
    bgNoise?.style.setProperty('display', 'none');
  } else {
    document.body.style.background = '';
    document.body.style.overflow = '';
    if (gradientBg) { gradientBg.style.display = ''; gradientBg.style.visibility = 'visible'; }
    if (bgNoise) { bgNoise.style.display = ''; bgNoise.style.visibility = 'visible'; }
  }
}

// ─── Script injection ──────────────────────────────────────────────────────

function injectScripts(doc) {
  doc.querySelectorAll('script').forEach(script => {
    if (script.type === 'module') return;

    const src = script.getAttribute('src');
    if (src) {
      if (src.includes('main.js')) return;
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.dataset.spaInjected = '1'; // ← đánh dấu để cleanup sau
      if (script.type) s.type = script.type;
      document.body.appendChild(s);
    } else {
      // Inline script: tạo, chạy, xóa
      const s = document.createElement('script');
      s.textContent = script.textContent;
      document.body.appendChild(s);
      s.remove();
    }
  });
}

function injectStyles(doc) {
  // Stylesheet links
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.dataset.spaInjected = '1';
      document.head.appendChild(l);
    }
  });

  // Inline styles
  doc.querySelectorAll('style').forEach(style => {
    const s = document.createElement('style');
    s.textContent = style.textContent;
    s.dataset.spaInjected = '1'; // ← đánh dấu để cleanup sau
    document.head.appendChild(s);
  });
}

// ─── Loader ────────────────────────────────────────────────────────────────

function getOrCreateLoader() {
  let loader = document.getElementById('page-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'page-loader';
    document.body.appendChild(loader);
  }
  return loader;
}

function showLoader(loader) {
  loader.className = 'page-loader loading';
  loader.style.opacity = '1';
  loader.style.width = '0%';
  setTimeout(() => { loader.style.width = '70%'; }, 10);
}

function hideLoader(loader) {
  loader.className = 'page-loader finished';
  setTimeout(() => {
    loader.className = 'page-loader';
    loader.style.opacity = '0';
    loader.style.width = '0%';
  }, 500);
}

// ─── Music helpers ─────────────────────────────────────────────────────────

function saveMusicState(music) {
  if (!music) return;
  localStorage.setItem('music_current_time', music.currentTime);
  localStorage.setItem('music_paused', music.paused);
}

// ─── Core ──────────────────────────────────────────────────────────────────

export function initRouting() {
  window.addEventListener('popstate', () => {
    loadPage(window.location.pathname, false);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const isExternal = href.includes('://') || href.startsWith('mailto:') || href.startsWith('tel:');
    const isDownload = link.hasAttribute('download');
    const hasTarget = !!link.target;
    const looksLocal = href.endsWith('.html') || href.startsWith('./') || href.startsWith('/') || !href.includes('.');

    if (isExternal || isDownload || hasTarget || !looksLocal) return;

    e.preventDefault();
    e.stopPropagation();

    const targetUrl = link.href.replace(/\.html$/, '');
    if (isSameUrl(targetUrl, window.location.href)) return;

    loadPage(targetUrl, true);
  }, true);

  document.addEventListener('forceMusicPlay', (e) => {
    const music = document.getElementById('bg-music');
    if (music && e.detail.wasPlaying && music.paused) {
      music.play().catch(() => {});
    }
    updateUI();
  });
}

export function loadPage(url, push) {
  if (isTransitioning) return;

  // Abort pending fetch nếu có
  if (currentFetchController) {
    currentFetchController.abort();
  }
  currentFetchController = new AbortController();

  isTransitioning = true;

  const music = document.getElementById('bg-music');
  const wasPlaying = music ? !music.paused : false;
  saveMusicState(music);

  const loader = getOrCreateLoader();
  showLoader(loader);

  // Capture content ref sau khi DOM ổn định (trước fetch)
  const content = document.querySelector('.wrapper')
      || document.querySelector('.projects-container')
      || document.querySelector('.coming-soon');

  if (content) content.style.opacity = '0';

  fetch(toFetchUrl(url), { signal: currentFetchController.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        document.title = doc.title;

        const newContent = doc.querySelector('.wrapper')
            || doc.querySelector('.projects-container')
            || doc.querySelector('.coming-soon');

        if (!newContent) {
          window.location.href = url;
          return;
        }

        if (push) {
          history.pushState(null, '', normalizeUrl(url));
        }

        cleanupPageSpecificResources();
        injectStyles(doc);
        injectScripts(doc);
        applyPageBodyStyles(url);

        // Swap content
        const liveContent = document.querySelector('.wrapper')
            || document.querySelector('.projects-container')
            || document.querySelector('.coming-soon');

        if (!liveContent) {
          window.location.href = url;
          return;
        }

        liveContent.parentElement.replaceChild(newContent, liveContent);
        newContent.style.opacity = '0';
        newContent.offsetHeight; // force reflow
        newContent.style.transition = 'opacity 0.4s ease';
        newContent.style.opacity = '1';
        window.scrollTo(0, 0);

        // Post-swap setup
        if (newContent.classList.contains('projects-grid') || newContent.querySelector('.projects-grid')) {
          initProjectSlider();
        }

        const mPlayer = document.getElementById('mobile-music-player');
        if (mPlayer) {
          const isMini = newContent.classList.contains('projects-container')
              || newContent.classList.contains('coming-soon');
          mPlayer.classList.toggle('mini-player-mode', isMini);
        }

        updateNavActiveState();
        syncPlayerElements(false);
        hideLoader(loader);

        document.dispatchEvent(
            new CustomEvent('forceMusicPlay', { detail: { wasPlaying, url } })
        );
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          isTransitioning = false;
          return;
        }
        console.error('[SPA] Navigation Error:', err);
        window.location.href = url;
      })
      .finally(() => {
        isTransitioning = false;
        currentFetchController = null;
      });
}