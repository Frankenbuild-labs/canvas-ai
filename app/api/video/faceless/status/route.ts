export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
import { NextRequest, NextResponse } from "next/server"
import { jobs } from "@/lib/video-jobs"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Job ID is required" }, { status: 400 })
    }

    const job = jobs.get(jobId)

    if (!job) {
      // Return a valid response instead of 404 to prevent spamming
      return NextResponse.json({
        success: false,
        jobId,
        status: "not_found",
        error: "Job not found or expired",
      }, { status: 200 }) // Return 200 to stop retries
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: job.status,
      progress: job.progress,
      videoUrl: job.videoUrl,
      error: job.error,
    })
  } catch (error) {
    console.error("Error fetching job status:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch job status" }, { status: 500 })
  }
}
