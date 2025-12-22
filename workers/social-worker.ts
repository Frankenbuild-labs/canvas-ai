/**
 * Lightweight BullMQ worker to process scheduled social post jobs.
 * Run this with: `node ./workers/social-worker.ts` (after installing deps and building)
 */
import { Worker } from "bullmq"
import IORedis from "ioredis"
import { Job } from "bullmq"
import { JobQueue } from "@/lib/job-queue"

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || "redis://127.0.0.1:6379"

const connection = new IORedis(REDIS_URL)

const worker = new Worker(
  "social-posts",
  async (job: Job) => {
    const data = job.data
    // Expected data is the PostJob shape
    console.log(`[social-worker] Processing job ${job.id}`)
    try {
      await JobQueue.processPostJob(data)
      return { ok: true }
    } catch (e) {
      console.error("social-worker: job failed", e)
      throw e
    }
  },
  { connection },
)

worker.on("completed", (j) => console.log(`[social-worker] completed job ${j.id}`))
worker.on("failed", (j, err) => console.error(`[social-worker] failed job ${j?.id}:`, err))

console.log("social-worker started and listening for jobs on 'social-posts' queue")
