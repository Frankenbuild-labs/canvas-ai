import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Vector search not configured. Set MEMORY_BACKEND=postgres and provide DATABASE_URL and an embeddings provider (e.g., OPENAI_API_KEY).",
      docs: "See MEMORY_FOUNDATION.md for setup steps.",
    },
    { status: 501 },
  )
}
