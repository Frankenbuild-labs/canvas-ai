import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { jobs } from "@/lib/video-jobs"

const FACELESS_VIDEO_SERVICE_URL = process.env.FACELESS_VIDEO_SERVICE_URL || "http://localhost:8005"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      videoIdea,
      quickPace,
      outputLanguage,
      tone,
      videoScenes,
      videoTitle,
      scenes,
      voice,
      imageStyle,
    } = body

    // Validation
    if (!videoIdea || !videoIdea.trim()) {
      return NextResponse.json({ success: false, error: "Video idea is required" }, { status: 400 })
    }

    if (!videoTitle || !videoTitle.trim()) {
      return NextResponse.json({ success: false, error: "Video title is required" }, { status: 400 })
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ success: false, error: "At least one scene is required" }, { status: 400 })
    }

    // Generate unique job ID
    const jobId = uuidv4()

    // Initialize job status
    jobs.set(jobId, {
      status: "queued",
      progress: 0,
      createdAt: new Date(),
    })

    // Start background processing (non-blocking)
    processVideoGeneration(jobId, {
      videoIdea,
      quickPace,
      outputLanguage,
      tone,
      videoScenes,
      videoTitle,
      scenes,
      voice,
      imageStyle,
    }).catch((error) => {
      console.error(`Job ${jobId} failed:`, error)
      const job = jobs.get(jobId)
      if (job) {
        job.status = "failed"
        job.error = error.message || "Unknown error occurred"
      }
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: "Video generation started",
    })
  } catch (error) {
    console.error("Error starting video generation:", error)
    return NextResponse.json({ success: false, error: "Failed to start video generation" }, { status: 500 })
  }
}

async function processVideoGeneration(jobId: string, params: any) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    // Update status to generating
    job.status = "generating"
    job.progress = 10

    // Call the Python FastAPI service
  const response = await fetch(`${FACELESS_VIDEO_SERVICE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_type: "custom",
        image_style: params.imageStyle || "default",
        voice: params.voice || "radiant-girl",
        custom_topic: params.videoIdea,
        video_title: params.videoTitle,
        scenes: params.scenes.map((s: any) => s.text),
        output_language: params.outputLanguage || "English",
        tone: params.tone || "Neutral",
        num_scenes: params.videoScenes || 10,
        quick_pace: params.quickPace || false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`)
    }

  const data = await response.json()

    // Poll the Python service for completion
    const pythonJobId = data.job_id
    let attempts = 0
    const maxAttempts = 120 // 10 minutes max (5 second intervals)

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

      const statusResponse = await fetch(`${FACELESS_VIDEO_SERVICE_URL}/status/${pythonJobId}`)
      const statusData = await statusResponse.json()

      if (statusData.status === "complete") {
        job.status = "complete"
        job.progress = 100
        // Normalize to absolute URL
        const url: string | undefined = statusData.video_url
        job.videoUrl = url && url.startsWith("/")
          ? `${FACELESS_VIDEO_SERVICE_URL}${url}`
          : url
        break
      } else if (statusData.status === "failed") {
        throw new Error(statusData.error || "Video generation failed")
      } else {
        // Update progress
        job.progress = Math.min(90, 10 + (attempts / maxAttempts) * 80)
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error("Video generation timed out")
    }
  } catch (error: any) {
    console.error(`Job ${jobId} processing error:`, error)
    job.status = "failed"
    job.error = error.message || "Unknown error"
  }
}

