export const TIKTOK_WORKER_URL = '/api/tiktok-stats';

export function fetchTikTokStats() {
  const followerEl = document.getElementById('tt-followers');
  const likesEl = document.getElementById('tt-likes');
  const avatarEl = document.querySelector('.tiktok-card__avatar');
  const nameEl = document.querySelector('.tiktok-card__name');

  if (!followerEl || !likesEl) return;

  fetch(TIKTOK_WORKER_URL)
    .then(res => res.json())
    .then(data => {
      const formatNum = (num) => {
        if (!num || isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
      };

      const displayFollowers = data.followers_raw ? formatNum(data.followers_raw) : (data.followers_fmt || '0');
      const displayLikes = data.likes_raw ? formatNum(data.likes_raw) : (data.likes_fmt || '0');

      if (displayFollowers && followerEl) followerEl.textContent = displayFollowers;
      if (displayLikes && likesEl) likesEl.textContent = displayLikes;

      if (data.display_name && nameEl) nameEl.textContent = data.display_name;
      if (data.avatar_url && avatarEl) avatarEl.src = data.avatar_url;
    })
    .catch(() => {
      console.warn('[TikTok stats] Service temporarily unavailable');
    });
}
