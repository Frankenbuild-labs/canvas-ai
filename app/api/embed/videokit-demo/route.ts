import { NextResponse } from 'next/server'

// Mark as dynamic to avoid any static analysis or bundling surprises
export const dynamic = 'force-dynamic'

// This legacy CESDK demo route has been removed. Keep a tiny stub to return 410.
export async function GET() {
  return NextResponse.json(
    {
      error: 'This legacy demo has been removed. Please use /creative-studio/video-studio.',
    },
    { status: 410 },
  )
}

export async function POST() {
  return GET()
}
