import { NextRequest, NextResponse } from "next/server"

// Complete reverse proxy for OnlyOffice Document Server supporting all HTTP methods
async function proxyRequest(req: NextRequest) {
  const base = process.env.ONLYOFFICE_DOCSERVER_URL || "http://127.0.0.1:8082"
  const pathname = req.nextUrl.pathname.replace(/^\/onlyoffice-proxy/, "")
  const search = req.nextUrl.search
  const targetUrl = `${base.replace(/\/$/, "")}${pathname}${search}`
  
  console.log(`[OnlyOffice Proxy] ${req.method} ${req.nextUrl.pathname} -> ${targetUrl}`)

  try {
    const headers: HeadersInit = {}
    req.headers.forEach((value, key) => {
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headers[key] = value
      }
    })

    const options: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = await req.arrayBuffer()
    }

    const resp = await fetch(targetUrl, options)
    const contentType = resp.headers.get("content-type") || "application/octet-stream"
    const body = await resp.arrayBuffer()

    return new NextResponse(body, {
      status: resp.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": resp.headers.get("cache-control") || "public, max-age=3600",
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to proxy request to Document Server" },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req)
}

export async function POST(req: NextRequest) {
  return proxyRequest(req)
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req)
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req)
}

export const dynamic = "force-dynamic"
