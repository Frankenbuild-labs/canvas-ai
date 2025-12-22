// Health check endpoint for production monitoring
import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { neon } from "@neondatabase/serverless"
import { Client as PgClient } from "pg"
import { isConfigured as isSignalWireConfigured, getCompatBase } from "@/lib/voice/signalwire"

export async function GET(request: NextRequest) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: {
      database: "unknown",
      environment: "unknown",
      oauth_configs: "unknown",
      crm: "unknown",
      email: "unknown",
      dialer: "unknown",
    },
  }

  try {
    // Check database connection (Supabase/Postgres only)
    const cs = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL!
    const url = new URL(cs)
    const isNeon = /neon\.tech$/i.test(url.hostname)
    let sql: any
    if (isNeon) {
      sql = neon(cs) as any
      const rows = await sql("SELECT NOW()")
      checks.checks.database = Array.isArray(rows) ? "healthy" : "unhealthy"
    } else {
      const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      const pgCfg: any = {
        host: url.hostname,
        port: url.port ? Number(url.port) : 5432,
        user: decodeURIComponent(url.username || ""),
        password: decodeURIComponent(url.password || ""),
        database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
      }
      if (!isLocal) pgCfg.ssl = { rejectUnauthorized: false, servername: url.hostname }
      const client = new PgClient(pgCfg)
      await client.connect()
      const res = await client.query("SELECT NOW()")
      await client.end()
      checks.checks.database = Array.isArray(res?.rows) ? "healthy" : "unhealthy"
      // Provide a minimal shim for sql() below
      sql = async (text: string) => {
        const c = new PgClient(pgCfg)
        await c.connect()
        const out = await c.query(text)
        await c.end()
        return out.rows
      }
    }

    // Lightweight schema checks for key modules
    // CRM tables
    try {
      const crm = await sql("SELECT to_regclass('public.crm_leads') as t")
      checks.checks.crm = crm?.[0]?.t ? "ready" : "missing"
      if (!crm?.[0]?.t) checks.status = "unhealthy"
    } catch {
      checks.checks.crm = "error"
      checks.status = "unhealthy"
    }

  // Email marketing tables
    try {
      const em = await sql("SELECT to_regclass('public.email_contacts') as t")
      checks.checks.email = em?.[0]?.t ? "ready" : "missing"
      if (!em?.[0]?.t) checks.status = "unhealthy"
    } catch {
      checks.checks.email = "error"
      checks.status = "unhealthy"
    }

    // Dialer call logs table
    try {
      const cl = await sql("SELECT to_regclass('public.call_logs') as t")
      // We'll mark dialer DB part as ready/missing; provider checked below
      const dbReady = Boolean(cl?.[0]?.t)
      checks.checks.dialer = dbReady ? "db-ready" : "db-missing"
      if (!dbReady) checks.status = "unhealthy"
    } catch {
      checks.checks.dialer = "db-error"
      checks.status = "unhealthy"
    }
  } catch (error: any) {
    checks.checks.database = "unhealthy"
    checks.status = "unhealthy"
    ;(checks as any).db_error = {
      message: String(error?.message || error),
      code: (error && (error as any).code) || undefined,
      detail: (error && (error as any).detail) || undefined,
    }
  }

  // Check environment variables
  // Only truly required envs for core app health
  const requiredEnvVars = [
    // Accept either SUPABASE_DATABASE_URL or DATABASE_URL
    process.env.SUPABASE_DATABASE_URL ? "SUPABASE_DATABASE_URL" : "DATABASE_URL",
    "NEXT_PUBLIC_BASE_URL",
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

  // Check Email provider (Resend)
  const hasResend = Boolean(process.env.RESEND_API_KEY)
  ;(checks as any).email_provider = hasResend ? "resend:configured" : "resend:missing"
  if (!hasResend) {
    // Only degrade to partial if DB/table exists but provider missing
    if (checks.checks.email === "ready") checks.checks.email = "partial"
  }

  // Check Dialer provider (SignalWire)
  const dialerConfigured = isSignalWireConfigured() && Boolean(getCompatBase())
  ;(checks as any).dialer_provider = dialerConfigured ? "signalwire:configured" : "signalwire:missing"
  if (!dialerConfigured) {
    // Only degrade to partial if DB/table exists but provider missing
    if (typeof checks.checks.dialer === "string" && checks.checks.dialer.startsWith("db-ready")) {
      checks.checks.dialer = "partial"
    }
  }

  const statusCode = checks.status === "healthy" ? 200 : 503

  return NextResponse.json(checks, { status: statusCode })
}
