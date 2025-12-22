import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { DatabaseService } from "@/lib/database"
import sql from '@/lib/database'
// Ayrshare removed. Return actual connected accounts (twitter only for now) from DB.

// List connected social accounts for the current user
export async function GET(request: NextRequest) {
  try {
    // Resolve unified composio user id from device id
    const cookieStore = cookies()
    let deviceId = cookieStore.get("device_id")?.value || ""
    if (!deviceId) {
      deviceId = `dev-fixed` // deterministic to avoid churn
      const cookieResp = NextResponse.next()
      cookieResp.cookies.set("device_id", deviceId, { httpOnly: false, sameSite: "lax", path: "/" })
    }
    const userId = await DatabaseService.getOrCreateComposioUserIdForDevice(deviceId)

    // Load DB accounts (twitter direct). If none, return empty list.

    // Default: return DB state; may throw if database not configured
    let accounts = await DatabaseService.getUserSocialAccounts(userId)
    // Fallback: if user-specific list empty, see if any twitter account exists globally and surface it
    if (!accounts || accounts.length === 0) {
      try {
        const globalTwitter = await sql('SELECT * FROM social_accounts WHERE platform = $1 ORDER BY created_at DESC LIMIT 1', ['twitter'])
        if (globalTwitter?.[0]) {
          accounts = [globalTwitter[0]]
        }
      } catch {}
    }
    console.log('[social/accounts]', { deviceId, userId, count: accounts?.length, platforms: accounts?.map(a=>a.platform) })
    return NextResponse.json({ success: true, accounts: accounts || [], userId })
  } catch (error) {
    console.error("Failed to load connected social accounts:", error)
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 })
  }
}
