import { type NextRequest, NextResponse } from "next/server"

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

    if (scheduleDate <= new Date()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 })
    }

    // Return mock success response
    return NextResponse.json({
      success: true,
      scheduledPost: {
        id: `mock-${Date.now()}`,
        scheduleTime: scheduleDate,
        platforms,
        content,
        status: "pending",
      },
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
    // Return mock scheduled posts data
    const mockPosts = [
      {
        id: "mock-1",
        user_id: "test-user",
        content: "Sample scheduled post for Instagram",
        media_urls: [],
        platforms: ["instagram"],
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "mock-2",
        user_id: "test-user",
        content: "Another post for Twitter and LinkedIn",
        media_urls: [],
        platforms: ["twitter", "linkedin"],
        scheduled_for: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    return NextResponse.json({
      success: true,
      posts: mockPosts,
    })
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
