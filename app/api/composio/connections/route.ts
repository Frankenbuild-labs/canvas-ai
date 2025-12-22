import { NextRequest, NextResponse } from "next/server"
import { Composio } from "@composio/core"
import { VercelProvider } from "@composio/vercel"
import { DatabaseService } from "@/lib/database"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "COMPOSIO_API_KEY not set" }, { status: 400 })
    }

    const deviceId = cookies().get("device_id")?.value || ""
    const userId = await DatabaseService.getOrCreateComposioUserIdForDevice(deviceId)

    const composio = new Composio({ apiKey, provider: new VercelProvider() })
    const list = await composio.connectedAccounts.list({ userIds: [userId] })
    const items: any[] = Array.isArray(list?.items) ? list.items : []

    // Normalize output for easier debugging
    const connections = items.map((it: any) => ({
      id: it?.id,
      status: it?.status,
      toolkitSlug: it?.toolkit?.slug,
      toolkitName: it?.toolkit?.name,
      expiresAt: it?.expiresAt || it?.expires_at || null,
      authConfigId: it?.authConfigId || it?.auth_config_id || it?.auth_config?.id || null,
    }))

    return NextResponse.json({ success: true, userId, connections })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list connections' }, { status: 500 })
  }
}
