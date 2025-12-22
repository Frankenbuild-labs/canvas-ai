import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getEnv(name: string, required = false) {
  const v = process.env[name]
  if (required && !v) throw new Error(`Missing env ${name}`)
  return v || ""
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = getEnv("BRIGHTDATA_API_TOKEN", true)
    const zone = getEnv("BRIGHTDATA_ZONE") || "leadgen"
    const collector = getEnv("BRIGHTDATA_LINKEDIN_COLLECTOR_URL", true)

    // Build a query URL for your Bright Data LinkedIn collector.
    // Pass normalized search parameters as query string so your collector can use them.
    const qs = new URLSearchParams({
      keywords: body.keywords || "",
      role: body.role || body.targetRole || "",
      industry: body.industry || "",
      location: body.location || "",
      depth: body.depth || "Standard",
      includeEmail: String(!!body.includeEmail),
      includePhone: String(!!body.includePhone)
    })
    const targetUrl = collector + (collector.includes("?") ? "&" : "?") + qs.toString()

    const res = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ zone, url: targetUrl, format: "json" })
    })
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `Bright Data request failed`, status: res.status, body: text }), { status: 502 })
    }
    const txt = await res.text()
    let data: any
    try { data = JSON.parse(txt) } catch { data = { raw: txt } }
    // Normalize to { leads: [...] }
    const leads = Array.isArray(data) ? data : (Array.isArray(data?.leads) ? data.leads : [])
    return new Response(JSON.stringify({ leads, raw: leads.length ? undefined : data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "proxy error" }), { status: 400 })
  }
}
