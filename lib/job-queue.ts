// Job queue system for scheduled social media posts
import { DatabaseService, type ScheduledPost } from "./database"
import { decryptToken, isTokenExpired } from "./auth-utils"

export interface PostJob {
  id: string
  scheduledPostId: number
  userId: number
  platforms: string[]
  content: string
  mediaUrl?: string
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
      mediaUrl: scheduledPost.media_url,
      scheduleTime: scheduledPost.schedule_time,
      retryCount: 0,
      maxRetries: 3,
    }

    this.jobs.set(jobId, job)

    // Calculate delay until scheduled time
    const delay = scheduledPost.schedule_time.getTime() - Date.now()

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

    console.log(`[JobQueue] Scheduled post job ${jobId} for ${scheduledPost.schedule_time}`)
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
      // Update status to posting
      await DatabaseService.updateScheduledPostStatus(job.scheduledPostId, "posting")

      // Get user's connected accounts
      const userAccounts = await DatabaseService.getUserSocialAccounts(job.userId)
      const accountMap = new Map(userAccounts.map((acc) => [acc.platform, acc]))

      const results = []

      for (const platform of job.platforms) {
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
              error: `${platform} token expired`,
            })
            continue
          }

          const accessToken = decryptToken(account.access_token)
          const result = await this.postToPlatform(platform, job.content, job.mediaUrl, accessToken)

          // Save successful post result
          await DatabaseService.savePostResult({
            scheduled_post_id: job.scheduledPostId,
            platform,
            platform_post_id: result.id || result.data?.id,
            status: "success",
            posted_at: new Date(),
          })

          results.push({
            platform,
            success: true,
            data: result,
          })
        } catch (error) {
          // Save failed post result
          await DatabaseService.savePostResult({
            scheduled_post_id: job.scheduledPostId,
            platform,
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            posted_at: new Date(),
          })

          results.push({
            platform,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const totalCount = results.length

      if (successCount === totalCount) {
        // All platforms succeeded
        await DatabaseService.updateScheduledPostStatus(job.scheduledPostId, "posted")
        console.log(`[JobQueue] Job ${jobId} completed successfully`)
      } else if (successCount > 0) {
        // Partial success
        await DatabaseService.updateScheduledPostStatus(
          job.scheduledPostId,
          "posted",
          `Posted to ${successCount}/${totalCount} platforms`,
        )
        console.log(`[JobQueue] Job ${jobId} partially completed (${successCount}/${totalCount})`)
      } else {
        // All failed - retry if possible
        if (job.retryCount < job.maxRetries) {
          await this.retryJob(job)
          return
        } else {
          await DatabaseService.updateScheduledPostStatus(
            job.scheduledPostId,
            "failed",
            "All platforms failed after retries",
          )
          console.error(`[JobQueue] Job ${jobId} failed after ${job.maxRetries} retries`)
        }
      }
    } catch (error) {
      console.error(`[JobQueue] Error executing job ${jobId}:`, error)

      if (job.retryCount < job.maxRetries) {
        await this.retryJob(job)
      } else {
        await DatabaseService.updateScheduledPostStatus(
          job.scheduledPostId,
          "failed",
          error instanceof Error ? error.message : "Unknown error",
        )
      }
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

  // Post to specific platform
  private async postToPlatform(
    platform: string,
    content: string,
    mediaUrl?: string,
    accessToken?: string,
  ): Promise<any> {
    switch (platform) {
      case "instagram":
        throw new Error("Instagram posting requires Business API setup")

      case "twitter":
        const twitterResponse = await fetch("https://api.twitter.com/2/tweets", {
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
        return twitterResponse.json()

      case "facebook":
        const facebookResponse = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
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
        return facebookResponse.json()

      case "linkedin":
        const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            author: "urn:li:person:PERSON_ID",
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: content },
                shareMediaCategory: "NONE",
              },
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
          }),
        })
        return linkedinResponse.json()

      case "tiktok":
        const tiktokResponse = await fetch("https://open-api.tiktok.com/share/video/upload/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: mediaUrl,
            text: content,
            privacy_level: "SELF_ONLY",
          }),
        })
        return tiktokResponse.json()

      case "youtube":
        const youtubeResponse = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,status", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              title: content.substring(0, 100),
              description: content,
              tags: [],
              categoryId: "22",
            },
            status: { privacyStatus: "private" },
          }),
        })
        return youtubeResponse.json()

      default:
        throw new Error(`Unsupported platform: ${platform}`)
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

    // Load pending scheduled posts from database
    const pendingPosts = await DatabaseService.getScheduledPosts(0, "scheduled") // Get all users' scheduled posts

    for (const post of pendingPosts) {
      if (post.schedule_time > new Date()) {
        await this.schedulePost(post)
      }
    }

    console.log(`[JobQueue] Loaded ${pendingPosts.length} pending posts`)
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance()
