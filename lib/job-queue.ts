// Job queue system for scheduled social media posts
import { DatabaseService, type ScheduledPost } from "./database"
import { decryptToken, isTokenExpired } from "./auth-utils"
import { Queue } from "bullmq"
import IORedis from "ioredis"
import { postViaComposio } from "@/lib/connections/broker"

export interface PostJob {
  id: string
  scheduledPostId: string
  userId: string
  platforms: string[]
  content: string
  mediaUrls?: string[]
  scheduleTime: Date
  retryCount: number
  maxRetries: number
}

export class JobQueue {
  private static instance: JobQueue
  private jobs: Map<string, PostJob> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue()
    }
    return JobQueue.instance
  }

  // Schedule a post job
  async schedulePost(scheduledPost: ScheduledPost): Promise<string> {
    const jobId = `post_${scheduledPost.id}_${Date.now()}`

    const job: PostJob = {
      id: jobId,
      scheduledPostId: scheduledPost.id,
      userId: scheduledPost.user_id,
      platforms: scheduledPost.platforms,
      content: scheduledPost.content,
      mediaUrls: scheduledPost.media_urls,
      scheduleTime: scheduledPost.scheduled_for,
      retryCount: 0,
      maxRetries: 3,
    }

    this.jobs.set(jobId, job)

    // Calculate delay until scheduled time
    const delay = scheduledPost.scheduled_for.getTime() - Date.now()

    // If REDIS_URL is present, enqueue into BullMQ instead of in-process timers
    try {
      if (process.env.REDIS_URL) {
        const connection = new IORedis(process.env.REDIS_URL)
        const queue = new Queue("social-posts", { connection })
        await queue.add("post", job, { delay: Math.max(0, delay) })
        console.log(`[JobQueue] Enqueued job ${jobId} in BullMQ (delay=${delay}ms)`) 
        return jobId
      }
    } catch (e) {
      console.warn("JobQueue: failed to enqueue to BullMQ, falling back to in-process scheduler", e)
    }

    if (delay <= 0) {
      // Execute immediately if scheduled time has passed
      this.executeJob(jobId)
    } else {
      // Schedule for future execution
      const timer = setTimeout(() => {
        this.executeJob(jobId)
      }, delay)

      this.timers.set(jobId, timer)
    }

    console.log(`[JobQueue] Scheduled post job ${jobId} for ${scheduledPost.scheduled_for}`)
    return jobId
  }

  // Execute a scheduled post job
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {
      console.error(`[JobQueue] Job ${jobId} not found`)
      return
    }

    console.log(`[JobQueue] Executing job ${jobId}`)

    try {
      await JobQueue.processPostJob(job)
    } finally {
      // Clean up
      this.jobs.delete(jobId)
      const timer = this.timers.get(jobId)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(jobId)
      }
    }
  }

  // Retry a failed job
  private async retryJob(job: PostJob): Promise<void> {
    job.retryCount++

    // Exponential backoff: 1min, 5min, 15min
    const retryDelay = Math.pow(5, job.retryCount) * 60 * 1000

    console.log(
      `[JobQueue] Retrying job ${job.id} in ${retryDelay / 1000}s (attempt ${job.retryCount}/${job.maxRetries})`,
    )

    const timer = setTimeout(() => {
      this.executeJob(job.id)
    }, retryDelay)

    this.timers.set(job.id, timer)
  }

  // A static helper that can be used by external workers (BullMQ) to process jobs.
  static async processPostJob(job: PostJob): Promise<void> {
    console.log(`[JobQueue] processPostJob ${job.id}`)

    try {
      // Update status to posting
      await DatabaseService.updateScheduledPostStatus(job.scheduledPostId, "posting")

      // Get user's connected accounts
      const userAccounts = await DatabaseService.getUserSocialAccounts(job.userId)
      const accountMap = new Map(userAccounts.map((acc) => [acc.platform, acc]))

      const results: any[] = []

      for (const platform of job.platforms) {
        try {
          const account = accountMap.get(platform)
          if (!account) {
            results.push({ platform, success: false, error: `${platform} account not connected` })
            continue
          }

          if (isTokenExpired(account.token_expires_at)) {
            results.push({ platform, success: false, error: `${platform} token expired` })
            continue
          }

          // If mirrored from Composio, use broker; otherwise, use legacy direct flow
          let result: any = { id: null }
          if (account.access_token === "composio") {
            const brokerRes = await postViaComposio({
              userId: job.userId,
              platform,
              content: job.content,
              mediaUrl: job.mediaUrls?.[0],
            })
            if (!brokerRes.success) throw new Error(brokerRes.error || "Composio post failed")
            result = brokerRes.data || {}
          } else {
            const accessToken = decryptToken(account.access_token)
            switch (platform) {
              case "twitter":
                result = await fetch("https://api.twitter.com/2/tweets", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ text: job.content }),
                }).then((r) => r.json())
                break
              default:
                throw new Error(`Unsupported or unimplemented platform: ${platform}`)
            }
          }

          // Save successful post result
          const platformPostId = extractPlatformPostId(platform, result) || result.id || result.data?.id || null
          await DatabaseService.savePostResult({
            scheduled_post_id: job.scheduledPostId,
            platform,
            platform_post_id: platformPostId || undefined,
            status: "success",
            posted_at: new Date(),
          })

          // Cache into social_feeds so the right-panel shows immediately after scheduled publish
          try {
            await DatabaseService.cacheSocialFeedItem({
              user_id: job.userId,
              platform,
              platform_post_id: platformPostId || `local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
              content: job.content,
              media_urls: job.mediaUrls ?? [],
              posted_at: new Date(),
              engagement_data: {},
            })
          } catch (e) {
            console.warn(`[JobQueue] Failed to cache feed item for ${platform}:`, e)
          }

          results.push({ platform, success: true, data: result })
        } catch (error) {
          await DatabaseService.savePostResult({
            scheduled_post_id: job.scheduledPostId,
            platform,
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            posted_at: new Date(),
          })

          results.push({ platform, success: false, error: error instanceof Error ? error.message : "Unknown error" })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const totalCount = results.length

      if (successCount === totalCount) {
        await DatabaseService.updateScheduledPostStatus(job.scheduledPostId, "posted")
        console.log(`[JobQueue] Job ${job.id} completed successfully`)
      } else if (successCount > 0) {
        await DatabaseService.updateScheduledPostStatus(
          job.scheduledPostId,
          "posted",
          `Posted to ${successCount}/${totalCount} platforms`,
        )
        console.log(`[JobQueue] Job ${job.id} partially completed (${successCount}/${totalCount})`)
      } else {
        await DatabaseService.updateScheduledPostStatus(job.scheduledPostId, "failed", "All platforms failed")
        console.error(`[JobQueue] Job ${job.id} failed for all platforms`)
      }
    } catch (error) {
      console.error(`[JobQueue] processPostJob error for ${job.id}:`, error)
      await DatabaseService.updateScheduledPostStatus(
        job.scheduledPostId,
        "failed",
        error instanceof Error ? error.message : "Unknown error",
      )
    }
  }

  // Cancel a scheduled job
  cancelJob(jobId: string): boolean {
    const timer = this.timers.get(jobId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(jobId)
    }

    const job = this.jobs.get(jobId)
    if (job) {
      this.jobs.delete(jobId)
      console.log(`[JobQueue] Cancelled job ${jobId}`)
      return true
    }

    return false
  }

  // Get job status
  getJobStatus(jobId: string): PostJob | null {
    return this.jobs.get(jobId) || null
  }

  // Initialize job queue on startup
  async initialize(): Promise<void> {
    console.log("[JobQueue] Initializing job queue...")
    // Load pending scheduled posts from database across all users
    const pendingPosts = await DatabaseService.getAllScheduledPosts("scheduled")

    for (const post of pendingPosts) {
      try {
        // If scheduled time is in the future, schedule it. If it's in the past, execute immediately.
        if (new Date(post.scheduled_for) > new Date()) {
          await this.schedulePost(post)
        } else {
          // Execute immediately for missed schedules
          await this.schedulePost(post)
        }
      } catch (e) {
        console.error(`[JobQueue] Failed to schedule post ${post.id}:`, e)
      }
    }

    console.log(`[JobQueue] Loaded ${pendingPosts.length} pending posts`)
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance()

// Extracts a platform post id from various response shapes (used by JobQueue)
function extractPlatformPostId(platform: string, data: any): string | null {
  if (!data) return null
  const p = platform.toLowerCase()
  const candidates: any[] = [data, data?.data, data?.result, data?.post, data?.item, data?.tweet, data?.video].filter(Boolean)
  for (const obj of candidates) {
    try {
      if (typeof obj?.id === "string") return obj.id
      for (const key of Object.keys(obj)) {
        if (/(_id|post_id|tweet_id|video_id|status_id)$/i.test(key) && typeof (obj as any)[key] === "string") {
          return (obj as any)[key]
        }
      }
    } catch {}
  }
  // Platform-specific fallbacks
  try {
    if (p === "twitter" && typeof data?.data?.id === "string") return data.data.id
    if ((p === "facebook" || p === "instagram") && typeof data?.post_id === "string") return data.post_id
    if (p === "linkedin" && typeof data?.data?.id === "string") return data.data.id
    if ((p === "youtube" || p === "tiktok") && typeof data?.video_id === "string") return data.video_id
  } catch {}
  return null
}
