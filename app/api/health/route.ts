// Health check endpoint for production monitoring
import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/database"

export async function GET(request: NextRequest) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: {
      database: "unknown",
      environment: "unknown",
      oauth_configs: "unknown",
    },
  }

  try {
    // Check database connection
    const dbResult = await pool.query("SELECT NOW()")
    checks.checks.database = dbResult.rows.length > 0 ? "healthy" : "unhealthy"
  } catch (error) {
    checks.checks.database = "unhealthy"
    checks.status = "unhealthy"
  }

  // Check environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_BASE_URL",
    "INSTAGRAM_CLIENT_ID",
    "TWITTER_CLIENT_ID",
    "FACEBOOK_CLIENT_ID",
    "LINKEDIN_CLIENT_ID",
    "YOUTUBE_CLIENT_ID",
    "TIKTOK_CLIENT_ID",
  ]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])
  checks.checks.environment = missingEnvVars.length === 0 ? "healthy" : "unhealthy"

  if (missingEnvVars.length > 0) {
    checks.status = "unhealthy"
    ;(checks as any).missing_env_vars = missingEnvVars
  }

  // Check OAuth configurations
  const oauthConfigs = [
    {
      platform: "instagram",
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    },
    { platform: "twitter", clientId: process.env.TWITTER_CLIENT_ID, clientSecret: process.env.TWITTER_CLIENT_SECRET },
    {
      platform: "facebook",
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    {
      platform: "linkedin",
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    },
    { platform: "youtube", clientId: process.env.YOUTUBE_CLIENT_ID, clientSecret: process.env.YOUTUBE_CLIENT_SECRET },
    { platform: "tiktok", clientId: process.env.TIKTOK_CLIENT_ID, clientSecret: process.env.TIKTOK_CLIENT_SECRET },
  ]

  const incompleteConfigs = oauthConfigs.filter((config) => !config.clientId || !config.clientSecret)
  checks.checks.oauth_configs = incompleteConfigs.length === 0 ? "healthy" : "partial"

  if (incompleteConfigs.length > 0) {
    ;(checks as any).incomplete_oauth_configs = incompleteConfigs.map((c) => c.platform)
  }

  const statusCode = checks.status === "healthy" ? 200 : 503

  return NextResponse.json(checks, { status: statusCode })
}
