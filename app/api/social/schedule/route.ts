import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { jobQueue } from "@/lib/job-queue"
import { getUserIdFromRequest } from "@/lib/auth-next"
// Ayrshare removed. Scheduling now only persists internal job for twitter; other platforms pending.

export async function POST(request: NextRequest) {
  try {
    const { platforms, content, mediaUrl, scheduleTime } = await request.json()

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: "No platforms specified" }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (!scheduleTime) {
      return NextResponse.json({ error: "Schedule time is required" }, { status: 400 })
    }

    const scheduleDate = new Date(scheduleTime)

    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 })
    }

    if (scheduleDate <= new Date()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 })
    }

  // Resolve user from session/cookies/headers (falls back to test user)
  const userId = await getUserIdFromRequest(request as any)

    // Persist scheduled post (internal scheduler only; direct twitter publish when time triggers)
    const scheduledPost = await DatabaseService.createScheduledPost({
      user_id: userId,
      content,
      media_url: mediaUrl,
      platforms,
      schedule_time: scheduleDate,
      status: "scheduled",
      provider: "internal",
    })

    // Enqueue job in the in-process job queue (will schedule execution)
    try {
      await jobQueue.schedulePost(scheduledPost)
    } catch (e) {
      console.warn("Failed to schedule job in jobQueue:", e)
    }

    return NextResponse.json({
      success: true,
      scheduledPost,
      message: `Post scheduled for ${scheduleDate.toLocaleString()}`,
    })
  } catch (error) {
    console.error("Schedule error:", error)
    return NextResponse.json(
      {
        error: "Failed to schedule post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
  // Resolve user from session/cookies/headers (falls back to test user)
  const userId = await getUserIdFromRequest(request as any)

    // Gracefully handle missing table in dev: return empty without DB call
    const posts = await DatabaseService.getScheduledPosts(userId)
    return NextResponse.json({ success: true, posts })
  } catch (error) {
    console.error("Get scheduled posts error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get scheduled posts",
        details: error instanceof Error ? error.message : "Unknown error",
        posts: [],
      },
      { status: 500 },
    )
  }
}
