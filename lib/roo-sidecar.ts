// Utilities for future Roo / Agent Maestro integration.
// Intentionally lean until real task + session binding is implemented.

export const ROO_SIDECAR_BASE = (process.env.ROO_SIDECAR_URL || "").replace(/\/$/, "")

export function isSidecarConfigured(): boolean {
  return !!ROO_SIDECAR_BASE
}

export const ROO_EXTENSION_ID = "rooveterinaryinc.roo-cline"
