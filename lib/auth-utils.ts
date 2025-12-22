// Authentication and token management utilities
import crypto from "crypto"

// Require a stable encryption key; do NOT fall back to random generation which breaks
// decryption after server restarts.
const rawKey = process.env.TOKEN_ENCRYPTION_KEY
if (!rawKey) {
  throw new Error("Missing TOKEN_ENCRYPTION_KEY env var (64 hex chars for 32 bytes). Set it in .env.local before starting the server.")
}
const ENCRYPTION_KEY = rawKey.trim()
const ALGORITHM = "aes-256-gcm"

export interface TokenData {
  access_token: string
  refresh_token?: string
  expires_at?: Date
  scope?: string
}

// Encrypt sensitive token data
export function encryptToken(token: string): string {
  // AES-256-GCM requires a 32-byte key
  const key = Buffer.from(ENCRYPTION_KEY, "hex").length === 32
    ? Buffer.from(ENCRYPTION_KEY, "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest()

  // 12 or 16 byte IV is recommended for GCM; we use 12 bytes
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Return iv:tag:ciphertext as hex
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":")
}

// Decrypt token data
export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted token format")

  const [ivHex, tagHex, encHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(tagHex, "hex")
  const encrypted = Buffer.from(encHex, "hex")

  const key = Buffer.from(ENCRYPTION_KEY, "hex").length === 32
    ? Buffer.from(ENCRYPTION_KEY, "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
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
