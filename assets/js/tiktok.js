/**
 * tiktok.js — fetch TikTok stats và hiển thị dạng rút gọn (K, M).
 */

const STATS_URL = '/api/tiktok-stats';

function formatShort(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString('en-US');
}

export function fetchTikTokStats() {
  const followerEl = document.getElementById('tt-followers');
  const likesEl    = document.getElementById('tt-likes');

  if (!followerEl || !likesEl) return;

  fetch(STATS_URL)
    .then(res => res.json())
    .then(data => {
      followerEl.textContent = formatShort(data.followers_raw || 0);
      likesEl.textContent    = formatShort(data.likes_raw     || 0);
    })
    .catch(() => {
      followerEl.textContent = '110.6K';
      likesEl.textContent    = '3.8M';
    });
}
