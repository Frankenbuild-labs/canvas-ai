// Initialize job queue on server startup
import { type NextRequest, NextResponse } from "next/server"
import { jobQueue } from "@/lib/job-queue"

export async function POST(request: NextRequest) {
  try {
    await jobQueue.initialize()

    return NextResponse.json({
      success: true,
      message: "Job queue initialized successfully",
    })
  } catch (error) {
    console.error("Job queue initialization error:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize job queue",
      },
      { status: 500 },
    )
  }
}
