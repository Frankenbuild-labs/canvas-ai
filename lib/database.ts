// Database connection and query utilities (Neon or Local Postgres)
import { randomUUID } from "crypto"
import { neon } from "@neondatabase/serverless"
import { Client as PgClient, Pool as PgPool, Pool, PoolConfig } from "pg"

type SQLFn = {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>
  (text: string, params?: any[]): Promise<any[]>
}

function makeLocalSql(connectionString: string): SQLFn {
  // Use a singleton Pool for stability and keep-alives
  let pool: PgPool | null = null
  function toPoolConfig(cs: string): PoolConfig {
    const url = new URL(cs)
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    const cfg: PoolConfig = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
      keepAlive: true,
      keepAliveInitialDelayMillis: 1000,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "canvasai-app",
      max: 10,
    }
    if (!isLocal) {
      cfg.ssl = { rejectUnauthorized: false, servername: url.hostname }
    }
    return cfg
  }
  function getPool() {
    if (!pool) {
      const cfg = toPoolConfig(connectionString)
      pool = new PgPool(cfg)
      // Surface pool errors to help diagnose
      pool.on('error', (err) => {
        console.error('[PG POOL ERROR]', err)
      })
    }
    return pool
  }
  function fromTemplate(strings: TemplateStringsArray, values: any[]) {
    let text = ""
    const params: any[] = []
    strings.forEach((part, i) => {
      text += part
      if (i < values.length) {
        params.push(values[i])
        text += `$${params.length}`
      }
    })
    return { text, params }
  }
  function isTemplateStringsArray(x: any): x is TemplateStringsArray {
    return Array.isArray(x) && ("raw" in x)
  }

  const fn: any = async (first: any, ...rest: any[]) => {
    const pool = getPool()
    if (isTemplateStringsArray(first)) {
      // Template literal call
      const { text, params } = fromTemplate(first, rest)
      const res = await pool.query(text, params)
      return res.rows as any[]
    }
    // Function call style: (text, params?)
    const text: string = first
    const params: any[] = Array.isArray(rest?.[0]) ? rest[0] : []
    const res = await pool.query(text, params)
    return res.rows as any[]
  }
  return fn as SQLFn
}

function makeSql(): SQLFn {
  // Choose a real Postgres connection string only. Do NOT use REST URLs like SUPABASE_URL.
  // Prioritize DATABASE_URL for local development
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.SUPABASE_DATABASE_URL,
  ].filter(Boolean) as string[]

  const cs = candidates.find((v) => /^postgresql?:\/\//i.test(v))
  if (!cs) {
    const envDump = {
      SUPABASE_DATABASE_URL: !!process.env.SUPABASE_DATABASE_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      SUPABASE_URL: process.env.SUPABASE_URL, // for debugging only
    }
    console.error("No valid Postgres connection string found. Set DATABASE_URL or SUPABASE_DATABASE_URL.", envDump)
    throw new Error("Missing Postgres connection string (expected postgres://...) in env")
  }

  const url = new URL(cs)
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  const isNeon = /neon\.tech$/i.test(url.hostname)

  if (!isLocal && isNeon) {
    const neonSql = neon(cs) as any
    return neonSql as SQLFn
  }
  return makeLocalSql(cs)
}

const sql: SQLFn = makeSql()

export interface UserSocialAccount {
  id: string
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
  // Identity mapping: device_id -> composio_user_id
  static async getOrCreateComposioUserIdForDevice(deviceId: string): Promise<string> {
    // Simplified: avoid hitting non-existent tables in dev. Generate a stable deterministic id per device.
    const base = deviceId && deviceId.trim().length > 0 ? deviceId.trim() : 'default'
    // Hash-ish suffix for variability without DB lookups
    const suffix = base === 'default' ? '' : '-' + Buffer.from(base).toString('hex').slice(0, 8)
    return `dev-user-${base}${suffix}`
  }

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
    // Prisma's String @id @default(cuid()) is generated client-side when using the Prisma Client.
    // Because we are executing raw SQL, we must generate an id ourselves or the insert will fail
    // with a NOT NULL violation on the id column.
    const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    console.log('[db.saveSocialAccount] upsert', { user_id: account.user_id, platform: account.platform, platform_user_id: account.platform_user_id })
    const result = await sql(
      `INSERT INTO social_accounts (id, user_id, platform, platform_user_id, username, access_token, refresh_token, token_expires_at, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (platform, platform_user_id) 
       DO UPDATE SET 
         user_id = EXCLUDED.user_id,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         username = EXCLUDED.username,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
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
    const row = result[0]
    console.log('[db.saveSocialAccount] result', { id: row?.id, user_id: row?.user_id, platform: row?.platform })
    return row
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
      // Silently degrade in dev when table is missing
      return []
    }
  }

  // Get scheduled posts across all users (optionally filtered by status)
  static async getAllScheduledPosts(status?: string): Promise<ScheduledPost[]> {
    try {
      const result = status
        ? await sql("SELECT * FROM scheduled_posts WHERE status = $1 ORDER BY scheduled_for ASC", [status])
        : await sql("SELECT * FROM scheduled_posts ORDER BY scheduled_for ASC")

      return result
    } catch (error) {
      console.error("Database error getting all scheduled posts:", error)
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
    try {
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
          item.media_urls ?? [],
          item.posted_at,
          item.engagement_data,
        ],
      )
    } catch (err) {
      console.warn("cacheSocialFeedItem failed (table missing or query error)", {
        err,
        platform: item.platform,
        platform_post_id: item.platform_post_id,
      })
      // swallow errors to avoid propagating and causing 500s
    }
  }

  static async getSocialFeed(userId: string, platform?: string): Promise<SocialFeedItem[]> {
    try {
      const result = platform
        ? await sql(
            "SELECT * FROM social_feeds WHERE user_id = $1 AND platform = $2 ORDER BY posted_at DESC LIMIT 50",
            [userId, platform],
          )
        : await sql("SELECT * FROM social_feeds WHERE user_id = $1 ORDER BY posted_at DESC LIMIT 50", [userId])
      return result
    } catch (err) {
      console.warn("getSocialFeed failed (table missing or query error)", { err, userId, platform })
      return []
    }
  }

  static async getOrCreateTestUser(): Promise<string> {
    // Directly return configured fallback id; skip all DB writes to missing tables in dev.
    return process.env.DEV_DEFAULT_USER_ID || '11111111-1111-1111-1111-111111111111'
  }

  // Create or return a user by email in the User table
  static async getOrCreateUserByEmail(email: string): Promise<string> {
    if (!email) {
      return DatabaseService.getOrCreateTestUser()
    }
    try {
      return await DatabaseService.upsertUsersTableUser({ email })
    } catch (primaryError) {
      console.warn("getOrCreateUserByEmail users table path failed; trying legacy fallback", primaryError)
      try {
        return await DatabaseService.upsertLegacyUser({ email })
      } catch (legacyError) {
        console.warn("Legacy fallback failed; using dev test user", legacyError)
        return DatabaseService.getOrCreateTestUser()
      }
    }
  }

  private static async upsertUsersTableUser(opts: {
    id?: string
    email: string
    name?: string
  }): Promise<string> {
    const userId = opts.id ?? randomUUID()
    const existing = await sql('SELECT id FROM users WHERE email = $1 LIMIT 1', [opts.email])
    if (existing?.[0]?.id) {
      return existing[0].id
    }
    const rows = await sql(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name)
       RETURNING id`,
      [userId, opts.email, opts.name ?? null],
    )
    return rows?.[0]?.id ?? userId
  }

  private static async upsertLegacyUser(opts: { id?: string; email: string; password?: string }): Promise<string> {
    const existing = await sql('SELECT id FROM "User" WHERE email = $1 LIMIT 1', [opts.email])
    if (existing?.[0]?.id) {
      return existing[0].id
    }
    const userId = opts.id ?? opts.email ?? randomUUID()
    const rows = await sql(
      'INSERT INTO "User" (id, email, password) VALUES ($1, $2, $3) RETURNING id',
      [userId, opts.email, opts.password ?? null],
    )
    return rows?.[0]?.id ?? userId
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

  // Social Connections registry
  static async upsertSocialConnection(rec: {
    user_id: string
    provider: string
    toolkit_slug?: string | null
    platform?: string | null
    connection_id?: string | null
    status?: string | null
    scopes?: string[] | null
    expires_at?: Date | null
  }): Promise<void> {
    await sql(
      `INSERT INTO social_connections (user_id, provider, toolkit_slug, platform, connection_id, status, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (provider, connection_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         toolkit_slug = EXCLUDED.toolkit_slug,
         platform = EXCLUDED.platform,
         status = EXCLUDED.status,
         scopes = EXCLUDED.scopes,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        rec.user_id,
        rec.provider,
        rec.toolkit_slug ?? null,
        rec.platform ?? null,
        rec.connection_id ?? null,
        rec.status ?? null,
        rec.scopes ?? [],
        rec.expires_at ?? null,
      ]
    )
  }

  static async listSocialConnections(userId: string, provider?: string): Promise<any[]> {
    return provider
      ? await sql("SELECT * FROM social_connections WHERE user_id = $1 AND provider = $2 ORDER BY created_at DESC", [
          userId,
          provider,
        ])
      : await sql("SELECT * FROM social_connections WHERE user_id = $1 ORDER BY created_at DESC", [userId])
  }
}

export default sql
