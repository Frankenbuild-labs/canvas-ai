import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const contact = searchParams.get("contact") || ""
  const say = "Connecting you now."
  // Record the bridged call; provider compatible attributes
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>${say}</Say>\n  ${contact ? `<Dial record="record-from-answer">${contact}</Dial>` : "<Hangup/>"}\n</Response>`
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } })
}

export const GET = POST
