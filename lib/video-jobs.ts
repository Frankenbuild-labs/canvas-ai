// Shared in-memory job storage
// In production, use Redis or a database

export type JobStatus = "queued" | "generating" | "complete" | "failed"

export interface Job {
  status: JobStatus
  progress: number
  videoUrl?: string
  error?: string
  createdAt: Date
}

// Global jobs map
export const jobs = new Map<string, Job>()

// Cleanup old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  for (const [jobId, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(jobId)
    }
  }
}, 5 * 60 * 1000) // Run every 5 minutes
