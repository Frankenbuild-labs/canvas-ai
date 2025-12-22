// Mapping between Social Station platform ids and Composio toolkit slugs
// NOTE: Validate these slugs against your Composio dashboard and update as needed.

export const SOCIAL_TO_COMPOSIO_TOOLKIT: Record<string, string> = {
  instagram: "instagram",
  twitter: "twitter", // Some orgs use 'x' as the toolkit slug
  tiktok: "tiktok",
  facebook: "facebook",
  linkedin: "linkedin",
  youtube: "youtube",
}

export function toPlatformFromToolkit(toolkitSlug?: string | null): string | null {
  if (!toolkitSlug) return null
  const normalized = toolkitSlug.toLowerCase()
  if (normalized === "x") return "twitter"
  const entry = Object.entries(SOCIAL_TO_COMPOSIO_TOOLKIT).find(([, slug]) => slug.toLowerCase() === normalized)
  return entry ? entry[0] : null
}
