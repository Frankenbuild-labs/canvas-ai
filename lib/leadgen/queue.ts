import { Queue } from "bullmq"
import IORedis from "ioredis"
import { LeadStore } from "./store"
import { runProviders } from "./providers"

export interface LeadExtractionJobData { sessionId: string }

const QUEUE_NAME = "lead-extraction"

function getRedisUrl() {
  return process.env.REDIS_URL || process.env.REDIS || null
}

class LeadExtractionQueue {
  private queue: Queue | null = null
  constructor() {
    const redis = getRedisUrl()
    if (redis) {
      const connection = new IORedis(redis)
      this.queue = new Queue(QUEUE_NAME, { connection })
      console.log(`[LeadExtractionQueue] Initialized BullMQ queue '${QUEUE_NAME}'`)
    } else {
      console.log(`[LeadExtractionQueue] No REDIS_URL; using in-process execution`)
    }
  }

  async enqueue(sessionId: string) {
    if (this.queue) {
      await this.queue.add("extract", { sessionId }, { removeOnComplete: true, removeOnFail: false })
      console.log(`[LeadExtractionQueue] Enqueued session ${sessionId}`)
    } else {
      // Fallback immediate async execution
      console.log(`[LeadExtractionQueue] Executing in-process for session ${sessionId}`)
      queueMicrotask(async () => {
        try {
          console.log(`[LeadExtractionQueue] Starting extraction for ${sessionId}`)
          LeadStore.updateStatus(sessionId, "running")
          await runProviders(sessionId)
          LeadStore.updateStatus(sessionId, "completed")
          console.log(`[LeadExtractionQueue] Completed extraction for ${sessionId}`)
        } catch (e: any) {
          console.error(`[LeadExtractionQueue] Error in extraction for ${sessionId}:`, e.message, e.stack)
          LeadStore.updateStatus(sessionId, "error", e.message)
        }
      })
    }
  }
}

export const leadExtractionQueue = new LeadExtractionQueue()
