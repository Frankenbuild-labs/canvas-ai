import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getEnv(name: string, required = false) {
  const v = process.env[name]
  if (required && !v) throw new Error(`Missing env ${name}`)
  return v || ""
}

function collectorEnvForPlatform(platform: string) {
  const key = `BRIGHTDATA_${platform.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_COLLECTOR_URL`
  return key
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const platform = url.searchParams.get('platform') || 'LinkedIn'
    const body = await req.json()

    const token = getEnv("BRIGHTDATA_API_TOKEN", true)
    const zone = getEnv("BRIGHTDATA_ZONE") || "leadgen"
    const collectorKey = collectorEnvForPlatform(platform)
    const collector = getEnv(collectorKey, false)
    const datasetId = getEnv(`BRIGHTDATA_${platform.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_DATASET_ID`, false)

    // Optional profile URLs (dataset mode)
    const profileUrls: string[] = Array.isArray(body.profileUrls) ? body.profileUrls.filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u)) : []

    // If dataset_id is configured and we have profile URLs, use Dataset API
    if (datasetId && profileUrls.length) {
      const input = profileUrls.map((u) => ({ url: u }))
      const dsUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${encodeURIComponent(datasetId)}&notify=false&include_errors=true`
      const dsRes = await fetch(dsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ input })
      })
      if (!dsRes.ok) {
        const t = await dsRes.text()
        return new Response(JSON.stringify({ error: `Dataset request failed`, status: dsRes.status, body: t }), { status: 502 })
      }
      const raw = await dsRes.json()
      // Normalize dataset items
      const items: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.results) ? raw.results : [])
      const leads = items.map((item) => ({
        name: item.name || item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : 'Unknown',
        title: item.position || item.title || body.role || 'Unknown',
        company: item.current_company_name || item.current_company?.name || item.company || 'Unknown',
        email: item.email || null,
        phone: item.phone || null,
        location: item.location || item.city || null,
        url: item.url || item.input_url,
        confidenceScore: 60,
        tags: []
      }))
      return new Response(JSON.stringify({ leads }), { status: 200 })
    }

    if (!collector) {
      return new Response(JSON.stringify({ error: `Missing collector URL env ${collectorKey} or dataset configuration` }), { status: 400 })
    }

    const qs = new URLSearchParams({
      keywords: body.keywords || "",
      role: body.role || body.targetRole || "",
      industry: body.industry || "",
      location: body.location || "",
      depth: body.depth || "Standard",
      includeEmail: String(!!body.includeEmail),
      includePhone: String(!!body.includePhone),
      includeAddress: String(!!body.includeAddress),
      platform
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
    const leads = Array.isArray(data) ? data : (Array.isArray(data?.leads) ? data.leads : [])
    return new Response(JSON.stringify({ leads, raw: leads.length ? undefined : data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "proxy error" }), { status: 400 })
  }
}
