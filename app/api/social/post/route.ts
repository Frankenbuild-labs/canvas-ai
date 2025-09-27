import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { decryptToken, isTokenExpired } from "@/lib/auth-utils"

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

    const userId = 1 // TODO: Get actual user ID from session
    const results = []

    const userAccounts = await DatabaseService.getUserSocialAccounts(userId)
    const accountMap = new Map(userAccounts.map((acc) => [acc.platform, acc]))

    for (const platform of platforms) {
      try {
        const account = accountMap.get(platform)
        if (!account) {
          results.push({
            platform,
            success: false,
            error: `${platform} account not connected`,
          })
          continue
        }

        if (isTokenExpired(account.token_expires_at)) {
          results.push({
            platform,
            success: false,
            error: `${platform} token expired - please reconnect`,
          })
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

        results.push({
          platform,
          success: true,
          data: result,
        })
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Posted to ${results.filter((r) => r.success).length}/${platforms.length} platforms`,
    })
  } catch (error) {
    console.error("Post error:", error)
    return NextResponse.json({ error: "Failed to post content" }, { status: 500 })
  }
}
