/**
 * TikTok Daily Scraper — TikAPI 5 Fix
 */

const TIKTOK_USERNAME = 'nguyendevs'; 
const KV_STATS_CACHE  = 'tt_stats_v6_final_fix';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function fetchFromTikAPI(env) {
  const username = TIKTOK_USERNAME;
  try {
    const url = `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key':  env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    });

    const data = await res.json();
    
    // Structure for tiktok-api23 is usually { userInfo: { user: {...}, stats: {...} } }
    const user = data.userInfo?.user || data.user;
    const stats = data.userInfo?.stats || data.stats;

    if (user && stats) {
      return {
        display_name:   user.nickname || user.display_name || username,
        avatar_url:     user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
        followers_raw:  stats.followerCount || stats.follower_count || 0,
        likes_raw:      stats.heartCount || stats.heart_count || stats.heart || 0,
        // Adding the specific fields requested by the user just in case
        follower:       stats.followerCount || stats.follower_count || 0,
        liked_post:     stats.heartCount || stats.heart_count || stats.heart || 0,
        avatar:         user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
        updated_at:     new Date().toISOString()
      };
    }
    return { error: 'Không khớp cấu trúc API', debug: data };
  } catch (e) {
    return { error: 'Fetch Error', message: e.message };
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    try {
      let data = await env.CACHE.get(KV_STATS_CACHE, { type: 'json' });
      const url = new URL(request.url);
      
      if (!data || url.searchParams.get('refresh') === 'true') {
        const newData = await fetchFromTikAPI(env);
        if (!newData.error) {
          await env.CACHE.put(KV_STATS_CACHE, JSON.stringify(newData));
        }
        data = newData;
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Worker Crash', message: e.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
};
