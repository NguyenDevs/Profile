export const config = {
  runtime: 'edge',
};

const LINKBIO_URL = 'https://linkbio.co/NguyenDevs';

// Cache trong memory cho Edge runtime (mỗi instance ~1 phút)
let memCache = null;
let memCacheTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Trả về cache nếu còn hạn
  const now = Date.now();
  if (memCache && (now - memCacheTime) < CACHE_TTL_MS) {
    return new Response(JSON.stringify(memCache), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=21600, stale-while-revalidate' },
    });
  }

  try {
    const res = await fetch(LINKBIO_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await res.text();

    // Lấy follower_count và likes_count từ template data trong HTML
    // Pattern: "follower_count":12345 hoặc "followerCount":12345
    let followersRaw = 0;
    let likesRaw = 0;

    // Thử parse từ window.__data hoặc inline script JSON
    const followerPatterns = [
      /"follower_count"\s*:\s*(\d+)/,
      /"followerCount"\s*:\s*(\d+)/,
      /"fans_count"\s*:\s*(\d+)/,
    ];
    const likesPatterns = [
      /"likes_count"\s*:\s*(\d+)/,
      /"heartCount"\s*:\s*(\d+)/,
      /"heart_count"\s*:\s*(\d+)/,
      /"digg_count"\s*:\s*(\d+)/,
    ];

    for (const p of followerPatterns) {
      const m = html.match(p);
      if (m) { followersRaw = parseInt(m[1], 10); break; }
    }
    for (const p of likesPatterns) {
      const m = html.match(p);
      if (m) { likesRaw = parseInt(m[1], 10); break; }
    }

    // Fallback: lấy từ rendered text trong embed-tiktok--data-item nếu có
    // Pattern: <strong>110.6K</strong> ... <span>Followers</span>
    if (!followersRaw) {
      const followersTextMatch = html.match(/<strong>([\d.,]+[KkMmBb]?)<\/strong>\s*<span>Followers<\/span>/i);
      if (followersTextMatch) {
        followersRaw = parseShortNum(followersTextMatch[1]);
      }
    }
    if (!likesRaw) {
      const likesTextMatch = html.match(/<strong>([\d.,]+[KkMmBb]?)<\/strong>\s*<span>Likes<\/span>/i);
      if (likesTextMatch) {
        likesRaw = parseShortNum(likesTextMatch[1]);
      }
    }

    const data = {
      followers_raw: followersRaw || 110600,
      likes_raw: likesRaw || 3800000,
      source: 'linkbio',
      updated_at: new Date().toISOString(),
    };

    memCache = data;
    memCacheTime = now;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=21600, stale-while-revalidate' },
    });

  } catch (e) {
    // Fallback data nếu scrape lỗi
    const fallback = {
      followers_raw: 110600,
      likes_raw: 3800000,
      source: 'fallback',
      error: e.message,
      updated_at: new Date().toISOString(),
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=3600' },
    });
  }
}

/**
 * Convert "110.6K" → 110600, "3.8M" → 3800000
 */
function parseShortNum(str) {
  if (!str) return 0;
  str = str.replace(/,/g, '').trim();
  const lower = str.toLowerCase();
  if (lower.endsWith('b')) return Math.round(parseFloat(lower) * 1_000_000_000);
  if (lower.endsWith('m')) return Math.round(parseFloat(lower) * 1_000_000);
  if (lower.endsWith('k')) return Math.round(parseFloat(lower) * 1_000);
  return parseInt(str, 10) || 0;
}
