import { NextRequest } from "next/server"
import sql, { DatabaseService } from "@/lib/database"
import { getCompatBase, getAuthHeader } from "@/lib/voice/signalwire"

async function getUserId() {
  return await DatabaseService.getOrCreateComposioUserIdForDevice('dev')
}

// PATCH /api/voice/sw/agents/[id] - Update agent status or settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const status: string | undefined = body?.status
    const settings: any | undefined = body?.settings

    if (typeof status !== 'undefined' && !["active", "inactive"].includes(status)) {
      return Response.json({ ok: false, error: "Status must be 'active' or 'inactive'" }, { status: 400 })
    }

    const fragments: string[] = []
    const paramsArr: any[] = []
    if (typeof status !== 'undefined') {
      fragments.push(`status = $${paramsArr.push(status)}`)
      fragments.push(`last_activated_at = CASE WHEN $${paramsArr.length} = 'active' THEN NOW() ELSE last_activated_at END`)
    }
    if (typeof settings !== 'undefined') {
      fragments.push(`settings = $${paramsArr.push(JSON.stringify(settings))}`)
    }
    if (fragments.length === 0) {
      return Response.json({ ok: false, error: 'No fields to update' }, { status: 400 })
    }

    const userId = await getUserId()
    paramsArr.push(id, userId)
    const result = await sql(
      `UPDATE signalwire_agents 
       SET ${fragments.join(', ')}
       WHERE id = $${paramsArr.length - 1} AND user_id = $${paramsArr.length}
       RETURNING *`,
      paramsArr
    )

    if (!result || result.length === 0) {
      return Response.json({ ok: false, error: "Agent not found" }, { status: 404 })
    }

    const agent = result[0]

    // If activating, bind the assigned number's VoiceUrl to our agent answer webhook
    if (status === 'active') {
      try {
        // Create dynamic prefab agent in Python service with custom configurations
        const svc = process.env.AGENTS_SERVICE_URL || 'http://127.0.0.1:8100'
        const agentSettings = settings || agent.settings || {}
        const prefab = (agentSettings?.prefab || 'receptionist') as string
        
        // Build configuration object with custom departments/questions/faqs if provided
        const agentConfig = {
          agent_id: params.id,
          prefab: prefab,
          voice: agentSettings?.voice || 'alloy',
          language: agentSettings?.language || 'en-US',
          ...(agentSettings?.departments && { departments: agentSettings.departments }),
          ...(agentSettings?.questions && { questions: agentSettings.questions }),
          ...(agentSettings?.faqs && { faqs: agentSettings.faqs }),
        }
        
        const createRes = await fetch(`${svc}/agents/create`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentConfig),
        })
        const createJson = await createRes.json().catch(() => ({}))
        if (!createRes.ok || !createJson?.route) {
          console.error('[agent.create prefab] failed', createJson)
        }
        const agentRoute = createJson?.route || `/dyn/${params.id}`
        const voiceUrl = `${svc}${agentRoute}`
        // Bind the phone number directly to the Python agent route (serves real SWML)
        const listUrl = `${getCompatBase()}/IncomingPhoneNumbers.json?PageSize=100`
        const res = await fetch(listUrl, { headers: { ...getAuthHeader() }, cache: 'no-store' })
        const text = await res.text()
        let data: any
        try { data = JSON.parse(text) } catch { data = { raw: text } }
        const arr = data?.incoming_phone_numbers || data?.IncomingPhoneNumbers || data?.items || data?.Items || []
        const match = (Array.isArray(arr) ? arr : []).find((it: any) => {
          const num = it?.phone_number || it?.PhoneNumber || it?.number || it?.Number
          return String(num) === String(agent.assigned_number)
        })
        const sid = match?.sid || match?.Sid || match?.resource_sid || match?.ResourceSid
        if (sid) {
          const updUrl = `${getCompatBase()}/IncomingPhoneNumbers/${sid}.json`
          const payload = new URLSearchParams({ VoiceUrl: voiceUrl, VoiceMethod: 'POST' })
          await fetch(updUrl, {
            method: 'POST',
            headers: { ...getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
            cache: 'no-store',
          })
        }
      } catch (bindErr) {
        console.error('[agent.bind VoiceUrl dynamic] failed', bindErr)
      }
      } else if (status === 'inactive') {
        // Unbind VoiceUrl on deactivate: find SID then clear VoiceUrl
        try {
          const listUrl = `${getCompatBase()}/IncomingPhoneNumbers.json?PageSize=100`
          const res = await fetch(listUrl, { headers: { ...getAuthHeader() }, cache: 'no-store' })
          const text = await res.text()
          let data: any
          try { data = JSON.parse(text) } catch { data = { raw: text } }
          const arr = data?.incoming_phone_numbers || data?.IncomingPhoneNumbers || data?.items || data?.Items || []
          const match = (Array.isArray(arr) ? arr : []).find((it: any) => {
            const num = it?.phone_number || it?.PhoneNumber || it?.number || it?.Number
            return String(num) === String(agent.assigned_number)
          })
          const sid = match?.sid || match?.Sid || match?.resource_sid || match?.ResourceSid
          if (sid) {
            const updUrl = `${getCompatBase()}/IncomingPhoneNumbers/${sid}.json`
            const payload = new URLSearchParams({ VoiceUrl: '', VoiceMethod: 'POST' })
            await fetch(updUrl, {
              method: 'POST',
              headers: { ...getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
              body: payload.toString(),
              cache: 'no-store',
            })
          }
        } catch (unbindErr) {
          console.error('[agent.unbind VoiceUrl] failed', unbindErr)
        }
    }
    // If deactivating, optional: leave VoiceUrl as-is or set to Hangup

  // TODO: Call SignalWire API to actually activate/deactivate/update the agent on the phone number
    // For now, we just update the database status. Integration with SignalWire SWAIG API
    // will be added once we have the API documentation.

    return Response.json({ ok: true, agent })
  } catch (e: any) {
    console.error("Failed to update agent:", e)
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}

// DELETE /api/voice/sw/agents/[id] - Delete agent
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const userId = await getUserId()
    const result = await sql(
      "DELETE FROM signalwire_agents WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    )

    if (!result || result.length === 0) {
      return Response.json({ ok: false, error: "Agent not found" }, { status: 404 })
    }

    return Response.json({ ok: true, deleted: true })
  } catch (e: any) {
    console.error("Failed to delete agent:", e)
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
