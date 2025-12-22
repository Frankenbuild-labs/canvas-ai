// This file is server-only. It lazily requires BullMQ so Next.js
// doesn’t try to bundle Node core modules into client output.
//
// IMPORTANT: Do not import this from React components or any code
// that can run in the browser. It should only be used from
// backend/bootstrap code (see worker-bootstrap).

import { LeadStore } from "./store"
import { runProviders } from "./providers"
import { updateSessionStatus } from "./adapter"

declare global {
  // Prevent duplicate worker startup in dev hot reload
  // eslint-disable-next-line no-var
  var __leadgen_worker_started: boolean | undefined
}

export function startEmbeddedLeadgenWorker() {
  if (typeof window !== "undefined") return
  if (global.__leadgen_worker_started) return
  if (!process.env.ENABLE_LEADGEN_WORKER) return

  // Lazy-require BullMQ + ioredis to keep them server-only
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq") as typeof import("bullmq")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IORedis = require("ioredis") as typeof import("ioredis")

  const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || "redis://127.0.0.1:6379"
  const connection = new IORedis(REDIS_URL)

  const worker = new Worker(
    "lead-extraction",
    async (job) => {
      const { sessionId } = job.data as { sessionId: string }
      console.log(`[embedded-leadgen-worker] Processing session ${sessionId}`)
      try {
        LeadStore.updateStatus(sessionId, "running")
        await updateSessionStatus(sessionId, "RUNNING")
        await runProviders(sessionId)
        LeadStore.updateStatus(sessionId, "completed")
        await updateSessionStatus(sessionId, "COMPLETED")
        return { ok: true }
      } catch (e) {
        console.error("embedded-leadgen-worker: job failed", e)
        LeadStore.updateStatus(sessionId, "error")
        await updateSessionStatus(sessionId, "ERROR")
        throw e
      }
    },
    { connection },
  )

  worker.on("completed", (j) => console.log(`[embedded-leadgen-worker] completed job ${j.id}`))
  worker.on("failed", (j, err) => console.error(`[embedded-leadgen-worker] failed job ${j?.id}:`, err))

  global.__leadgen_worker_started = true
  console.log("embedded-leadgen-worker started (ENABLE_LEADGEN_WORKER=1)")
}
