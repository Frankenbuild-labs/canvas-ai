// Authentication and token management utilities
import crypto from "crypto"

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex")
const ALGORITHM = "aes-256-gcm"

export interface TokenData {
  access_token: string
  refresh_token?: string
  expires_at?: Date
  scope?: string
}

// Encrypt sensitive token data
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)

  let encrypted = cipher.update(token, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted
}

// Decrypt token data
export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format")
  }

  const iv = Buffer.from(parts[0], "hex")
  const authTag = Buffer.from(parts[1], "hex")
  const encrypted = parts[2]

  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// Check if token is expired
export function isTokenExpired(expiresAt?: Date): boolean {
  if (!expiresAt) return false
  return new Date() >= expiresAt
}

// Calculate token expiry from expires_in seconds
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

// Generate secure state parameter for OAuth
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Validate OAuth state parameter
export function validateOAuthState(state: string, expectedState: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
}
