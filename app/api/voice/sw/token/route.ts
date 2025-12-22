import { NextResponse } from "next/server"
import { getSignalWireEnv, getEmbedToken } from "@/lib/voice/signalwire"

export async function GET() {
  try {
    const { space, projectId } = getSignalWireEnv()
    if (!space) return NextResponse.json({ error: "Missing SIGNALWIRE_SPACE_URL" }, { status: 500 })

    // The Call Widget expects a supported client token (Embed/C2C). Do not mint custom JWTs here.
    const token = getEmbedToken()
    if (!token) {
      return NextResponse.json({ error: "Missing SIGNALWIRE_EMBED_TOKEN (C2C/Embed token). Set it in your env." }, { status: 500 })
    }

    // Bare host, widget prefixes wss:// internally
    const host = space
    return NextResponse.json({ token, host, projectId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "token error" }, { status: 500 })
  }
}
