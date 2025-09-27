// API route to fetch and cache social media feeds
import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { decryptToken, isTokenExpired } from "@/lib/auth-utils"

interface SocialPost {
  id: string
  platform: string
  content?: string
  media_url?: string
  posted_at: Date
  engagement: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
  }
}

// Fetch posts from Instagram
async function fetchInstagramPosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&access_token=${accessToken}`,
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch Instagram posts")
    }

    return (
      data.data?.map((post: any) => ({
        id: post.id,
        platform: "instagram",
        content: post.caption,
        media_url: post.media_url || post.thumbnail_url,
        posted_at: new Date(post.timestamp),
        engagement: {
          likes: post.like_count,
          comments: post.comments_count,
        },
      })) || []
    )
  } catch (error) {
    console.error("Instagram fetch error:", error)
    return []
  }
}

// Fetch posts from Twitter/X
async function fetchTwitterPosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      "https://api.twitter.com/2/users/me/tweets?tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch Twitter posts")
    }

    return (
      data.data?.map((tweet: any) => ({
        id: tweet.id,
        platform: "twitter",
        content: tweet.text,
        media_url: tweet.attachments?.media_keys?.[0]
          ? data.includes?.media?.find((m: any) => m.media_key === tweet.attachments.media_keys[0])?.url
          : undefined,
        posted_at: new Date(tweet.created_at),
        engagement: {
          likes: tweet.public_metrics?.like_count,
          comments: tweet.public_metrics?.reply_count,
          shares: tweet.public_metrics?.retweet_count,
          views: tweet.public_metrics?.impression_count,
        },
      })) || []
    )
  } catch (error) {
    console.error("Twitter fetch error:", error)
    return []
  }
}

// Fetch posts from Facebook
async function fetchFacebookPosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me/posts?fields=id,message,created_time,attachments,likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`,
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch Facebook posts")
    }

    return (
      data.data?.map((post: any) => ({
        id: post.id,
        platform: "facebook",
        content: post.message,
        media_url: post.attachments?.data?.[0]?.media?.image?.src,
        posted_at: new Date(post.created_time),
        engagement: {
          likes: post.likes?.summary?.total_count,
          comments: post.comments?.summary?.total_count,
          shares: post.shares?.count,
        },
      })) || []
    )
  } catch (error) {
    console.error("Facebook fetch error:", error)
    return []
  }
}

// Fetch posts from LinkedIn
async function fetchLinkedInPosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      "https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:PERSON_ID&sortBy=CREATED&count=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch LinkedIn posts")
    }

    return (
      data.elements?.map((post: any) => ({
        id: post.id,
        platform: "linkedin",
        content: post.text?.text,
        media_url: post.content?.contentEntities?.[0]?.thumbnails?.[0]?.resolvedUrl,
        posted_at: new Date(post.created?.time),
        engagement: {
          likes: post.totalSocialActivityCounts?.numLikes,
          comments: post.totalSocialActivityCounts?.numComments,
          shares: post.totalSocialActivityCounts?.numShares,
        },
      })) || []
    )
  } catch (error) {
    console.error("LinkedIn fetch error:", error)
    return []
  }
}

// Fetch posts from YouTube
async function fetchYouTubePosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch YouTube videos")
    }

    return (
      data.items?.map((video: any) => ({
        id: video.id.videoId,
        platform: "youtube",
        content: video.snippet.title + "\n" + video.snippet.description,
        media_url: video.snippet.thumbnails?.high?.url,
        posted_at: new Date(video.snippet.publishedAt),
        engagement: {
          views: 0, // Would need additional API call to get view count
        },
      })) || []
    )
  } catch (error) {
    console.error("YouTube fetch error:", error)
    return []
  }
}

// Fetch posts from TikTok
async function fetchTikTokPosts(accessToken: string): Promise<SocialPost[]> {
  try {
    const response = await fetch(
      "https://open-api.tiktok.com/video/list/?fields=id,title,create_time,cover_image_url,view_count,like_count,comment_count,share_count",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch TikTok videos")
    }

    return (
      data.data?.videos?.map((video: any) => ({
        id: video.id,
        platform: "tiktok",
        content: video.title,
        media_url: video.cover_image_url,
        posted_at: new Date(video.create_time * 1000),
        engagement: {
          likes: video.like_count,
          comments: video.comment_count,
          shares: video.share_count,
          views: video.view_count,
        },
      })) || []
    )
  } catch (error) {
    console.error("TikTok fetch error:", error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform")
    const refresh = searchParams.get("refresh") === "true"

    const userId = 1 // TODO: Get actual user ID from session

    // Get user's connected accounts
    const userAccounts = await DatabaseService.getUserSocialAccounts(userId)

    if (userAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        message: "No connected accounts found",
      })
    }

    const allPosts: SocialPost[] = []

    // Filter accounts by platform if specified
    const accountsToFetch = platform ? userAccounts.filter((acc) => acc.platform === platform) : userAccounts

    for (const account of accountsToFetch) {
      try {
        // Check if token is expired
        if (isTokenExpired(account.token_expires_at)) {
          console.warn(`Token expired for ${account.platform}`)
          continue
        }

        const accessToken = decryptToken(account.access_token)
        let posts: SocialPost[] = []

        // Fetch posts from each platform
        switch (account.platform) {
          case "instagram":
            posts = await fetchInstagramPosts(accessToken)
            break
          case "twitter":
            posts = await fetchTwitterPosts(accessToken)
            break
          case "facebook":
            posts = await fetchFacebookPosts(accessToken)
            break
          case "linkedin":
            posts = await fetchLinkedInPosts(accessToken)
            break
          case "youtube":
            posts = await fetchYouTubePosts(accessToken)
            break
          case "tiktok":
            posts = await fetchTikTokPosts(accessToken)
            break
          default:
            console.warn(`Unsupported platform: ${account.platform}`)
            continue
        }

        // Cache posts in database
        for (const post of posts) {
          await DatabaseService.cacheSocialFeedItem({
            user_id: userId,
            platform: post.platform,
            platform_post_id: post.id,
            content: post.content,
            media_url: post.media_url,
            posted_at: post.posted_at,
            engagement_data: post.engagement,
          })
        }

        allPosts.push(...posts)
      } catch (error) {
        console.error(`Error fetching posts from ${account.platform}:`, error)
      }
    }

    // If not refreshing, also get cached posts
    if (!refresh) {
      const cachedPosts = await DatabaseService.getSocialFeed(userId, platform || undefined)

      // Convert cached posts to SocialPost format
      const cachedSocialPosts: SocialPost[] = cachedPosts.map((cached) => ({
        id: cached.platform_post_id,
        platform: cached.platform,
        content: cached.content,
        media_url: cached.media_url,
        posted_at: cached.posted_at || cached.cached_at,
        engagement: cached.engagement_data || {},
      }))

      // Merge with fresh posts (remove duplicates)
      const postMap = new Map()

      // Add fresh posts first (they take priority)
      allPosts.forEach((post) => {
        postMap.set(`${post.platform}_${post.id}`, post)
      })

      // Add cached posts if not already present
      cachedSocialPosts.forEach((post) => {
        const key = `${post.platform}_${post.id}`
        if (!postMap.has(key)) {
          postMap.set(key, post)
        }
      })

      const mergedPosts = Array.from(postMap.values())

      // Sort by posted date (newest first)
      mergedPosts.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())

      return NextResponse.json({
        success: true,
        posts: mergedPosts.slice(0, 50), // Limit to 50 posts
        cached: !refresh,
        platforms: accountsToFetch.map((acc) => acc.platform),
      })
    }

    // Sort fresh posts by date
    allPosts.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())

    return NextResponse.json({
      success: true,
      posts: allPosts.slice(0, 50),
      cached: false,
      platforms: accountsToFetch.map((acc) => acc.platform),
    })
  } catch (error) {
    console.error("Social feed error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch social feed",
      },
      { status: 500 },
    )
  }
}
