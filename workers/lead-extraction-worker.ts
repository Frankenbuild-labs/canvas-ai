/**
 * BullMQ worker for lead extraction sessions.
 * Run with: `node ./workers/lead-extraction-worker.ts`
 */
import { Worker, Job } from "bullmq"
import IORedis from "ioredis"
import { LeadStore } from "../lib/leadgen/store"
import { runProviders } from "../lib/leadgen/providers"
import { updateSessionStatus } from "../lib/leadgen/adapter"

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || "redis://127.0.0.1:6379"

const connection = new IORedis(REDIS_URL)

const worker = new Worker(
  "lead-extraction",
  async (job: Job) => {
    const { sessionId } = job.data as { sessionId: string }
    console.log(`[lead-extraction-worker] Processing session ${sessionId}`)
    try {
      LeadStore.updateStatus(sessionId, "running")
      await updateSessionStatus(sessionId, 'RUNNING')
      await runProviders(sessionId)
      LeadStore.updateStatus(sessionId, "completed")
      await updateSessionStatus(sessionId, 'COMPLETED')
      return { ok: true }
    } catch (e) {
      console.error("lead-extraction-worker: job failed", e)
      LeadStore.updateStatus(sessionId, "error")
      await updateSessionStatus(sessionId, 'ERROR')
      throw e
    }
  },
  { connection },
)

worker.on("completed", (j) => console.log(`[lead-extraction-worker] completed job ${j.id}`))
worker.on("failed", (j, err) => console.error(`[lead-extraction-worker] failed job ${j?.id}:`, err))

console.log("lead-extraction-worker started and listening on 'lead-extraction' queue")
