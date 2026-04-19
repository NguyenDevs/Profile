export const config = {
  runtime: 'edge',
};

const TIKTOK_USERNAME = 'nguyendevs';

export default async function handler(request) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  try {
    const url = `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${TIKTOK_USERNAME}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': rapidApiKey || '', // Phải config trong Vercel Environment Variables
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    });

    const data = await res.json();
    const user = data.userInfo?.user || data.user;
    const stats = data.userInfo?.stats || data.stats;

    let responseData = {};

    if (user && stats) {
      responseData = {
        display_name:   user.nickname || user.display_name || TIKTOK_USERNAME,
        avatar_url:     user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
        followers_raw:  stats.followerCount || stats.follower_count || 0,
        likes_raw:      stats.heartCount || stats.heart_count || stats.heart || 0,
        updated_at:     new Date().toISOString()
      };
    } else {
      // Trả về dữ liệu mẫu nếu API lỗi hoặc Key hết hạn để giao diện không bị trống
      responseData = { 
        display_name: "Nguyên Dev",
        avatar_url: "assets/avatar/avatar.png",
        followers_raw: 110600,
        likes_raw: 3800000,
        error: 'API Error (Check RAPIDAPI_KEY)',
        debug: data 
      };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' 
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Fetch Error', message: e.message }), {
      status: 200, // Để vẫn trả về JSON thay vì làm sập trang
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
