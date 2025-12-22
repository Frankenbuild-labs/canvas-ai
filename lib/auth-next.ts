import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./nextauth"
import { DatabaseService } from "./database"
import { supabaseAdmin } from "./supabaseClient"

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || process.env.TOKEN_ENCRYPTION_KEY

/**
 * Try to resolve the current user id from the request.
 * Order of resolution:
 * 1. NextAuth server session (if available)
 * 2. NextAuth JWT token (if configured)
 * 3. x-user-id header
 * 4. canvas_user_id cookie
 * 5. fallback test user (dev only)
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string> {
  // Try server session first (works when NextAuth is configured)
  try {
    const session = await getServerSession(authOptions as any)
    if (session && (session as any).user && (session as any).user.id) {
      return (session as any).user.id
    }
  } catch (e) {
    // ignore and try token
  }

  // Try Supabase access token from Authorization header
  try {
    const authHeader = req.headers.get("authorization")
    const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null
    const token = bearer || null
    if (token) {
      const { data: userData, error } = await supabaseAdmin.auth.getUser(token as string)
      if (!error && userData && userData.user && userData.user.id) {
        return userData.user.id
      }
    }
  } catch (e) {
    // ignore and continue to next checks
  }

  // Try Supabase session cookie (supabase-auth-token)
  try {
    const cookieHeader = req.headers.get("cookie") || ""
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...rest] = c.split("=")
        return [k?.trim(), decodeURIComponent((rest || []).join("=") || "")]
      }),
    )
    // supabase stores auth info in 'supabase-auth-token' cookie as JSON containing access_token
    const supabaseAuth = cookies["supabase-auth-token"]
    if (supabaseAuth) {
      try {
        const parsed = JSON.parse(supabaseAuth)
        const accessToken = parsed?.access_token || parsed?.sb_access_token || parsed?.accessToken
        if (accessToken) {
          const { data: userData, error } = await supabaseAdmin.auth.getUser(accessToken)
          if (!error && userData && userData.user && userData.user.id) return userData.user.id
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
  } catch (e) {
    /* ignore */
  }

  // Try NextAuth JWT token
  try {
    if (NEXTAUTH_SECRET) {
      const token = await getToken({ req: req as any, secret: NEXTAUTH_SECRET })
      if (token && (token.sub || (token as any).id)) {
        return (token.sub as string) || (token as any).id
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Header fallback
  try {
    const header = req.headers.get("x-user-id")
    if (header) return header
  } catch (e) {
    /* ignore */
  }

  // Cookie fallback (simple cookie parse)
  try {
    const cookieHeader = req.headers.get("cookie") || ""
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...rest] = c.split("=")
        return [k?.trim(), decodeURIComponent((rest || []).join("=") || "")]
      }),
    )
    if (cookies["canvas_user_id"]) return cookies["canvas_user_id"]
  } catch (e) {
    /* ignore */
  }

  // Last resort: only return/create test user in development
  if (process.env.NODE_ENV === "development") {
    return DatabaseService.getOrCreateTestUser()
  }

  throw new Error("Unauthenticated: no user session found")
}

export default { getUserIdFromRequest }
