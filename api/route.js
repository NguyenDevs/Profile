export const config = { runtime: 'edge' }

export default function handler(req) {
  const host = req.headers.get('host')
  const base = 'https://nguyendevs.io.vn'

  if (host?.startsWith('projects.')) {
    return fetch(`${base}/projects.html`)
  }
  if (host?.startsWith('info.')) {
    return fetch(`${base}/info.html`)
  }

  return fetch(`${base}/index.html`)
}