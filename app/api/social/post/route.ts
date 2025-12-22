import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { DatabaseService } from "@/lib/database"
import sql from "@/lib/database"
import { decryptToken, isTokenExpired } from "@/lib/auth-utils"
// Ayrshare removed. Using direct platform logic; twitter will use our own OAuth tokens.
// Lazy-load broker inside the handler to avoid module eval errors causing 500s

// Platform-specific posting functions
const postToInstagram = async (content: string, mediaUrl?: string, accessToken?: string) => {
  // Instagram Basic Display API doesn't support posting
  // You'd need Instagram Business API for posting
  throw new Error("Instagram posting requires Business API setup")
}

const postToTwitter = async (content: string, mediaUrl?: string, accessToken?: string) => {
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: content,
      ...(mediaUrl && { media: { media_ids: [mediaUrl] } }),
    }),
  })

  return response.json()
}

const postToTikTok = async (content: string, mediaUrl?: string, accessToken?: string) => {
  // TikTok requires video upload first, then post creation
  const response = await fetch("https://open-api.tiktok.com/share/video/upload/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: mediaUrl,
      text: content,
      privacy_level: "SELF_ONLY", // or 'PUBLIC_TO_EVERYONE'
    }),
  })

  return response.json()
}

const postToFacebook = async (content: string, mediaUrl?: string, accessToken?: string) => {
  const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: content,
      ...(mediaUrl && { link: mediaUrl }),
    }),
  })

  return response.json()
}

const postToLinkedIn = async (content: string, mediaUrl?: string, accessToken?: string) => {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: "urn:li:person:PERSON_ID", // You'd get this from profile
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  })

  return response.json()
}

const postToYouTube = async (content: string, mediaUrl?: string, accessToken?: string) => {
  // YouTube requires video upload to YouTube API
  const response = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        title: content.substring(0, 100), // YouTube title limit
        description: content,
        tags: [],
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "private", // or 'public'
      },
    }),
  })

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { platforms, content, mediaUrl, scheduleTime } = await request.json()

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: "No platforms specified" }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Resolve unified composio user id from device id cookie
    const deviceId = cookies().get("device_id")?.value || ""
    const userId = await DatabaseService.getOrCreateComposioUserIdForDevice(deviceId)
    const results = [] as any[]

    // Try to load legacy accounts, but don't crash if DB is unavailable
    let accountMap = new Map<string, any>()
    try {
      const userAccounts = await DatabaseService.getUserSocialAccounts(userId)
      accountMap = new Map(userAccounts.map((acc) => [acc.platform, acc]))
    } catch {
      accountMap = new Map()
    }

    // Try to load Composio broker dynamically; if it fails, we'll fallback to legacy paths
    let broker: null | ((args: any) => Promise<any>) = null
    try {
      const mod = await import("@/lib/connections/broker")
      broker = mod?.postViaComposio ?? null
    } catch (e) {
      console.warn("Composio broker unavailable; falling back to legacy posting only", e)
      broker = null
    }

    for (const platform of platforms) {
      try {
        // Direct twitter path (override composio) if twitter platform
        if (platform === "twitter") {
          try {
            console.log('[post] twitter attempt', { userId, platforms })
            let acct = accountMap.get("twitter")
            if (!acct || !acct.access_token) {
              // Fallback: try to load any twitter account globally
              try {
                const rows = await sql('SELECT * FROM social_accounts WHERE platform = $1 ORDER BY updated_at DESC LIMIT 1', ['twitter'])
                if (rows?.[0]?.access_token) {
                  acct = rows[0]
                }
              } catch {}
              if (!acct || !acct.access_token) {
                results.push({ platform, success: false, error: "Twitter not connected (no token)" })
                continue
              }
            }
            if (isTokenExpired(acct.token_expires_at)) {
              results.push({ platform, success: false, error: "Twitter token expired - reconnect" })
              continue
            }
            let accessToken: string
            try {
              accessToken = decryptToken(acct.access_token)
            } catch (e:any) {
              results.push({ platform, success: false, error: "Twitter token decrypt failed", details: String(e) })
              continue
            }
            const resp = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: content }),
            })
            const data = await resp.json().catch(() => ({}))
            if (!resp.ok) {
              results.push({ platform, success: false, error: data?.error || data?.title || "Twitter post failed", data })
              continue
            }
            try {
              const postId = data?.data?.id || `tw_${Date.now()}`
              await DatabaseService.cacheSocialFeedItem({
                user_id: userId,
                platform: "twitter",
                platform_post_id: postId,
                content,
                media_urls: mediaUrl ? [mediaUrl] : [],
                posted_at: new Date(),
                engagement_data: {},
              })
            } catch {}
            results.push({ platform, success: true, data, path: "twitter-direct" })
            continue
          } catch (e: any) {
            results.push({ platform, success: false, error: e?.message || "Twitter post error" })
            continue
          }
        }
        // Always attempt Composio action first (production path) when available
        if (broker) {
          const brokerRes = await broker({ userId, platform, content, mediaUrl })
          if (brokerRes?.success) {
          // Cache the post immediately for the right-panel feed visibility
          try {
            const platformPostId = extractPlatformPostId(platform, brokerRes.data) || `local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
            await DatabaseService.cacheSocialFeedItem({
              user_id: userId,
              platform,
              platform_post_id: platformPostId,
              content,
              media_urls: mediaUrl ? [mediaUrl] : [],
              posted_at: new Date(),
              engagement_data: {},
            })
          } catch (e) {
            console.warn("Failed to cache social feed item:", e)
          }
            results.push({ platform, success: true, data: brokerRes.data, path: "composio" })
            continue
          }
          // Broker failed – record structured error for transparency
          results.push({ platform, success: false, error: brokerRes?.error || 'Composio posting failed', path: 'composio' })
          // fall through to legacy attempt
        }

        // If Composio reports no active connection or unsupported platform mapping,
        // try legacy path ONLY if we have a legacy account and token
        const account = accountMap.get(platform)
        if (!account) {
          results.push({ platform, success: false, error: `${platform} not connected (no legacy account)` })
          continue
        }
        if (isTokenExpired(account.token_expires_at)) {
          results.push({ platform, success: false, error: `${platform} token expired - please reconnect` })
          continue
        }
        const accessToken = decryptToken(account.access_token)

        let result
        switch (platform) {
          case "instagram":
            result = await postToInstagram(content, mediaUrl, accessToken)
            break
          case "twitter":
            result = await postToTwitter(content, mediaUrl, accessToken)
            break
          case "tiktok":
            result = await postToTikTok(content, mediaUrl, accessToken)
            break
          case "facebook":
            result = await postToFacebook(content, mediaUrl, accessToken)
            break
          case "linkedin":
            result = await postToLinkedIn(content, mediaUrl, accessToken)
            break
          case "youtube":
            result = await postToYouTube(content, mediaUrl, accessToken)
            break
          default:
            throw new Error(`Unsupported platform: ${platform}`)
        }

        results.push({ platform, success: true, data: result, path: 'legacy' })
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          path: broker ? 'legacy-fallback' : 'legacy-only'
        })
      }
    }

    const okCount = results.filter((r: any) => r.success).length
    const allOk = okCount === platforms.length
    // If zero successes, still return 207 (partial) but include detailed errors
    const status = allOk ? 200 : 207
    return NextResponse.json({
      success: allOk,
      results,
      message: `Posted to ${okCount}/${platforms.length} platforms`,
      diagnostics: {
        userId,
        platformsAttempted: platforms,
        brokerLoaded: !!broker,
        failures: results.filter((r: any) => !r.success).map((r: any) => ({ platform: r.platform, error: r.error, path: r.path }))
      }
    }, { status })
  } catch (error) {
    console.error("Post error:", error)
    return NextResponse.json({ error: "Failed to post content" }, { status: 500 })
  }
}

// Try to extract a platform post id from various possible response shapes
function extractPlatformPostId(platform: string, data: any): string | null {
  if (!data) return null
  const p = platform.toLowerCase()

  const candidates: any[] = [
    data,
    data.data,
    data.result,
    data.post,
    data.item,
    data.tweet,
    data.video,
  ].filter(Boolean)

  for (const obj of candidates) {
    const keys = Object.keys(obj)
    for (const k of keys) {
      if (k === "id" && typeof obj[k] === "string") return obj[k]
      if (/(_id|post_id|tweet_id|video_id|status_id)$/i.test(k) && typeof obj[k] === "string") return obj[k]
    }
  }

  // Some APIs return nested identifiers
  try {
    if (p === "twitter") {
      if (typeof data?.data?.id === "string") return data.data.id
    }
    if (p === "facebook" || p === "instagram") {
      if (typeof data?.id === "string") return data.id
      if (typeof data?.post_id === "string") return data.post_id
    }
    if (p === "linkedin") {
      if (typeof data?.id === "string") return data.id
      if (typeof data?.data?.id === "string") return data.data.id
    }
    if (p === "youtube" || p === "tiktok") {
      if (typeof data?.id === "string") return data.id
      if (typeof data?.video_id === "string") return data.video_id
    }
  } catch {}

  return null
}
