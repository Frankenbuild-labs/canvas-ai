// Minimal SignalWire Compatibility REST helpers (no SDK dependency).
// Uses central SaaS credentials so end-users never paste keys.
// Env required: SIGNALWIRE_SPACE_URL, SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN

export function getSignalWireEnv() {
  const rawSpace = process.env.SIGNALWIRE_SPACE_URL || ""
  // Normalize: remove protocol and trailing slashes so callers can safely prepend https:// or wss://
  const space = rawSpace.replace(/^https?:\/\//i, "").replace(/\/+$/g, "")
  const projectId = process.env.SIGNALWIRE_PROJECT_ID || ""
  const apiToken = process.env.SIGNALWIRE_API_TOKEN || ""
  return { space, projectId, apiToken }
}

export function isConfigured() {
  const { space, projectId, apiToken } = getSignalWireEnv()
  return Boolean(space && projectId && apiToken)
}

export function getCompatBase() {
  const { space, projectId } = getSignalWireEnv()
  if (!space || !projectId) return ""
  return `https://${space}/api/laml/2010-04-01/Accounts/${projectId}`
}

export function getAuthHeader() {
  const { projectId, apiToken } = getSignalWireEnv()
  const basic = Buffer.from(`${projectId}:${apiToken}`).toString("base64")
  return { Authorization: `Basic ${basic}` }
}

export function requireConfigured() {
  if (!isConfigured()) {
    throw new Error("SignalWire not configured. Set SIGNALWIRE_SPACE_URL, SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN.")
  }
}

// Optional: widget embed token (temporary approach)
export function getEmbedToken() {
  return process.env.SIGNALWIRE_EMBED_TOKEN || ""
}

// Optional: signing key for issuing short-lived scoped tokens (future)
export function getSigningKey() {
  return process.env.SIGNALWIRE_SIGNING_KEY || ""
}
