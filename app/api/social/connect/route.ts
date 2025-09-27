import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json()

    const supportedPlatforms = ["instagram", "twitter", "tiktok", "facebook", "linkedin", "youtube"]

    if (!supportedPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 })
    }

    // Return the OAuth URL for the platform
    const oauthUrl = `/api/auth/social/${platform}`

    return NextResponse.json({
      success: true,
      oauthUrl,
      message: `Redirecting to ${platform} OAuth...`,
    })
  } catch (error) {
    console.error("Connect error:", error)
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 500 })
  }
}
