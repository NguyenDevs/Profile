/**
 * tiktok.js — fetch TikTok stats từ linkbio scraper,
 * hiển thị 2 dạng: rút gọn (110.6K / 3.8M) và đầy đủ (110,600 / 3,800,000),
 * tự động luân phiên sau mỗi 5 giây với hiệu ứng flip.
 */

const STATS_URL = '/api/tiktok-stats';

/** Format rút gọn: 110600 → "110.6K", 3800000 → "3.8M" */
function formatShort(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString('en-US');
}

/** Format đầy đủ: 110600 → "110,600" */
function formatFull(num) {
  if (!num || isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Animate flip trên một element: fade out → đổi text → fade in
 * @param {HTMLElement} el
 * @param {string} newText
 */
function flipText(el, newText) {
  el.classList.add('tt-stat-flip-out');
  setTimeout(() => {
    el.textContent = newText;
    el.classList.remove('tt-stat-flip-out');
    el.classList.add('tt-stat-flip-in');
    setTimeout(() => el.classList.remove('tt-stat-flip-in'), 400);
  }, 250);
}

export function fetchTikTokStats() {
  const followerEl = document.getElementById('tt-followers');
  const likesEl    = document.getElementById('tt-likes');

  if (!followerEl || !likesEl) return;

  fetch(STATS_URL)
    .then(res => res.json())
    .then(data => {
      const followersRaw = data.followers_raw || 0;
      const likesRaw     = data.likes_raw     || 0;

      // State: true = rút gọn, false = đầy đủ
      let isShort = true;

      // Hiển thị ban đầu (dạng rút gọn)
      followerEl.textContent = formatShort(followersRaw);
      likesEl.textContent    = formatShort(likesRaw);

      // Toggle mỗi 5 giây
      setInterval(() => {
        isShort = !isShort;

        if (isShort) {
          flipText(followerEl, formatShort(followersRaw));
          flipText(likesEl,    formatShort(likesRaw));
        } else {
          flipText(followerEl, formatFull(followersRaw));
          flipText(likesEl,    formatFull(likesRaw));
        }
      }, 5000);
    })
    .catch(() => {
      // Fallback tĩnh nếu API không response
      followerEl.textContent = '110.6K';
      likesEl.textContent    = '3.8M';
    });
}
