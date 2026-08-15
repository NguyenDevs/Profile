import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@nguyendevs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

const FALLBACK = {
  followers_raw: 113799,
  likes_raw: 4082986,
  source: 'fallback',
}

async function fetchTikTokStats() {
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
  })

  const html = await res.text()

  let followersRaw = 0
  let likesRaw = 0

  const scriptMatch = html.match(
    /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  )

  if (scriptMatch) {
    try {
      const json = JSON.parse(scriptMatch[1])

      const stats = (() => {
        for (const key of Object.keys(json)) {
          const obj = json[key]
          if (obj && typeof obj === 'object' && ('followerCount' in obj || 'fans' in obj)) {
            return obj
          }
        }
        return null
      })()

      if (stats) {
        followersRaw = stats.followerCount ?? stats.fans ?? 0
        likesRaw = stats.heartCount ?? stats.heart ?? stats.diggCount ?? 0
      }
    } catch (_) {}
  }

  if (!followersRaw) {
    const fMatch = html.match(/"followerCount"\s*:\s*(\d+)/)
    if (fMatch) followersRaw = parseInt(fMatch[1], 10)
  }
  if (!likesRaw) {
    const lMatch = html.match(/"heartCount"\s*:\s*(\d+)/)
    if (lMatch) likesRaw = parseInt(lMatch[1], 10)
  }

  if (!followersRaw) {
    const sigiMatch = html.match(/window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?});\s*window/)
    if (sigiMatch) {
      try {
        const sigi = JSON.parse(sigiMatch[1])
        const stats = (() => {
          for (const key of Object.keys(sigi)) {
            const obj = sigi[key]
            if (obj && typeof obj === 'object' && 'followerCount' in obj) {
              return obj
            }
          }
          return null
        })()
        if (stats) {
          followersRaw = stats.followerCount ?? 0
          likesRaw = stats.heartCount ?? 0
        }
      } catch (_) {}
    }
  }

  return {
    followersRaw,
    likesRaw,
    source: followersRaw ? 'tiktok' : 'fallback',
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    // 1. Try to get cached latest follower from Redis (fallback)
    let cachedFollower = null
    try {
      cachedFollower = await redis.get({ key: 'latest_follower', default: null })
    } catch {}

    // 2. Try to fetch fresh data from TikTok
    const result = await fetchTikTokStats()

    // 3. If fetch successful, update Redis with new data
    if (result.followersRaw) {
      await redis.set(
        { key: 'latest_follower', value: { followers: result.followersRaw, likes: result.likesRaw, fetchedAt: Date.now() }, ex: 24 * 60 * 60 }
      )
    }

    // 4. Return data: use cached if no new data, otherwise use fresh
    const data = {
      followers_raw: result.followersRaw || (cachedFollower ? cachedFollower.followers : FALLBACK.followers_raw),
      likes_raw: result.likesRaw     || (cachedFollower ? cachedFollower.likes : FALLBACK.likes_raw),
      source: result.followersRaw ? 'tiktok' : (cachedFollower ? 'cached' : 'fallback'),
      updated_at: new Date().toISOString(),
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400',
      },
    })

  } catch (e) {
    // If fetch fails and we have cached data, use it as fallback
    try {
      const cachedFollower = await redis.get({ key: 'latest_follower', default: null })
      if (cachedFollower) {
        return new Response(
          JSON.stringify({
            followers_raw: cachedFollower.followers,
            likes_raw: cachedFollower.likes,
            source: 'cached',
            error: e.message,
            updated_at: new Date().toISOString(),
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=3600' } }
        )
      }
    } catch {}

    return new Response(
      JSON.stringify({ ...FALLBACK, error: e.message, updated_at: new Date().toISOString() }),
      { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=3600' } }
    )
  }
}