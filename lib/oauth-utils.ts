import { SOCIAL_PLATFORMS } from "./social-platforms"

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  expires_at?: number
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
  authUrl: string
  tokenUrl: string
}

export const getOAuthConfig = (platformId: string): OAuthConfig | null => {
  const platform = SOCIAL_PLATFORMS[platformId]
  if (!platform) return null

  const envPrefix = platformId.toUpperCase()
  const clientId = process.env[`${envPrefix}_CLIENT_ID`]
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`]

  if (!clientId || !clientSecret) {
    console.warn(`Missing OAuth credentials for ${platformId}`)
    return null
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/social/${platformId}`,
    scope: platform.scope,
    authUrl: platform.authUrl,
    tokenUrl: platform.tokenUrl,
  }
}

export const generateAuthUrl = (platformId: string, state?: string): string | null => {
  const config = getOAuthConfig(platformId)
  if (!config) return null

  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("redirect_uri", config.redirectUri)
  authUrl.searchParams.set("scope", config.scope)
  authUrl.searchParams.set("response_type", "code")

  if (state) {
    authUrl.searchParams.set("state", state)
  }

  // Platform-specific parameters
  if (platformId === "twitter") {
    authUrl.searchParams.set("code_challenge_method", "plain")
    authUrl.searchParams.set("code_challenge", "challenge")
  }

  return authUrl.toString()
}

export const exchangeCodeForTokens = async (
  platformId: string,
  code: string,
  state?: string,
): Promise<OAuthTokens | null> => {
  const config = getOAuthConfig(platformId)
  if (!config) return null

  try {
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    })

    // Platform-specific parameters
    if (platformId === "twitter") {
      tokenParams.set("code_verifier", "challenge")
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Token exchange failed for ${platformId}:`, errorText)
      return null
    }

    const tokens: OAuthTokens = await response.json()

    // Calculate expiration timestamp if expires_in is provided
    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + tokens.expires_in * 1000
    }

    return tokens
  } catch (error) {
    console.error(`Token exchange error for ${platformId}:`, error)
    return null
  }
}

export const refreshAccessToken = async (platformId: string, refreshToken: string): Promise<OAuthTokens | null> => {
  const config = getOAuthConfig(platformId)
  if (!config) return null

  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Token refresh failed for ${platformId}:`, errorText)
      return null
    }

    const tokens: OAuthTokens = await response.json()

    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + tokens.expires_in * 1000
    }

    return tokens
  } catch (error) {
    console.error(`Token refresh error for ${platformId}:`, error)
    return null
  }
}

export const isTokenExpired = (tokens: OAuthTokens): boolean => {
  if (!tokens.expires_at) return false
  return Date.now() >= tokens.expires_at
}

export const validateTokens = (tokens: OAuthTokens): boolean => {
  return !!(tokens.access_token && !isTokenExpired(tokens))
}
