import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const base = process.env.ONLYOFFICE_DOCSERVER_URL || "http://127.0.0.1:8082"
    
    // Extract the full path after /onlyoffice-proxy/
    const fullPath = req.nextUrl.pathname.replace(/^\/onlyoffice-proxy/, "")
    const targetUrl = `${base}${fullPath}${req.nextUrl.search}`
    
    console.log(`[OnlyOffice Proxy] GET ${req.nextUrl.pathname} -> ${targetUrl}`)

    const headers: HeadersInit = {}
    req.headers.forEach((value, key) => {
      if (!["host", "connection"].includes(key.toLowerCase())) {
        headers[key] = value
      }
    })

    const response = await fetch(targetUrl, { headers, cache: "no-store" })
    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": response.headers.get("cache-control") || "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[OnlyOffice Proxy Error]", error)
    return NextResponse.json(
      { error: "Proxy failed", details: error.message },
      { status: 502 }
    )
  }
}

export const dynamic = "force-dynamic"
