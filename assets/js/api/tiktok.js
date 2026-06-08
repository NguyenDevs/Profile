const STATS_URL = '/api/tiktok-stats';
const CACHE_KEY = 'tt_stats_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 phút

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
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { followers, likes, timestamp } = JSON.parse(cached);
      followerEl.textContent = formatShort(followers);
      likesEl.textContent    = formatShort(likes);

      if (Date.now() - timestamp < CACHE_TTL) {
        return;
      }
    } catch (e) {
      console.warn('[TikTok] Cache error:', e);
    }
  }
  fetch(STATS_URL)
    .then(res => res.json())
    .then(data => {
      const followers = data.followers_raw || 0;
      const likes = data.likes_raw || 0;

      followerEl.textContent = formatShort(followers);
      likesEl.textContent    = formatShort(likes);

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        followers,
        likes,
        timestamp: Date.now()
      }));
    })
    .catch(err => {
      console.warn('[TikTok] Fetch error:', err);
      if (followerEl.textContent === '' || followerEl.textContent === '0') {
        followerEl.textContent = '110.6K';
        likesEl.textContent    = '3.8M';
      }
    });
}

