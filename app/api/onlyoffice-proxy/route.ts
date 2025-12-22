import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ 
    error: "Missing path. Use /onlyoffice-proxy/web-apps/... instead",
    hint: "This is the base route. The catch-all is at [...path]"
  }, { status: 404 })
}

export const dynamic = "force-dynamic"
