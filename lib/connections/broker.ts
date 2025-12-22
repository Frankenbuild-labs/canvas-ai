import { Composio } from "@composio/core"
import { VercelProvider } from "@composio/vercel"
import { DatabaseService } from "@/lib/database"
import { SOCIAL_TO_COMPOSIO_TOOLKIT } from "@/lib/connections/mappings"

export type BrokerPostInput = {
  userId: string
  platform: string
  content: string
  mediaUrl?: string
}

export type BrokerPostResult = {
  success: boolean
  platform: string
  data?: any
  error?: string
  note?: string
}

/**
 * Connection Broker: primary path via Composio, optional fallbacks handled by callers.
 * For now, we validate connection state and return a structured error if action execution
 * isn't wired yet for the target platform. Callers can decide to fallback to legacy flows.
 */
export async function postViaComposio(input: BrokerPostInput): Promise<BrokerPostResult> {
  const { userId, platform, content } = input

  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    return {
      success: false,
      platform,
      error: "COMPOSIO_API_KEY not configured",
    }
  }

  const toolkitSlug = SOCIAL_TO_COMPOSIO_TOOLKIT[platform?.toLowerCase?.() || ""]
  if (!toolkitSlug) {
    return {
      success: false,
      platform,
      error: `Unsupported platform mapping for Composio: ${platform}`,
    }
  }

  try {
    const composio = new Composio({ apiKey, provider: new VercelProvider() })

    // Ensure there's an ACTIVE connection for this user/toolkit
    const list = await composio.connectedAccounts.list({ userIds: [userId] })
    const items: any[] = Array.isArray(list?.items) ? list.items : []
    const active = items.find(
      (it) => String(it?.toolkit?.slug || "").toLowerCase() === toolkitSlug.toLowerCase() && it?.status === "ACTIVE",
    )

    if (!active) {
      return {
        success: false,
        platform,
        error: `No active ${platform} connection for user. Please connect via Social Station.`,
      }
    }

    // Map platform to plausible Composio action names and inputs
  const actionCandidates: string[] = getActionCandidates(platform)
  const paramVariants = buildParamVariants(platform, input)

    // Attempt via SDK: execute/run; then REST as a last attempt
    let lastErr: any = null
    for (const actionName of actionCandidates) {
      for (const params of paramVariants) {
        // SDK execute
        try {
          const anyComp: any = composio as any
          if (typeof anyComp?.actions?.execute === "function") {
            const result = await anyComp.actions.execute(actionName, userId, params)
            return { success: true, platform, data: result }
          }
        } catch (e: any) {
          lastErr = e
        }
        // SDK run
        try {
          const anyComp: any = composio as any
          if (typeof anyComp?.actions?.run === "function") {
            const result = await anyComp.actions.run({ action: actionName, userId, params })
            return { success: true, platform, data: result }
          }
        } catch (e: any) {
          lastErr = e
        }
        // REST (capture detailed error body for debugging)
        try {
          const resp = await fetch("https://backend.composio.dev/api/v3/actions/execute", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action_name: actionName, user_id: userId, params }),
          })
          if (resp.ok) {
            const data = await resp.json()
            return { success: true, platform, data }
          } else {
            let errorDetail = `REST execute failed (${resp.status})`
            try {
              const text = await resp.text()
              if (text) {
                errorDetail += `: ${text}`
              }
            } catch {
              // ignore body parsing issues, keep base message
            }
            lastErr = new Error(errorDetail)
          }
        } catch (e: any) {
          lastErr = e
        }
      }
    }

    return {
      success: false,
      platform,
      error: lastErr?.message || "Failed to execute Composio action",
    }
  } catch (e: any) {
    return {
      success: false,
      platform,
      error: e?.message || "Failed to post via Composio",
    }
  }
}

function getActionCandidates(platform: string): string[] {
  const p = platform.toLowerCase()
  switch (p) {
    case "twitter":
      // Use the actual Composio Twitter action slug that is known to work
      // from the Composio playground: TWITTER_CREATION_OF_A_POST
      return ["TWITTER_CREATION_OF_A_POST"]
    case "facebook":
      return ["FACEBOOK_CREATE_POST", "FACEBOOK_POST_FEED", "facebook_create_post"]
    case "linkedin":
      return ["LINKEDIN_CREATE_POST", "LINKEDIN_UGC_POST", "linkedin_create_post"]
    case "instagram":
      return ["INSTAGRAM_CREATE_POST", "instagram_create_post"]
    case "youtube":
      return ["YOUTUBE_UPLOAD_VIDEO", "youtube_upload_video"]
    case "tiktok":
      return ["TIKTOK_UPLOAD_VIDEO", "TIKTOK_CREATE_POST", "tiktok_upload_video", "tiktok_create_post"]
    default:
      return []
  }
}

function buildParamVariants(platform: string, input: BrokerPostInput) {
  const { content, mediaUrl } = input
  const p = platform.toLowerCase()
  const variants: any[] = []

  if (p === "twitter") {
    // Composio's TWITTER_CREATION_OF_A_POST expects at minimum { text }
    // Media support can be added later once we confirm the core text flow.
    variants.push({ text: content })
    return variants
  }
  if (p === "linkedin") {
    variants.push({ commentary: content, text: content, media_url: mediaUrl })
    return variants
  }
  if (p === "facebook") {
    variants.push({ message: content, text: content, link: mediaUrl })
    return variants
  }
  if (p === "tiktok") {
    // TikTok: prefer video_url if provided; some actions accept caption
    variants.push({ video_url: mediaUrl, caption: content, text: content })
    variants.push({ media_url: mediaUrl, text: content })
    return variants
  }

  // Default
  variants.push({ text: content, content, media_url: mediaUrl })
  return variants
}
