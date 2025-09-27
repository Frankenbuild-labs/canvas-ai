import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple proxy to a locally running code-server (VS Code Web) at http://localhost:3100
// We require you to run code-server separately (see README) with --host 127.0.0.1 --port 3100

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const target = new URL(url.pathname.replace(/^\/api\/vscode/, '') || '/', 'http://127.0.0.1:3100')
  target.search = url.search

  const resp = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      // Pass through headers that help with static assets
      'accept': req.headers.get('accept') || '*/*',
      'accept-encoding': req.headers.get('accept-encoding') || '',
      'user-agent': req.headers.get('user-agent') || '',
      'cookie': req.headers.get('cookie') || '',
    },
  })

  const body = await resp.arrayBuffer()
  const headers = new Headers(resp.headers)
  headers.set('cache-control', 'no-store')

  return new Response(body, {
    status: resp.status,
    headers,
  })
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const target = new URL(url.pathname.replace(/^\/api\/vscode/, '') || '/', 'http://127.0.0.1:3100')
  target.search = url.search

  const resp = await fetch(target.toString(), {
    method: 'POST',
    headers: Object.fromEntries(req.headers),
    body: req.body,
  })

  const body = await resp.arrayBuffer()
  const headers = new Headers(resp.headers)
  headers.set('cache-control', 'no-store')

  return new Response(body, {
    status: resp.status,
    headers,
  })
}
