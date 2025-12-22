import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Composio } from "@composio/core"
import { VercelProvider } from "@composio/vercel"
import { DatabaseService } from "@/lib/database"
import { toPlatformFromToolkit } from "@/lib/connections/mappings"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let { userId } = body as { userId?: string }
    // Resolve userId from device cookie if not provided
    if (!userId) {
      const deviceId = cookies().get("device_id")?.value || ""
      userId = await DatabaseService.getOrCreateComposioUserIdForDevice(deviceId)
    }
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "COMPOSIO_API_KEY not configured" }, { status: 500 })
    }

    const composio = new Composio({ apiKey, provider: new VercelProvider() })
  const list = await composio.connectedAccounts.list({ userIds: [userId] })
  const items: any[] = Array.isArray(list?.items) ? (list.items as any[]) : []

    // Persist connection registry and project to social_accounts for known platforms
    for (const item of items) {
      const status: string | undefined = item?.status
      const connectionId: string | undefined = item?.id
      const toolkitSlug: string | undefined = item?.toolkit?.slug
      const platform = toPlatformFromToolkit(toolkitSlug)
      const expiresRaw: any = (item as any)?.expiresAt || (item as any)?.expires_at || null
      const expiresAt: Date | undefined = expiresRaw ? new Date(expiresRaw) : undefined
      const scopes: string[] | undefined = Array.isArray((item as any)?.scopes) ? (item as any).scopes : undefined

      try {
        await DatabaseService.upsertSocialConnection({
          user_id: userId,
          provider: "composio",
          toolkit_slug: toolkitSlug ?? null,
          platform: platform ?? null,
          connection_id: connectionId ?? null,
          status: status ?? null,
          scopes: scopes ?? [],
          expires_at: expiresAt ?? null,
        })
      } catch (e) {
        // DB might be unavailable in some environments; continue without failing the request
      }

      // Mirror to social_accounts when it's a known social platform and active
      if (platform && status === "ACTIVE") {
        try {
          await DatabaseService.saveSocialAccount({
            user_id: userId,
            platform,
            platform_user_id: undefined,
            username: undefined,
            access_token: "composio",
            refresh_token: undefined,
            token_expires_at: expiresAt,
            is_active: true,
          } as any)
        } catch {}
      }
    }

    return NextResponse.json({ success: true, connections: items })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Failed to list connections" }, { status: 500 })
  }
}
