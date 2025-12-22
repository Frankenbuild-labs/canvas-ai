import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

  let query = supabase.from('crm_leads').select('*', { count: 'exact' })

  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }

  if (listId) {
    const { data: memberIds } = await supabase
      .from('crm_lead_list_members')
      .select('lead_id')
      .eq('list_id', listId)
    
    if (memberIds) {
      const ids = memberIds.map(m => m.lead_id)
      query = query.in('id', ids)
    }
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return { leads: (data || []) as DbLead[], total: count || 0 }
}

export async function getLead(userId: string, leadId: string): Promise<DbLead | null> {
  let query = supabase.from('crm_leads').select('*').eq('id', leadId)

  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as DbLead
}

export async function createLead(userId: string, lead: Omit<DbLead, 'id' | 'created_at' | 'user_id'>): Promise<DbLead> {
  const newLead = {
    id: randomUUID(),
    user_id: userId,
    ...lead,
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase.from('crm_leads').insert(newLead).select().single()

  if (error) throw error

  return data as DbLead
}

export async function updateLead(userId: string, leadId: string, updates: Partial<DbLead>): Promise<DbLead | null> {
  let query = supabase.from('crm_leads').update(updates).eq('id', leadId)

  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.select().single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as DbLead
}

export async function deleteLead(userId: string, leadId: string): Promise<boolean> {
  let query = supabase.from('crm_leads').delete().eq('id', leadId)

  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }

  const { error } = await query

  if (error) {
    if (error.code === 'PGRST116') return false
    throw error
  }

  return true
}

export async function createLeadsList(userId: string, name: string): Promise<DbLeadList> {
  const newList = {
    id: randomUUID(),
    user_id: userId,
    name,
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase.from('crm_lead_lists').insert(newList).select().single()

  if (error) throw error

  return data as DbLeadList
}

export async function listLeadLists(userId: string): Promise<DbLeadList[]> {
  let query = supabase.from('crm_lead_lists').select('*')

  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error

  return (data || []) as DbLeadList[]
}

export async function addLeadToList(listId: string, leadId: string): Promise<void> {
  const { error } = await supabase
    .from('crm_lead_list_members')
    .insert({ list_id: listId, lead_id: leadId })
    .select()
    .single()

  if (error && error.code !== '23505') {
    throw error
  }
}

export async function removeLeadFromList(listId: string, leadId: string): Promise<void> {
  const { error } = await supabase
    .from('crm_lead_list_members')
    .delete()
    .eq('list_id', listId)
    .eq('lead_id', leadId)

  if (error) throw error
}

export async function bulkCreateLeads(userId: string, leads: Omit<DbLead, 'id' | 'created_at' | 'user_id'>[]): Promise<DbLead[]> {
  const newLeads = leads.map(lead => ({
    id: randomUUID(),
    user_id: userId,
    ...lead,
    created_at: new Date().toISOString()
  }))

  const { data, error } = await supabase.from('crm_leads').insert(newLeads).select()

  if (error) throw error

  return (data || []) as DbLead[]
}

export async function createList(userId: string, name: string, leadIds: string[]): Promise<DbLeadList> {
  const list = await createLeadsList(userId, name)
  
  if (leadIds.length > 0) {
    const members = leadIds.map(leadId => ({
      list_id: list.id,
      lead_id: leadId
    }))
    
    await supabase.from('crm_lead_list_members').insert(members)
  }
  
  return list
}

export async function listListsWithMembers(userId: string) {
  let query = supabase.from('crm_lead_lists').select('*')
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data: lists, error } = await query
  
  if (error) throw error
  
  if (!lists) return []
  
  // Get all members for all lists
  const { data: members } = await supabase
    .from('crm_lead_list_members')
    .select('list_id, lead_id')
  
  // Group members by list_id
  const membersByList = new Map<string, string[]>()
  if (members) {
    for (const member of members) {
      const existing = membersByList.get(member.list_id) || []
      existing.push(member.lead_id)
      membersByList.set(member.list_id, existing)
    }
  }
  
  // Return lists with their leadIds
  return lists.map(list => ({
    ...list,
    leadIds: membersByList.get(list.id) || []
  }))
}

export async function deleteList(userId: string, listId: string): Promise<void> {
  // First delete all members
  await supabase
    .from('crm_lead_list_members')
    .delete()
    .eq('list_id', listId)
  
  // Then delete the list
  let query = supabase.from('crm_lead_lists').delete().eq('id', listId)
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { error } = await query
  
  if (error) throw error
}

// Alias for compatibility with existing code
export async function insertLeads(userId: string, leads: Omit<DbLead, 'id' | 'created_at' | 'user_id'>[]): Promise<DbLead[]> {
  return bulkCreateLeads(userId, leads)
}

// Surveys
export async function listSurveys(userId: string) {
  let query = supabase.from('crm_surveys').select('*')
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  if (error) throw error
  
  return data || []
}

export async function createSurvey(userId: string, name: string, description: string | null, schema: any) {
  const newSurvey = {
    id: randomUUID(),
    user_id: userId,
    name,
    description,
    schema,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase.from('crm_surveys').insert(newSurvey).select().single()
  
  if (error) throw error
  
  return data
}

export async function updateSurvey(userId: string, id: string, patch: any) {
  const updates = { ...patch, updated_at: new Date().toISOString() }
  
  let query = supabase.from('crm_surveys').update(updates).eq('id', id)
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { data, error } = await query.select().single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data
}

export async function deleteSurvey(userId: string, id: string) {
  let query = supabase.from('crm_surveys').delete().eq('id', id)
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { error } = await query
  
  if (error) throw error
}

// Custom Statuses
export async function listCustomStatuses(userId: string): Promise<string[]> {
  let query = supabase.from('crm_custom_statuses').select('status')
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  return (data || []).map(d => d.status)
}

export async function addCustomStatus(userId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('crm_custom_statuses')
    .insert({
      id: randomUUID(),
      user_id: userId,
      status
    })
  
  if (error && error.code !== '23505') { // Ignore duplicate errors
    throw error
  }
}

export async function removeCustomStatus(userId: string, status: string): Promise<void> {
  let query = supabase.from('crm_custom_statuses').delete().eq('status', status)
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { error } = await query
  
  if (error) throw error
}

// Custom Sources
export async function listCustomSources(userId: string): Promise<string[]> {
  let query = supabase.from('crm_custom_sources').select('source')
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  return (data || []).map(d => d.source)
}

export async function addCustomSource(userId: string, source: string): Promise<void> {
  const { error } = await supabase
    .from('crm_custom_sources')
    .insert({
      id: randomUUID(),
      user_id: userId,
      source
    })
  
  if (error && error.code !== '23505') { // Ignore duplicate errors
    throw error
  }
}

export async function removeCustomSource(userId: string, source: string): Promise<void> {
  let query = supabase.from('crm_custom_sources').delete().eq('source', source)
  
  if (!ignoreUserScope()) {
    query = query.eq('user_id', userId)
  }
  
  const { error } = await query
  
  if (error) throw error
}
