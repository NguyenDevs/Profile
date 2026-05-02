export const config = {
  runtime: 'edge',
};

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@nguyendevs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Fallback khi scrape thất bại
const FALLBACK = {
  followers_raw: 111111,
  likes_raw: 3900000,
  source: 'fallback',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // TikTok server-side renders user stats vào thẻ
    // <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
    const res = await fetch(TIKTOK_PROFILE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      cf: { cacheEverything: false },
    });

    const html = await res.text();

    // ── Phương pháp 1: parse JSON từ script rehydration ──────────────────
    let followersRaw = 0;
    let likesRaw = 0;

    const scriptMatch = html.match(
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);

        // Duyệt đệ quy để tìm stats
        const stats = deepFind(json, (obj) =>
          obj && typeof obj === 'object' &&
          ('followerCount' in obj || 'fans' in obj)
        );

        if (stats) {
          followersRaw = stats.followerCount ?? stats.fans ?? 0;
          likesRaw     = stats.heartCount ?? stats.heart ?? stats.diggCount ?? 0;
        }
      } catch (_) {
        // JSON parse lỗi → thử regex fallback
      }
    }

    // ── Phương pháp 2: regex trực tiếp trên HTML nếu P1 thất bại ─────────
    if (!followersRaw) {
      const fMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
      if (fMatch) followersRaw = parseInt(fMatch[1], 10);
    }
    if (!likesRaw) {
      const lMatch = html.match(/"heartCount"\s*:\s*(\d+)/);
      if (lMatch) likesRaw = parseInt(lMatch[1], 10);
    }

    // ── Phương pháp 3: parse từ SIGI_STATE (cấu trúc cũ hơn) ────────────
    if (!followersRaw) {
      const sigiMatch = html.match(/window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?});\s*window/);
      if (sigiMatch) {
        try {
          const sigi = JSON.parse(sigiMatch[1]);
          const stats = deepFind(sigi, (obj) =>
            obj && typeof obj === 'object' && 'followerCount' in obj
          );
          if (stats) {
            followersRaw = stats.followerCount ?? 0;
            likesRaw     = stats.heartCount ?? 0;
          }
        } catch (_) {}
      }
    }

    const data = {
      followers_raw: followersRaw || FALLBACK.followers_raw,
      likes_raw:     likesRaw     || FALLBACK.likes_raw,
      source:        followersRaw ? 'tiktok' : 'fallback',
      updated_at:    new Date().toISOString(),
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400',
      },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ ...FALLBACK, error: e.message, updated_at: new Date().toISOString() }),
      { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=3600' } }
    );
  }
}

/**
 * Tìm kiếm đệ quy trong object/array,
 * trả về node đầu tiên mà predicate(node) === true.
 * @param {*} obj
 * @param {Function} predicate
 * @param {number} depth giới hạn độ sâu để tránh vô hạn
 * @returns {*|null}
 */
function deepFind(obj, predicate, depth = 0) {
  if (depth > 12 || obj === null || typeof obj !== 'object') return null;
  if (predicate(obj)) return obj;

  for (const key of Object.keys(obj)) {
    const result = deepFind(obj[key], predicate, depth + 1);
    if (result) return result;
  }
  return null;
}
