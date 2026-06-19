const LIMITS = {
  '/api/clone':   { max: 3,  windowMs: 60_000 },
  '/api/respond': { max: 7,  windowMs: 60_000 },
}

// Sliding window: ip:path -> [timestamp, ...]
// Module-level Map persists across requests within the same edge worker instance.
const windows = new Map()

function clientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export default function middleware(request) {
  const { pathname } = new URL(request.url)
  const limit = LIMITS[pathname]
  if (!limit || request.method !== 'POST') return

  const ip = clientIp(request)
  const key = `${ip}:${pathname}`
  const now = Date.now()
  const cutoff = now - limit.windowMs

  const hits = (windows.get(key) ?? []).filter(t => t > cutoff)
  hits.push(now)
  windows.set(key, hits)

  if (hits.length > limit.max) {
    return new Response(
      JSON.stringify({ error: 'Too many requests — please wait a minute.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

export const config = {
  matcher: ['/api/clone', '/api/respond'],
}
