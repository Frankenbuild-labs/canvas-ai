import { NextRequest } from 'next/server'
import sql from '@/lib/database'

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const from = (formData.get('From') || '').toString()
    const to = (formData.get('To') || '').toString()

    // Default settings
    let greeting = 'Please leave a message after the tone.'
    let ringSeconds = 0

    if (to) {
      try {
        const rows = await sql`
          select greeting, ring_seconds
          from voicemail_settings
          where phone_number = ${to}
          limit 1
        ` as any[]
        if (rows.length > 0) {
          greeting = rows[0].greeting || greeting
          ringSeconds = rows[0].ring_seconds ?? ringSeconds
        }
      } catch {
        // If settings table is missing or query fails, fall back to defaults
      }
    }

    const safeGreeting = escapeXml(greeting)
    const pause = ringSeconds > 0 ? `  <Pause length="${ringSeconds}"/>\n` : ''

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${pause}  <Say>${safeGreeting}</Say>\n  <Record playBeep="true" maxLength="120" />\n</Response>`

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  } catch (err: any) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>An error occurred. Please try again later.</Say>\n  <Hangup/>\n</Response>`
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}

export const GET = POST
