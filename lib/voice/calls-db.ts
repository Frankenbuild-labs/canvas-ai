import sql from "@/lib/database"

export async function createCallLog(params: {
  userId: string
  leadId?: string
  contactNumber: string
  fromNumber: string
  providerCallSid?: string
  direction?: 'outbound' | 'inbound'
  status?: string
  raw?: any
}) {
  const rows = await sql`
    INSERT INTO call_logs (user_id, lead_id, contact_number, from_number, provider_call_sid, direction, status, raw)
    VALUES (${params.userId}, ${params.leadId || null}, ${params.contactNumber}, ${params.fromNumber}, ${params.providerCallSid || null}, ${params.direction || 'outbound'}, ${params.status || null}, ${params.raw ? JSON.stringify(params.raw) : null})
    RETURNING *
  `
  
  // Update last_contact on crm_leads if leadId provided
  if (params.leadId) {
    await sql`
      UPDATE crm_leads 
      SET last_contact = NOW() 
      WHERE id = ${params.leadId}
    `
  }
  
  return rows?.[0]
}

export async function updateCallLogBySid(sid: string, updates: {
  status?: string
  endedAt?: string
  durationSeconds?: number
  recordingUrl?: string
  raw?: any
}) {
  const sets: string[] = []
  const params: any[] = []
  if (typeof updates.status !== 'undefined') sets.push(`status = $${params.push(updates.status)}`)
  if (typeof updates.endedAt !== 'undefined') sets.push(`ended_at = $${params.push(updates.endedAt)}`)
  if (typeof updates.durationSeconds !== 'undefined') sets.push(`duration_seconds = $${params.push(updates.durationSeconds)}`)
  if (typeof updates.recordingUrl !== 'undefined') sets.push(`recording_url = $${params.push(updates.recordingUrl)}`)
  if (typeof updates.raw !== 'undefined') sets.push(`raw = $${params.push(JSON.stringify(updates.raw))}`)
  if (!sets.length) return null
  params.push(sid)
  const rows = await sql(`UPDATE call_logs SET ${sets.join(', ')} WHERE provider_call_sid = $${params.length} RETURNING *`, params)
  return rows?.[0]
}

export async function listRecentCalls(userId: string, limit = 20) {
  const rows = await sql`SELECT * FROM call_logs WHERE user_id = ${userId} ORDER BY started_at DESC LIMIT ${limit}`
  return rows
}

export async function addCallDisposition(callLogId: string, params: {
  dispositionType: string
  notes?: string
  nextAction?: string
  followUpDate?: string
  createdBy: string
}) {
  const rows = await sql`
    INSERT INTO call_dispositions (
      call_log_id, disposition_type, notes, 
      next_action, follow_up_date, created_by
    )
    VALUES (
      ${callLogId}, 
      ${params.dispositionType}, 
      ${params.notes || null}, 
      ${params.nextAction || null}, 
      ${params.followUpDate || null}, 
      ${params.createdBy}
    )
    RETURNING *
  `
  return rows?.[0]
}

export async function listCallHistoryWithDispositions(userId: string, limit = 50) {
  const rows = await sql`
    SELECT 
      cl.*,
      cd.disposition_type,
      cd.notes as disposition_notes,
      cd.next_action,
      cd.follow_up_date,
      l.name as lead_name,
      l.company as lead_company,
      l.email as lead_email
    FROM call_logs cl
    LEFT JOIN call_dispositions cd ON cd.call_log_id = cl.id
    LEFT JOIN crm_leads l ON l.id = cl.lead_id
    WHERE cl.user_id = ${userId}
    ORDER BY cl.started_at DESC
    LIMIT ${limit}
  `
  return rows
}

export async function getCallDisposition(callLogId: string) {
  const rows = await sql`
    SELECT * FROM call_dispositions 
    WHERE call_log_id = ${callLogId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows?.[0]
}

export async function listFollowUps(userId: string, daysAhead = 7) {
  const rows = await sql`
    SELECT 
      cd.*,
      cl.contact_number,
      cl.from_number,
      l.name as lead_name,
      l.email as lead_email,
      l.company as lead_company,
      l.id as lead_id
    FROM call_dispositions cd
    JOIN call_logs cl ON cl.id = cd.call_log_id
    LEFT JOIN crm_leads l ON l.id = cl.lead_id
    WHERE cl.user_id = ${userId}
      AND cd.follow_up_date IS NOT NULL
      AND cd.follow_up_date <= NOW() + interval '${daysAhead} days'
      AND cd.follow_up_date >= NOW()
    ORDER BY cd.follow_up_date ASC
  `
  return rows
}
