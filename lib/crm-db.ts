import sql from "@/lib/database"
import { randomUUID } from "crypto"

export type DbLead = {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  company: string
  position?: string
  status: string
  value: number
  source?: string
  notes?: string
  created_at: string
  last_contact?: string
  document_id?: string
  document_answers?: any
}

// Detect column type of user_id so inserts don't fail when the DB uses uuid
let cachedUserIdColumnType: "uuid" | "text" | null = null
async function getUserIdColumnType(): Promise<"uuid" | "text"> {
  if (cachedUserIdColumnType) return cachedUserIdColumnType
  try {
    const rows = await sql(
      `SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='crm_leads' AND column_name='user_id'`
    )
    const dt = String(rows?.[0]?.data_type || '').toLowerCase()
    if (dt.includes('uuid')) {
      cachedUserIdColumnType = "uuid"
    } else {
      cachedUserIdColumnType = "text"
    }
  } catch {
    cachedUserIdColumnType = "text"
  }
  return cachedUserIdColumnType
}

// Normalize a provided userId to a value acceptable by the DB schema
async function normalizeUserIdForInsert(userId: string): Promise<string> {
  const t = await getUserIdColumnType()
  if (t === 'uuid') {
    // Use a stable UUID for test/dev contexts
    // If a real auth user id (uuid) is provided, prefer it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (uuidRegex.test(userId)) return userId
    return '00000000-0000-0000-0000-000000000001'
  }
  return userId
}

export type DbLeadList = {
  id: string
  user_id: string
  name: string
  created_at: string
}

function ignoreUserScope() {
  return process.env.CRM_IGNORE_USER_SCOPE === 'true'
}

export async function listLeads(userId: string, options?: { limit?: number; skip?: number; search?: string; listId?: string }) {
  const limit = Math.max(1, Math.min(200, options?.limit ?? 100))
  const offset = Math.max(0, options?.skip ?? 0)
  const search = (options?.search || '').trim()
  const listId = options?.listId?.trim()

  // Build dynamic query with optional list filter and search
  const params: any[] = []
  let where = 'WHERE 1=1'
  if (!ignoreUserScope()) {
    params.push(userId)
    where += ` AND l.user_id = $${params.length}`
  }
  let join = ''

  if (listId) {
    join += ' INNER JOIN crm_lead_list_members m ON m.lead_id = l.id'
    where += ` AND m.list_id = $${params.push(listId)}`
  }

  if (search) {
    const idx = params.push(`%${search}%`)
    where += ` AND (l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR COALESCE(l.phone,'') ILIKE $${idx})`
  }

  const countQuery = `SELECT COUNT(*)::int AS count FROM crm_leads l ${join} ${where}`
  const countRes = await sql(countQuery, params)
  const total = (countRes?.[0]?.count as number) || 0

  const rows = await sql(
    `SELECT l.* FROM crm_leads l ${join} ${where} ORDER BY l.created_at DESC LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
    params
  )
  return { leads: rows as DbLead[], total }
}

export async function insertLeads(userId: string, items: Omit<DbLead, "id" | "user_id" | "created_at">[]) {
  const created: DbLead[] = []
  const insUserId = await normalizeUserIdForInsert(userId)
  for (const it of items) {
    const id = randomUUID()
    try {
      console.log('[insertLeads] Attempting INSERT with:', {
        id,
        userId: insUserId,
        name: it.name,
        email: it.email,
        company: it.company
      })
      const res = await sql`INSERT INTO crm_leads (id, user_id, name, email, phone, company, position, status, value, source, notes, created_at, updated_at, last_contact, document_id, document_answers)
         VALUES (${id}, ${insUserId}, ${it.name}, ${it.email}, ${it.phone || null}, ${it.company}, ${it.position || null}, ${it.status || "new"}, ${Number(it.value || 0)}, ${it.source || null}, ${it.notes || null}, NOW()::timestamp, NOW()::timestamp, ${it.last_contact || null}, ${it.document_id || null}, ${it.document_answers || null}) RETURNING *`
      console.log('[insertLeads] INSERT result:', res[0])
      created.push(res[0] as any)
    } catch (err) {
      console.error('[insertLeads] INSERT failed:', err)
      throw err
    }
  }
  return created
}

export async function updateLead(userId: string, id: string, patch: Partial<Omit<DbLead, 'id' | 'user_id' | 'created_at'>>) {
  // Build dynamic update for allowed fields
  const fields: string[] = []
  const values: any[] = []
  function add(field: string, value: any) { fields.push(`${field} = $${values.length + 1}`); values.push(value) }
  if (patch.name !== undefined) add('name', patch.name)
  if (patch.email !== undefined) add('email', patch.email)
  if (patch.phone !== undefined) add('phone', patch.phone)
  if (patch.company !== undefined) add('company', patch.company)
  if (patch.position !== undefined) add('position', patch.position)
  if (patch.status !== undefined) add('status', patch.status)
  if (patch.value !== undefined) add('value', Number(patch.value))
  if (patch.source !== undefined) add('source', patch.source)
  if (patch.notes !== undefined) add('notes', patch.notes)
  if (patch.last_contact !== undefined) add('last_contact', patch.last_contact)
  if (patch.document_id !== undefined) add('document_id', patch.document_id)
  if (patch.document_answers !== undefined) add('document_answers', patch.document_answers)
  if (!fields.length) return null
  let sqlText: string
  let rows: any[]
  if (ignoreUserScope()) {
    sqlText = `UPDATE crm_leads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`
    rows = await sql(sqlText, [...values, id])
  } else {
    sqlText = `UPDATE crm_leads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`
    rows = await sql(sqlText, [...values, id, userId])
  }
  return rows?.[0] as DbLead | null
}

export async function createList(userId: string, name: string, leadIds: string[]) {
  const id = randomUUID()
  const insUserId = await normalizeUserIdForInsert(userId)
  const lst = await sql`INSERT INTO crm_lead_lists (id, user_id, name, created_at, updated_at) VALUES (${id}, ${insUserId}, ${name}, NOW()::timestamp, NOW()::timestamp) RETURNING *`
  const list = lst[0] as any
  if (leadIds.length) {
    for (const lid of leadIds) {
      await sql`INSERT INTO crm_lead_list_members (list_id, lead_id) VALUES (${list.id}, ${lid}) ON CONFLICT DO NOTHING`
    }
  }
  return list
}

export async function listListsWithMembers(userId: string) {
  if (ignoreUserScope()) {
    const rows = await sql`SELECT l.id, l.name, l.created_at, m.lead_id
       FROM crm_lead_lists l
       LEFT JOIN crm_lead_list_members m ON m.list_id = l.id
       ORDER BY l.created_at DESC`
    const map = new Map<string, { id: string; name: string; created_at: string; leadIds: string[] }>()
    for (const rAny of rows as any[]) {
      const r = rAny as { id: string; name: string; created_at: string; lead_id: string | null }
      const entry = map.get(r.id) || { id: r.id, name: r.name, created_at: r.created_at, leadIds: [] as string[] }
      if (r.lead_id) entry.leadIds.push(r.lead_id)
      map.set(r.id, entry)
    }
    return Array.from(map.values())
  }
  const rows = await sql`SELECT l.id, l.name, l.created_at, m.lead_id
     FROM crm_lead_lists l
     LEFT JOIN crm_lead_list_members m ON m.list_id = l.id
     WHERE l.user_id = ${userId}
     ORDER BY l.created_at DESC`
  const map = new Map<string, { id: string; name: string; created_at: string; leadIds: string[] }>()
  for (const rAny of rows as any[]) {
    const r = rAny as { id: string; name: string; created_at: string; lead_id: string | null }
    const entry = map.get(r.id) || { id: r.id, name: r.name, created_at: r.created_at, leadIds: [] as string[] }
    if (r.lead_id) entry.leadIds.push(r.lead_id)
    map.set(r.id, entry)
  }
  return Array.from(map.values())
}

export async function deleteList(userId: string, listId: string) {
  if (ignoreUserScope()) {
    await sql`DELETE FROM crm_lead_list_members WHERE list_id = ${listId}`
    await sql`DELETE FROM crm_lead_lists WHERE id = ${listId}`
    return
  }
  await sql`DELETE FROM crm_lead_list_members USING crm_lead_lists l WHERE crm_lead_list_members.list_id = l.id AND l.id = ${listId} AND l.user_id = ${userId}`
  await sql`DELETE FROM crm_lead_lists WHERE id = ${listId} AND user_id = ${userId}`
}

// Surveys
export type DbSurvey = {
  id: string
  user_id: string
  name: string
  description?: string
  schema: any
  created_at: string
  updated_at: string
}

export async function listSurveys(userId: string) {
  const rows = await sql`SELECT * FROM crm_surveys WHERE user_id = ${userId} ORDER BY created_at DESC`
  return rows as DbSurvey[]
}

export async function createSurvey(userId: string, name: string, description: string | null, schema: any) {
  const id = randomUUID()
  const rows = await sql`INSERT INTO crm_surveys (id, user_id, name, description, schema, created_at, updated_at)
    VALUES (${id}, ${userId}, ${name}, ${description}, ${schema}, NOW()::timestamp, NOW()::timestamp) RETURNING *`
  return rows?.[0] as DbSurvey
}

export async function updateSurvey(userId: string, id: string, patch: Partial<Omit<DbSurvey, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const fields: string[] = []
  const values: any[] = []
  function add(field: string, value: any) { fields.push(`${field} = $${values.length + 1}`); values.push(value) }
  if (patch.name !== undefined) add('name', patch.name)
  if (patch.description !== undefined) add('description', patch.description)
  if (patch.schema !== undefined) add('schema', patch.schema)
  if (!fields.length) return null
  const q = `UPDATE crm_surveys SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`
  const rows = await sql(q, [...values, id, userId])
  return rows?.[0] as DbSurvey | null
}

export async function deleteSurvey(userId: string, id: string) {
  await sql`DELETE FROM crm_surveys WHERE id = ${id} AND user_id = ${userId}`
}

