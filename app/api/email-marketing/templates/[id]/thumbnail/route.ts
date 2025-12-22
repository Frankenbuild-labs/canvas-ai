import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getEmailTemplate, getSettings } from '@/lib/email-marketing/database'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tpl = await getEmailTemplate(id)
    if (!tpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const settings = await getSettings()
    const primary = settings?.metadata?.primary_brand_color || '#0f766e' // teal fallback
    const bg2 = shadeColor(primary, -10)

    const name = (tpl.metadata?.name || 'Template').slice(0, 40)
    const subject = (tpl.metadata?.subject || '').slice(0, 80)
    // Prefer stored preview_html, else strip tags from content
    const previewHtml = tpl.metadata?.preview_html || ''
    const textPreview = previewHtml
      ? stripTags(previewHtml)
      : stripTags(tpl.metadata?.content || '')
    const content = textPreview.slice(0, 180)

    const svg = `
      <svg width="640" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${primary}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
        </defs>
        <rect width="640" height="400" rx="12" fill="url(#g1)"/>
        <rect x="24" y="24" width="592" height="352" rx="10" fill="#ffffff"/>
        <rect x="24" y="24" width="592" height="48" rx="10" fill="${primary}" opacity="0.08"/>
        <text x="40" y="56" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="18" font-weight="600" fill="#0f172a">${escapeXml(
          name
        )}</text>
        <text x="40" y="98" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="14" fill="#334155">Subject:</text>
        <text x="110" y="98" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="14" fill="#0f172a">${escapeXml(
          subject
        )}</text>
        <rect x="40" y="116" width="560" height="1" fill="#e2e8f0" />
        ${multilineText(content, 40, 148, 560, 18, 6)}
      </svg>
    `

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    console.error('thumbnail error', e)
    return NextResponse.json({ error: 'Failed to render thumbnail' }, { status: 500 })
  }
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Render multi-line text block with word wrapping into <text> lines
function multilineText(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  const approxCharsPerLine = Math.floor(maxWidth / 8) // heuristic
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (test.length > approxCharsPerLine) {
      lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) break
    } else {
      current = test
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  const out = lines
    .slice(0, maxLines)
    .map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" font-family="-apple-system,Segoe UI,Roboto,Arial" font-size="14" fill="#334155">${escapeXml(line)}</text>`) 
    .join('')
  return out
}

function shadeColor(hex: string, percent: number) {
  // Simple hex shade util
  const f = parseInt(hex.slice(1), 16)
  const t = percent < 0 ? 0 : 255
  const p = Math.abs(percent) / 100
  const R = f >> 16
  const G = (f >> 8) & 0x00ff
  const B = f & 0x0000ff
  const newR = Math.round((t - R) * p) + R
  const newG = Math.round((t - G) * p) + G
  const newB = Math.round((t - B) * p) + B
  return `#${(0x1000000 + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`
}
