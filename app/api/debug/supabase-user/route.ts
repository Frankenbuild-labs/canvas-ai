import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth-next"
import { supabaseAdmin } from "@/lib/supabaseClient"

export async function GET(req: NextRequest) {
  try {
    // Resolve user id using our auth helper
    const userId = await getUserIdFromRequest(req as any)

    // Quick supabase health check: fetch user by id (guard against differing supabase-js versions)
    let supabaseUser = null
    try {
      const anyAuth = (supabaseAdmin as any).auth
      if (anyAuth) {
        if (typeof anyAuth.getUserById === 'function') {
          const { data, error } = await anyAuth.getUserById(userId as string)
          if (!error) supabaseUser = data?.user ?? null
        } else if (typeof anyAuth.getUser === 'function') {
          // newer supabase-js may expose getUser({ userId })
          const { data, error } = await anyAuth.getUser({ userId: userId as string })
          if (!error) supabaseUser = data?.user ?? null
        }
      }
    } catch (e) {
      // ignore non-fatal inspection errors
    }

    return NextResponse.json({ ok: true, userId, supabaseUser })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
