import { NextRequest, NextResponse } from "next/server"
import { BulkDeleteInput, BulkUpdateInput, CreateLeadInput, DedupeInput, EmailDraftInput, LeadsSearchInput, NotesSummarizeInput, StatsEvaluateInput, StatusSuggestInput, StatusesAddInput, StatusesRemoveInput } from "@/lib/agents/crm/schema"
import { emailDraft, leadsBulkDelete, leadsBulkUpdate, leadsCreate, leadsDedupe, leadsSearch, notesSummarize, statsEvaluate, statusSuggest, statusesAdd, statusesRemove } from "@/lib/agents/crm/tools"

// Note: For now, the client must supply a minimal leads snapshot in the request body
// so this route can operate without DB. Later, replace with service calls.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tool, input, leads, meta } = body as {
      tool: string
      input: unknown
      leads: any[]
      meta?: any
    }

    if (!tool || !leads) {
      return NextResponse.json({ error: "tool and leads are required" }, { status: 400 })
    }

    switch (tool) {
      case "leads.search": {
        const parsed = LeadsSearchInput.parse(input)
        const result = leadsSearch(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "leads.bulkUpdate": {
        const parsed = BulkUpdateInput.parse(input)
        const result = leadsBulkUpdate(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "leads.bulkDelete": {
        const parsed = BulkDeleteInput.parse(input)
        const result = leadsBulkDelete(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "email.draft": {
        const parsed = EmailDraftInput.parse(input)
        const result = emailDraft(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "leads.create": {
        const parsed = CreateLeadInput.parse(input)
        const result = leadsCreate(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "status.suggest": {
        const parsed = StatusSuggestInput.parse(input)
        const result = statusSuggest(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "notes.summarize": {
        const parsed = NotesSummarizeInput.parse(input)
        const result = notesSummarize(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "leads.dedupe": {
        const parsed = DedupeInput.parse(input ?? {})
        const result = leadsDedupe(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "stats.evaluate": {
        const parsed = StatsEvaluateInput.parse(input ?? {})
        const result = statsEvaluate(parsed, leads as any)
        return NextResponse.json({ ok: true, result })
      }
      case "statuses.add": {
        const parsed = StatusesAddInput.parse(input)
        const result = statusesAdd(parsed)
        return NextResponse.json({ ok: true, result })
      }
      case "statuses.remove": {
        const parsed = StatusesRemoveInput.parse(input)
        const result = statusesRemove(parsed)
        return NextResponse.json({ ok: true, result })
      }
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 400 })
  }
}
