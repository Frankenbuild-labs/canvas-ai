import { BulkDeleteInput, BulkUpdateInput, CreateLeadInput, DedupeInput, EmailDraft, EmailDraftInput, LeadsSearchInput, NotesSummarizeInput, StatsEvaluateInput, StatusSuggestInput, StatusesAddInput, StatusesRemoveInput } from "./schema"
import type { Lead } from "@/components/crm/lead-management"

// Simple in-memory lead accessors. Replace with real services later.
// We'll accept leads array via params to keep tools stateless.

export function leadsSearch(input: LeadsSearchInput, leads: Lead[]): Lead[] {
  const q = input.query?.toLowerCase().trim()
  let result = leads
  if (input.ids?.length) {
    const idSet = new Set(input.ids)
    result = result.filter((l) => idSet.has(l.id))
  }
  if (input.status) result = result.filter((l) => l.status === input.status)
  if (input.source) result = result.filter((l) => l.source === input.source)
  if (q) {
    result = result.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q),
    )
  }
  return result
}

export function leadsBulkUpdate(input: BulkUpdateInput, leads: Lead[]): { updated: number; leads: Lead[] } {
  const idSet = new Set(input.ids)
  let updated = 0
  const next = leads.map((l) => {
    if (idSet.has(l.id)) {
      updated++
      return { ...l, ...input.patch }
    }
    return l
  })
  return { updated, leads: next }
}

export function leadsBulkDelete(input: BulkDeleteInput, leads: Lead[]): { deleted: number; leads: Lead[] } {
  const idSet = new Set(input.ids)
  const before = leads.length
  const next = leads.filter((l) => !idSet.has(l.id))
  return { deleted: before - next.length, leads: next }
}

export function emailDraft(input: EmailDraftInput, leads: Lead[]): EmailDraft[] {
  const targets = new Set(input.ids)
  const subset = leads.filter((l) => targets.has(l.id))
  return subset.map((l) => ({
    id: l.id,
    subject: `Following up, ${l.name.split(" ")[0]}`,
    body: `Hi ${l.name.split(" ")[0]},\n\nI wanted to follow up on our recent conversation regarding ${l.company}. Let me know if you'd like to schedule an appointment or need any additional information.\n\nBest,\nYour Team`,
  }))
}

export function statusSuggest(input: StatusSuggestInput, leads: Lead[]): { suggestion: string; rationale: string } {
  const l = leads.find((x) => x.id === input.id)
  if (!l) return { suggestion: "new", rationale: "Lead not found; defaulting to 'new'." }
  if (l.notes.toLowerCase().includes("proposal")) return { suggestion: "proposal", rationale: "Notes mention a proposal." }
  if (l.notes.toLowerCase().includes("demo") || l.notes.toLowerCase().includes("call"))
    return { suggestion: "appointment", rationale: "Notes mention a call/demo—appointment recommended." }
  if (l.value > 50000 && l.status === "contacted")
    return { suggestion: "qualified", rationale: "High value lead that has been contacted." }
  return { suggestion: l.status, rationale: "No strong signal—keep current status." }
}

export function notesSummarize(input: NotesSummarizeInput, leads: Lead[]): { summary: string; keyPoints: string[] } {
  const l = leads.find((x) => x.id === input.id)
  const notes = input.notes ?? l?.notes ?? ""
  const trimmed = notes.trim()
  if (!trimmed) return { summary: "No notes available.", keyPoints: [] }
  const sentences = trimmed.split(/(?<=[.!?])\s+/).slice(0, 3)
  const keyPoints = sentences.map((s) => s.replace(/\s+/g, " "))
  return { summary: sentences.join(" "), keyPoints }
}

export function leadsCreate(input: CreateLeadInput, leads: Lead[]): { lead: Lead; leads: Lead[] } {
  const id = Date.now().toString()
  const createdAt = new Date().toISOString().split("T")[0]
  const defaultStatus = input.status ?? "new"
  const lead: Lead = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone ?? "",
    company: input.company,
    position: input.position ?? "",
    status: defaultStatus,
    value: input.value ?? 0,
    source: input.source ?? "Other",
    notes: input.notes ?? "",
    createdAt,
    lastContact: input.lastContact ?? createdAt,
  }
  return { lead, leads: [lead, ...leads] }
}

export function leadsDedupe(_input: DedupeInput, leads: Lead[]): { duplicates: Array<{ a: Lead; b: Lead; reason: string }> } {
  const dupes: Array<{ a: Lead; b: Lead; reason: string }> = []
  const byEmail = new Map<string, Lead>()
  for (const l of leads) {
    const key = l.email.toLowerCase()
    if (byEmail.has(key)) {
      dupes.push({ a: byEmail.get(key)!, b: l, reason: "Same email" })
    } else {
      byEmail.set(key, l)
    }
  }
  return { duplicates: dupes }
}

export function statsEvaluate(_input: StatsEvaluateInput, leads: Lead[]): {
  total: number
  byStatus: Record<string, number>
  pipelineValue: number
} {
  const total = leads.length
  const byStatus: Record<string, number> = {}
  let pipelineValue = 0
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1
    pipelineValue += l.value
  }
  return { total, byStatus, pipelineValue }
}

export function statusesAdd(input: StatusesAddInput): { statuses: string[] } {
  const set = new Set(input.current)
  set.add(input.value)
  return { statuses: Array.from(set) }
}

export function statusesRemove(input: StatusesRemoveInput): { statuses: string[]; removed: boolean; reason?: string } {
  const defaults = new Set(input.defaults ?? [])
  if (defaults.has(input.value)) {
    return { statuses: input.current, removed: false, reason: "Cannot remove a default status." }
  }
  const next = input.current.filter((s) => s !== input.value)
  const removed = next.length !== input.current.length
  return { statuses: next, removed }
}
