import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    let deviceId = cookieStore.get("device_id")?.value
    if (!deviceId) {
      // Generate a lightweight device id if missing
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      cookieStore.set("device_id", deviceId, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 })
    }
    const composioUserId = await DatabaseService.getOrCreateComposioUserIdForDevice(deviceId)
    // Mirror composio id in a cookie for client access convenience
    cookieStore.set("composio_user_id", composioUserId, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 })
    return NextResponse.json({ success: true, deviceId, composioUserId })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "identity resolution failed" }, { status: 500 })
  }
}
