export const config = {
  runtime: 'edge',
};

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@nguyendevs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const FALLBACK = {
  followers_raw: 113799,
  likes_raw: 4082986,
  source: 'fallback',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
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
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      cf: { cacheEverything: false },
    });

    const html = await res.text();

    let followersRaw = 0;
    let likesRaw = 0;

    const scriptMatch = html.match(
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);

        const stats = deepFind(json, (obj) =>
          obj && typeof obj === 'object' &&
          ('followerCount' in obj || 'fans' in obj)
        );

        if (stats) {
          followersRaw = stats.followerCount ?? stats.fans ?? 0;
          likesRaw     = stats.heartCount ?? stats.heart ?? stats.diggCount ?? 0;
        }
      } catch (_) {
      }
    }

    if (!followersRaw) {
      const fMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
      if (fMatch) followersRaw = parseInt(fMatch[1], 10);
    }
    if (!likesRaw) {
      const lMatch = html.match(/"heartCount"\s*:\s*(\d+)/);
      if (lMatch) likesRaw = parseInt(lMatch[1], 10);
    }

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
function deepFind(obj, predicate, depth = 0, visited = new Set()) {
  if (depth > 12 || obj === null || typeof obj !== 'object') return null;
  if (visited.has(obj)) return null;
  visited.add(obj);

  if (predicate(obj)) return obj;

  for (const key of Object.keys(obj)) {
    const result = deepFind(obj[key], predicate, depth + 1, visited);
    if (result) return result;
  }
  return null;
}
