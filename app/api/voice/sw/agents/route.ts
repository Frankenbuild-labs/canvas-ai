import { NextRequest } from "next/server"
import sql, { DatabaseService } from "@/lib/database"
import { randomUUID } from "crypto"

function safeSql(text: string, params: any[]) {
  try {
    return sql(text, params)
  } catch (err) {
    throw err
  }
}

// TODO: replace with real session user
async function getUserId() {
  // Use a stable dev user to avoid FK issues when users table exists
  return await DatabaseService.getOrCreateComposioUserIdForDevice('dev')
}

// GET /api/voice/sw/agents - List all agents for current user
export async function GET(_req: NextRequest) {
  try {
    const userId = await getUserId()
    let agents: any[] = []
    try {
      agents = await safeSql("SELECT * FROM signalwire_agents WHERE user_id = $1 ORDER BY created_at DESC", [userId])
    } catch (dbErr: any) {
      const msg = dbErr?.message || String(dbErr)
      console.error('Agent list query failed:', msg)
      // If the table doesn't exist yet or schema isn't ready, fail soft with empty list
      if (/relation\s+"?signalwire_agents"?\s+does not exist/i.test(msg)) {
        return Response.json({ ok: true, agents: [], warning: msg })
      }
      return Response.json({ ok: false, error: 'Agent list query failed', detail: msg }, { status: 500 })
    }
    return Response.json({ ok: true, agents })
  } catch (e: any) {
    console.error("Failed to fetch agents:", e)
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}

// POST /api/voice/sw/agents - Create new agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agent_name, prompt, assigned_number, settings = {} } = body

    if (!agent_name?.trim()) {
      return Response.json({ ok: false, error: "Agent name is required" }, { status: 400 })
    }
    if (!prompt?.trim()) {
      return Response.json({ ok: false, error: "Prompt is required" }, { status: 400 })
    }
    if (!assigned_number?.trim()) {
      return Response.json({ ok: false, error: "Phone number is required" }, { status: 400 })
    }

    // Insert into database
    const userId = await getUserId()
    const newId = randomUUID()
    let result: any[] = []
    try {
      result = await safeSql(
        `INSERT INTO signalwire_agents (id, user_id, agent_name, prompt, assigned_number, settings, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [newId, userId, agent_name.trim(), prompt.trim(), assigned_number.trim(), JSON.stringify(settings), "inactive"]
      )
    } catch (insertErr: any) {
      return Response.json({ ok: false, error: 'Agent insert failed', detail: insertErr?.message || String(insertErr) }, { status: 500 })
    }

    const agent = result[0]
    return Response.json({ ok: true, agent }, { status: 201 })
  } catch (e: any) {
    console.error("Failed to create agent:", e)
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
