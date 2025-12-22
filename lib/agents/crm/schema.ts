import { z } from "zod"

export const LeadsSearchInput = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  ids: z.array(z.string()).optional(),
})
export type LeadsSearchInput = z.infer<typeof LeadsSearchInput>

export const BulkUpdateInput = z.object({
  ids: z.array(z.string()).min(1),
  patch: z.object({
    status: z.string().optional(),
    source: z.string().optional(),
    value: z.number().optional(),
    notes: z.string().optional(),
  }).refine((obj) => Object.keys(obj).length > 0, { message: "patch must include at least one field" }),
})
export type BulkUpdateInput = z.infer<typeof BulkUpdateInput>

export const BulkDeleteInput = z.object({
  ids: z.array(z.string()).min(1),
})
export type BulkDeleteInput = z.infer<typeof BulkDeleteInput>

export const EmailDraftInput = z.object({
  ids: z.array(z.string()).min(1),
  purpose: z.string().optional(),
  tone: z.enum(["friendly", "formal"]).optional(),
})
export type EmailDraftInput = z.infer<typeof EmailDraftInput>

export const StatusSuggestInput = z.object({ id: z.string() })
export type StatusSuggestInput = z.infer<typeof StatusSuggestInput>

export const NotesSummarizeInput = z.object({ id: z.string(), notes: z.string().optional() })
export type NotesSummarizeInput = z.infer<typeof NotesSummarizeInput>

export type EmailDraft = { id: string; subject: string; body: string }

export const CreateLeadInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().min(1),
  position: z.string().optional(),
  status: z.string().optional(),
  value: z.number().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  lastContact: z.string().optional(),
})
export type CreateLeadInput = z.infer<typeof CreateLeadInput>

export const DedupeInput = z.object({})
export type DedupeInput = z.infer<typeof DedupeInput>

export const StatsEvaluateInput = z.object({})
export type StatsEvaluateInput = z.infer<typeof StatsEvaluateInput>

// Status list management (client supplies current + defaults)
export const StatusesAddInput = z.object({
  value: z.string().min(1),
  current: z.array(z.string()),
  defaults: z.array(z.string()).optional(),
})
export type StatusesAddInput = z.infer<typeof StatusesAddInput>

export const StatusesRemoveInput = z.object({
  value: z.string().min(1),
  current: z.array(z.string()),
  defaults: z.array(z.string()).optional(),
})
export type StatusesRemoveInput = z.infer<typeof StatusesRemoveInput>
