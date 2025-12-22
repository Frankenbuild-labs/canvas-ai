import { NextRequest, NextResponse } from 'next/server'

const ALLOW_HOSTS = new Set([
  'raw.githubusercontent.com',
  'github.com',
  'raw.fastgit.org',
  'rawcdn.githack.com',
  'raw.githack.com',
])

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    const injectBase = searchParams.get('injectBase') === '1'
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    const target = new URL(url)
    if (!ALLOW_HOSTS.has(target.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
    }

    const res = await fetch(url, { headers: { 'User-Agent': 'canvasai-email-templates-fetch' } })
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status })
    let html = await res.text()
    if (injectBase) {
      try {
        // Compute base href as directory URL
        const baseHref = url.slice(0, url.lastIndexOf('/') + 1)
        // Strip scripts for safety in previews
        html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${baseHref}">`)
        } else {
          html = `<!doctype html><html><head><base href="${baseHref}"></head><body>${html}</body></html>`
        }
      } catch {}
    }
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
