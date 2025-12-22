// Server-only bootstrap entry injected via next.config.mjs
// Starts the embedded lead-gen worker when ENABLE_LEADGEN_WORKER=1
import { startEmbeddedLeadgenWorker } from './embedded-worker'

try {
  startEmbeddedLeadgenWorker()
} catch (e) {
  console.error('[leadgen-worker-bootstrap] failed to start embedded worker', e)
}
