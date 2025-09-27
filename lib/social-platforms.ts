export interface SocialPlatform {
  id: string
  name: string
  displayName: string
  icon: string
  color: string
  authUrl: string
  tokenUrl: string
  scope: string
  apiBaseUrl: string
  features: {
    posts: boolean
    stories: boolean
    reels: boolean
    videos: boolean
    images: boolean
    scheduling: boolean
  }
  limits: {
    textLength: number
    imageSize: number
    videoSize: number
    videoDuration: number
  }
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  instagram: {
    id: "instagram",
    name: "instagram",
    displayName: "Instagram",
    icon: "📷",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "user_profile,user_media",
    apiBaseUrl: "https://graph.instagram.com",
    features: {
      posts: true,
      stories: true,
      reels: true,
      videos: true,
      images: true,
      scheduling: false, // Instagram Basic Display API doesn't support posting
    },
    limits: {
      textLength: 2200,
      imageSize: 8 * 1024 * 1024, // 8MB
      videoSize: 100 * 1024 * 1024, // 100MB
      videoDuration: 60, // seconds
    },
  },
  twitter: {
    id: "twitter",
    name: "twitter",
    displayName: "X (Twitter)",
    icon: "𝕏",
    color: "bg-black",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    apiBaseUrl: "https://api.twitter.com/2",
    features: {
      posts: true,
      stories: false,
      reels: false,
      videos: true,
      images: true,
      scheduling: true,
    },
    limits: {
      textLength: 280,
      imageSize: 5 * 1024 * 1024, // 5MB
      videoSize: 512 * 1024 * 1024, // 512MB
      videoDuration: 140, // seconds
    },
  },
  tiktok: {
    id: "tiktok",
    name: "tiktok",
    displayName: "TikTok",
    icon: "🎵",
    color: "bg-black",
    authUrl: "https://www.tiktok.com/auth/authorize/",
    tokenUrl: "https://open-api.tiktok.com/oauth/access_token/",
    scope: "user.info.basic,video.list,video.upload",
    apiBaseUrl: "https://open-api.tiktok.com",
    features: {
      posts: false,
      stories: false,
      reels: false,
      videos: true,
      images: false,
      scheduling: true,
    },
    limits: {
      textLength: 150,
      imageSize: 0,
      videoSize: 287 * 1024 * 1024, // 287MB
      videoDuration: 180, // seconds
    },
  },
  facebook: {
    id: "facebook",
    name: "facebook",
    displayName: "Facebook",
    icon: "📘",
    color: "bg-blue-600",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scope: "pages_manage_posts,pages_read_engagement,publish_to_groups",
    apiBaseUrl: "https://graph.facebook.com/v18.0",
    features: {
      posts: true,
      stories: true,
      reels: true,
      videos: true,
      images: true,
      scheduling: true,
    },
    limits: {
      textLength: 63206,
      imageSize: 4 * 1024 * 1024, // 4MB
      videoSize: 10 * 1024 * 1024 * 1024, // 10GB
      videoDuration: 240 * 60, // 240 minutes
    },
  },
  linkedin: {
    id: "linkedin",
    name: "linkedin",
    displayName: "LinkedIn",
    icon: "💼",
    color: "bg-blue-700",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "w_member_social,r_liteprofile",
    apiBaseUrl: "https://api.linkedin.com/v2",
    features: {
      posts: true,
      stories: false,
      reels: false,
      videos: true,
      images: true,
      scheduling: true,
    },
    limits: {
      textLength: 3000,
      imageSize: 100 * 1024 * 1024, // 100MB
      videoSize: 5 * 1024 * 1024 * 1024, // 5GB
      videoDuration: 10 * 60, // 10 minutes
    },
  },
  youtube: {
    id: "youtube",
    name: "youtube",
    displayName: "YouTube",
    icon: "📺",
    color: "bg-red-600",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube",
    apiBaseUrl: "https://www.googleapis.com/youtube/v3",
    features: {
      posts: false,
      stories: false,
      reels: false,
      videos: true,
      images: false,
      scheduling: true,
    },
    limits: {
      textLength: 5000, // Description length
      imageSize: 2 * 1024 * 1024, // 2MB for thumbnails
      videoSize: 256 * 1024 * 1024 * 1024, // 256GB
      videoDuration: 12 * 60 * 60, // 12 hours
    },
  },
}

export const getSupportedPlatforms = () => Object.values(SOCIAL_PLATFORMS)

export const getPlatformById = (id: string) => SOCIAL_PLATFORMS[id]

export const getPlatformsByFeature = (feature: keyof SocialPlatform["features"]) => {
  return Object.values(SOCIAL_PLATFORMS).filter((platform) => platform.features[feature])
}

export const validateContentForPlatform = (
  platformId: string,
  content: {
    text?: string
    mediaType?: "image" | "video"
    mediaSize?: number
    videoDuration?: number
  },
) => {
  const platform = getPlatformById(platformId)
  if (!platform) return { valid: false, errors: ["Platform not found"] }

  const errors: string[] = []

  if (content.text && content.text.length > platform.limits.textLength) {
    errors.push(`Text exceeds ${platform.limits.textLength} character limit`)
  }

  if (content.mediaType === "image" && content.mediaSize && content.mediaSize > platform.limits.imageSize) {
    errors.push(`Image size exceeds ${platform.limits.imageSize / (1024 * 1024)}MB limit`)
  }

  if (content.mediaType === "video") {
    if (content.mediaSize && content.mediaSize > platform.limits.videoSize) {
      errors.push(`Video size exceeds ${platform.limits.videoSize / (1024 * 1024)}MB limit`)
    }
    if (content.videoDuration && content.videoDuration > platform.limits.videoDuration) {
      errors.push(`Video duration exceeds ${platform.limits.videoDuration} second limit`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
