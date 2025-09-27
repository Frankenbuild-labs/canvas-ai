import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { encryptToken, calculateTokenExpiry, generateOAuthState } from "@/lib/auth-utils"

const OAUTH_CONFIGS = {
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "user_profile,user_media",
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read",
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/auth/authorize/",
    tokenUrl: "https://open-api.tiktok.com/oauth/access_token/",
    scope: "user.info.basic,video.list,video.upload",
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scope: "pages_manage_posts,pages_read_engagement,publish_to_groups",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "w_member_social,r_liteprofile",
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube",
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  },
}

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const { platform } = params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS]) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 })
  }

  const config = OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS]

  if (!code) {
    const oauthState = generateOAuthState()

    // Redirect to OAuth provider
    const authUrl = new URL(config.authUrl)
    authUrl.searchParams.set("client_id", config.clientId!)
    authUrl.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/social/${platform}`)
    authUrl.searchParams.set("scope", config.scope)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("state", oauthState)

    const response = NextResponse.redirect(authUrl.toString())
    response.cookies.set(`oauth_state_${platform}`, oauthState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutes
    })

    return response
  }

  try {
    const expectedState = request.cookies.get(`oauth_state_${platform}`)?.value
    if (!expectedState || state !== expectedState) {
      throw new Error("Invalid OAuth state parameter")
    }

    // Exchange code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/social/${platform}`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || "Failed to get access token")
    }

    let userProfile: any = {}
    try {
      const profileResponse = await fetch(getUserProfileUrl(platform), {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })
      userProfile = await profileResponse.json()
    } catch (error) {
      console.warn(`Failed to get user profile for ${platform}:`, error)
    }

    const userId = 1 // TODO: Get actual user ID from session
    const expiresAt = tokenData.expires_in ? calculateTokenExpiry(tokenData.expires_in) : undefined

    await DatabaseService.saveSocialAccount({
      user_id: userId,
      platform,
      platform_user_id: userProfile.id || userProfile.user_id,
      username: userProfile.username || userProfile.name || userProfile.screen_name,
      access_token: encryptToken(tokenData.access_token),
      refresh_token: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined,
      token_expires_at: expiresAt,
      is_active: true,
    })

    const redirectUrl = new URL("/social-station", process.env.NEXT_PUBLIC_BASE_URL!)
    redirectUrl.searchParams.set("connected", platform)
    redirectUrl.searchParams.set("success", "true")

    const response = NextResponse.redirect(redirectUrl.toString())
    response.cookies.delete(`oauth_state_${platform}`)

    return response
  } catch (error) {
    console.error(`OAuth error for ${platform}:`, error)
    const redirectUrl = new URL("/social-station", process.env.NEXT_PUBLIC_BASE_URL!)
    redirectUrl.searchParams.set("error", "oauth_failed")
    return NextResponse.redirect(redirectUrl.toString())
  }
}

function getUserProfileUrl(platform: string): string {
  const profileUrls: Record<string, string> = {
    instagram: "https://graph.instagram.com/me?fields=id,username",
    twitter: "https://api.twitter.com/2/users/me",
    tiktok: "https://open-api.tiktok.com/user/info/",
    facebook: "https://graph.facebook.com/me?fields=id,name",
    linkedin: "https://api.linkedin.com/v2/people/~",
    youtube: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
  }

  return profileUrls[platform] || ""
}
