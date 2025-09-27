// Database connection and query utilities
import { neon } from "@neondatabase/serverless"

// Create a serverless SQL client
const sql = neon(process.env.DATABASE_URL!)

export interface UserSocialAccount {
  id: number
  user_id: string
  platform: string
  platform_user_id?: string
  username?: string
  access_token: string
  refresh_token?: string
  token_expires_at?: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ScheduledPost {
  id: string
  user_id: string
  content: string
  media_urls: string[]
  platforms: string[]
  scheduled_for: Date
  status: "pending" | "posting" | "posted" | "failed"
  created_at: Date
  updated_at: Date
}

export interface PostResult {
  id: string
  scheduled_post_id: string
  platform: string
  platform_post_id?: string
  status: "success" | "failed"
  error_message?: string
  posted_at?: Date
  created_at: Date
}

export interface PostDraft {
  id: string
  user_id: string
  content: string
  media_url?: string
  media_type?: string
  platforms?: string[]
  created_at: Date
  updated_at: Date
}

export interface AIInfluencerSettings {
  id: string
  user_id: string
  name: string
  personality: string
  tone: string
  creativity_level: number
  post_frequency: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SocialFeedItem {
  id: string
  user_id: string
  platform: string
  platform_post_id: string
  content?: string
  media_urls?: string[]
  posted_at?: Date
  engagement_data?: any
  created_at: Date
}

// Database query functions
export class DatabaseService {
  // Social Accounts
  static async getUserSocialAccounts(userId: string): Promise<UserSocialAccount[]> {
    const result = await sql(
      "SELECT * FROM social_accounts WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
      [userId],
    )
    return result
  }

  static async saveSocialAccount(
    account: Omit<UserSocialAccount, "id" | "created_at" | "updated_at">,
  ): Promise<UserSocialAccount> {
    const result = await sql(
      `INSERT INTO social_accounts (user_id, platform, platform_user_id, username, access_token, refresh_token, token_expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, platform, platform_user_id) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         username = EXCLUDED.username,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        account.user_id,
        account.platform,
        account.platform_user_id,
        account.username,
        account.access_token,
        account.refresh_token,
        account.token_expires_at,
        account.is_active,
      ],
    )
    return result[0]
  }

  // Scheduled Posts
  static async createScheduledPost(post: {
    user_id: string
    content: string
    media_url?: string
    platforms: string[]
    schedule_time: Date
    status: string
  }): Promise<ScheduledPost> {
    try {
      const result = await sql(
        `INSERT INTO scheduled_posts (user_id, content, media_urls, platforms, scheduled_for, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          post.user_id,
          post.content,
          post.media_url ? [post.media_url] : [],
          post.platforms,
          post.schedule_time,
          post.status,
        ],
      )
      return result[0]
    } catch (error) {
      console.error("Database error creating scheduled post:", error)
      throw new Error("Failed to create scheduled post")
    }
  }

  static async getScheduledPosts(userId: string, status?: string): Promise<ScheduledPost[]> {
    try {
      const result = status
        ? await sql("SELECT * FROM scheduled_posts WHERE user_id = $1 AND status = $2 ORDER BY scheduled_for ASC", [
            userId,
            status,
          ])
        : await sql("SELECT * FROM scheduled_posts WHERE user_id = $1 ORDER BY scheduled_for ASC", [userId])

      return result
    } catch (error) {
      console.error("Database error getting scheduled posts:", error)
      // Return empty array instead of throwing to prevent API crashes
      return []
    }
  }

  static async updateScheduledPostStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await sql("UPDATE scheduled_posts SET status = $1, updated_at = NOW() WHERE id = $2", [status, id])
  }

  // Post Results
  static async savePostResult(result: Omit<PostResult, "id" | "created_at">): Promise<PostResult> {
    const queryResult = await sql(
      `INSERT INTO post_results (scheduled_post_id, platform, platform_post_id, status, error_message, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        result.scheduled_post_id,
        result.platform,
        result.platform_post_id,
        result.status,
        result.error_message,
        result.posted_at,
      ],
    )
    return queryResult[0]
  }

  // Social Feed Cache
  static async cacheSocialFeedItem(item: Omit<SocialFeedItem, "id" | "created_at">): Promise<void> {
    await sql(
      `INSERT INTO social_feeds (user_id, platform, platform_post_id, content, media_urls, posted_at, engagement_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (platform, platform_post_id)
       DO UPDATE SET 
         content = EXCLUDED.content,
         media_urls = EXCLUDED.media_urls,
         engagement_data = EXCLUDED.engagement_data,
         created_at = NOW()`,
      [
        item.user_id,
        item.platform,
        item.platform_post_id,
        item.content,
        item.media_url ? [item.media_url] : [],
        item.posted_at,
        item.engagement_data,
      ],
    )
  }

  static async getSocialFeed(userId: string, platform?: string): Promise<SocialFeedItem[]> {
    const result = platform
      ? await sql("SELECT * FROM social_feeds WHERE user_id = $1 AND platform = $2 ORDER BY posted_at DESC LIMIT 50", [
          userId,
          platform,
        ])
      : await sql("SELECT * FROM social_feeds WHERE user_id = $1 ORDER BY posted_at DESC LIMIT 50", [userId])

    return result
  }

  static async getOrCreateTestUser(): Promise<string> {
    try {
      const result = await sql('SELECT id FROM "User" WHERE email = $1', ["test@example.com"])

      if (result.length > 0) {
        return result[0].id
      }

      const newUser = await sql('INSERT INTO "User" (email, password) VALUES ($1, $2) RETURNING id', [
        "test@example.com",
        "test123",
      ])

      return newUser[0].id
    } catch (error) {
      console.error("Error getting test user:", error)
      throw new Error("Failed to get or create test user")
    }
  }

  // Add a method to test database connection
  static async testConnection(): Promise<boolean> {
    try {
      await sql("SELECT 1")
      return true
    } catch (error) {
      console.error("Database connection test failed:", error)
      return false
    }
  }
}

export default sql
