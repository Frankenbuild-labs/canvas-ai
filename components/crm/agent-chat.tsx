"use client"

import { useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type CrmAgentContext = {
  filter: string
  searchQuery: string
  selectedIds: string[]
  leads: any[]
}

type CrmAgentChatProps = {
  context: CrmAgentContext
  // Optional controls to allow the agent to update UI state
  onReplaceLeadsAction?: (leads: any[]) => void
  onClearSelectionAction?: () => void
  statuses?: string[]
  onStatusesChangeAction?: (statuses: string[]) => void
  defaultStatuses?: string[]
}

export default function CrmAgentChat({ context, onReplaceLeadsAction, onClearSelectionAction, statuses = [], onStatusesChangeAction, defaultStatuses = [] }: CrmAgentChatProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; content: string }>>([])
  const [busy, setBusy] = useState(false)
  // Local quick-create helpers
  const [newLead, setNewLead] = useState<{ name: string; email: string; company: string }>({ name: "", email: "", company: "" })
  const [applyStatus, setApplyStatus] = useState<string>("")
  const [statusToAdd, setStatusToAdd] = useState<string>("")
  const [statusToRemove, setStatusToRemove] = useState<string>("")

  const scrollRef = useRef<HTMLDivElement>(null)
  function scrollToBottom() {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }
  function streamAgentMessage(content: string) {
    // Simulated streaming: append text in chunks; compute index inside updater to avoid stale closure
    const chunkSize = Math.max(8, Math.floor(content.length / 30))
    let idx = 0
    let targetIndex: number | null = null
    const interval = setInterval(() => {
      idx += chunkSize
      const partial = content.slice(0, idx)
      setMessages((prev) => {
        // create target slot on first tick
        if (targetIndex === null) {
          targetIndex = prev.length
          return [...prev, { role: "agent", content: partial }]
        }
        const copy = [...prev]
        copy[targetIndex] = { role: "agent", content: partial }
        return copy
      })
      scrollToBottom()
      if (idx >= content.length) clearInterval(interval)
    }, 20)
  }

  function findLeadByName(query: string) {
    const q = query.toLowerCase()
    return context.leads.find((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
  }

  async function callTool(tool: string, input: any) {
    try {
      setBusy(true)
      const res = await fetch("/api/agents/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, input, leads: context.leads }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Tool call failed")
      return data.result
    } catch (e: any) {
      streamAgentMessage(`Error: ${e.message}`)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function callLLM(prompt: string) {
    try {
      setBusy(true)
      const res = await fetch("/api/agents/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, context }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(`LLM error ${res.status}${errText ? `: ${errText}` : ""}`)
      }
      const data = await res.json()
      return data.message as string
    } finally {
      setBusy(false)
    }
  }

  function extractActionAndProse(text: string): { action: null | { tool: string; input: any }; prose: string } {
    const re = /<action>([\s\S]*?)<\/action>/i
    const m = text.match(re)
    if (!m) return { action: null, prose: text }
    const jsonStr = m[1].trim()
    try {
      const obj = JSON.parse(jsonStr)
      const prose = (text.slice(0, m.index) + text.slice((m.index || 0) + m[0].length)).trim()
      return { action: obj, prose }
    } catch {
      return { action: null, prose: text }
    }
  }

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setMessages((prev) => [...prev, { role: "user", content: q }])
    setInput("")
    // Try LLM first; fallback to local intent parsing
    try {
      const llmText = await callLLM(q)
      const { action, prose } = extractActionAndProse(llmText || "")
      if (prose) streamAgentMessage(prose)
      if (action && action.tool) {
        const result = await callTool(action.tool, action.input)
        if (!result) return
        switch (action.tool) {
          case "leads.bulkUpdate": {
            if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
            if (onClearSelectionAction) onClearSelectionAction()
            const statusVal = action.input?.patch?.status
            streamAgentMessage(`Updated ${result.updated} lead(s)${statusVal ? ` to '${statusVal}'.` : "."}`)
            break
          }
          case "leads.bulkDelete": {
            if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
            if (onClearSelectionAction) onClearSelectionAction()
            streamAgentMessage(`Deleted ${result.deleted} lead(s).`)
            break
          }
          case "email.draft": {
            const txt = result.map((m: any) => `Subject: ${m.subject}\n\n${m.body}`).join("\n\n---\n\n")
            streamAgentMessage(txt)
            break
          }
          case "status.suggest": {
            streamAgentMessage(`Suggestion: ${result.suggestion}\nReason: ${result.rationale}`)
            break
          }
          case "notes.summarize": {
            streamAgentMessage(`Summary: ${result.summary}\n\nKey Points:\n- ${result.keyPoints.join("\n- ")}`)
            break
          }
          case "leads.create": {
            if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
            streamAgentMessage(`Created lead '${result.lead?.name ?? "(unknown)"}'.`)
            break
          }
          case "leads.dedupe": {
            if (!result.duplicates.length) streamAgentMessage("No duplicates found.")
            else {
              const lines = result.duplicates.map((d: any) => `${d.a.name} <${d.a.email}> ↔ ${d.b.name} <${d.b.email}> (${d.reason})`)
              streamAgentMessage(`Duplicates:\n- ${lines.join("\n- ")}`)
            }
            break
          }
          case "stats.evaluate": {
            const by = Object.entries(result.byStatus).map(([k, v]) => `${k}: ${v}`).join(", ")
            streamAgentMessage(`Total: ${result.total} | Pipeline: $${result.pipelineValue.toLocaleString()} | By status: ${by}`)
            break
          }
          case "statuses.add": {
            if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
            streamAgentMessage(`Added status.`)
            break
          }
          case "statuses.remove": {
            if (result.removed) {
              if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
              streamAgentMessage(`Removed status.`)
            } else {
              streamAgentMessage(result.reason || "Could not remove status.")
            }
            break
          }
          default: {
            // Show raw JSON for unknown tools
            streamAgentMessage(JSON.stringify(result, null, 2))
          }
        }
      }
    } catch (e: any) {
      // Silent fallback to local intent parsing without exposing provider error text
      await handleNaturalLanguage(q)
    }
  }

  async function handleNaturalLanguage(query: string) {
    const q = query.trim()
    // 0) How many ... (appointments, total leads, by status)
    let m = q.match(/^how\s+many\s+(.+?)(\s*(do\s+i|do\s+we|are\s+there).*)?$/i)
    if (m) {
      const termRaw = m[1].trim().toLowerCase()
      const result = await callTool("stats.evaluate", {})
      if (!result) return
      const total = result.total as number
      const byStatus = result.byStatus as Record<string, number>
      // Normalize term (strip plural s)
      const norm = termRaw.replace(/\bleads?\b/g, "leads").replace(/s\b/, "")
      // Total leads queries
      if (/(?:^|\b)(leads|lead)(?:\b|$)/.test(termRaw) && /total|all|have|count/.test(termRaw)) {
        return streamAgentMessage(`You have ${total} lead(s) in total.`)
      }
      // Specific status like "appointments"
      let statusKey = norm
      // Map common phrases to status names
      if (/(appointment|appointments)/.test(termRaw)) statusKey = "appointment"
      // If we have a statuses list, prefer the closest exact match
      const pool = (statuses ?? []).map((s) => s.toLowerCase())
      if (pool.length) {
        const exact = pool.find((s) => s === statusKey)
        if (exact) statusKey = exact
      }
      const count = byStatus[statusKey] ?? 0
      return streamAgentMessage(`You have ${count} ${statusKey}${count === 1 ? "" : "s"}.`)
    }
    // 1) Summarize notes for NAME
  m = q.match(/summariz(e|e the)\s+notes\s+(for|from)\s+(.+)/i)
    if (m) {
      const name = m[3].trim()
      const lead = findLeadByName(name)
      if (!lead) return streamAgentMessage(`I couldn't find a lead matching "${name}".`)
      const result = await callTool("notes.summarize", { id: lead.id, notes: lead.notes })
      if (result) return streamAgentMessage(`Summary: ${result.summary}\n\nKey Points:\n- ${result.keyPoints.join("\n- ")}`)
      return
    }

    // 2) Suggest status for NAME or selected
    m = q.match(/suggest\s+status(\s+for)?\s+(selected|.+)/i)
    if (m) {
      const target = m[2].trim()
      const id = target.toLowerCase() === "selected" && context.selectedIds[0]
      let leadId = id
      if (!leadId) {
        const lead = findLeadByName(target)
        if (!lead) return streamAgentMessage(`I couldn't find a lead matching "${target}".`)
        leadId = lead.id
      }
      const result = await callTool("status.suggest", { id: leadId })
      if (result) return streamAgentMessage(`Suggestion: ${result.suggestion}\nReason: ${result.rationale}`)
      return
    }

    // 3) Draft follow-up for NAME or selected
    m = q.match(/draft(\s+a)?\s+follow-?up(\s+email)?(\s+(for|to))?\s+(selected|.+)/i)
    if (m) {
      const target = m[5].trim()
      let ids: string[] = []
      if (target.toLowerCase() === "selected") {
        ids = context.selectedIds
      } else {
        const lead = findLeadByName(target)
        if (!lead) return streamAgentMessage(`I couldn't find a lead matching "${target}".`)
        ids = [lead.id]
      }
      if (ids.length === 0) return streamAgentMessage("Select one or more leads first.")
      const result = await callTool("email.draft", { ids })
      if (result) {
        const txt = result.map((m: any) => `Subject: ${m.subject}\n\n${m.body}`).join("\n\n---\n\n")
        return streamAgentMessage(txt)
      }
      return
    }

    // 4) Apply status X to selected
    m = q.match(/apply\s+status\s+([\w- ]+)\s+to\s+selected/i)
    if (m) {
      const statusVal = m[1].trim().toLowerCase()
      if (context.selectedIds.length === 0) return streamAgentMessage("Select one or more leads first.")
      const result = await callTool("leads.bulkUpdate", { ids: context.selectedIds, patch: { status: statusVal } })
      if (result) {
        if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
        if (onClearSelectionAction) onClearSelectionAction()
        return streamAgentMessage(`Updated ${result.updated} lead(s) to '${statusVal}'.`)
      }
      return
    }

    // 5) Delete selected
    if (/^(delete|remove)\s+selected$/i.test(q)) {
      if (context.selectedIds.length === 0) return streamAgentMessage("Select one or more leads first.")
      const result = await callTool("leads.bulkDelete", { ids: context.selectedIds })
      if (result) {
        if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
        if (onClearSelectionAction) onClearSelectionAction()
        return streamAgentMessage(`Deleted ${result.deleted} lead(s).`)
      }
      return
    }

    // 6) Dedupe scan
    if (/\b(dupe|dedupe|duplicates)\b/i.test(q)) {
      const result = await callTool("leads.dedupe", {})
      if (result) {
        if (!result.duplicates.length) return streamAgentMessage("No duplicates found.")
        const lines = result.duplicates.map((d: any) => `${d.a.name} <${d.a.email}> ↔ ${d.b.name} <${d.b.email}> (${d.reason})`)
        return streamAgentMessage(`Duplicates:\n- ${lines.join("\n- ")}`)
      }
      return
    }

    // 7) Pipeline stats
    if (/\b(pipeline|stats|summary)\b/i.test(q)) {
      const result = await callTool("stats.evaluate", {})
      if (result) {
        const by = Object.entries(result.byStatus).map(([k, v]) => `${k}: ${v}`).join(", ")
        return streamAgentMessage(`Total: ${result.total} | Pipeline: $${result.pipelineValue.toLocaleString()} | By status: ${by}`)
      }
      return
    }

    // 8) Add/Remove status
    m = q.match(/^add\s+status\s+(.+)/i)
    if (m) {
      const value = m[1].trim().toLowerCase()
      const result = await callTool("statuses.add", { value, current: statuses, defaults: defaultStatuses })
      if (result) {
        if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
        return streamAgentMessage(`Added status '${value}'.`)
      }
      return
    }
    m = q.match(/^remove\s+status\s+(.+)/i)
    if (m) {
      const value = m[1].trim().toLowerCase()
      const result = await callTool("statuses.remove", { value, current: statuses, defaults: defaultStatuses })
      if (result) {
        if (result.removed) {
          if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
          return streamAgentMessage(`Removed status '${value}'.`)
        }
        return streamAgentMessage(result.reason || `Could not remove '${value}'.`)
      }
      return
    }

    // Fallback
    return streamAgentMessage("I couldn't determine a specific action from that. Please be more specific.")
  }

  const quickCreateLead = async () => {
    const name = newLead.name.trim()
    const email = newLead.email.trim()
    const company = newLead.company.trim()
    if (!name || !email || !company) {
      setMessages((prev) => [...prev, { role: "agent", content: "Provide name, email, and company to create a lead." }])
      return
    }
    const result = await callTool("leads.create", { name, email, company })
    if (result) {
      setMessages((prev) => [...prev, { role: "agent", content: `Created lead '${result.lead.name}'.` }])
      if (onReplaceLeadsAction) onReplaceLeadsAction(result.leads)
      setNewLead({ name: "", email: "", company: "" })
    }
  }

  async function quickDedupeScan() {
    const result = await callTool("leads.dedupe", {})
    if (result) {
      if (!result.duplicates.length) {
        setMessages((prev) => [...prev, { role: "agent", content: "No duplicates found." }])
      } else {
        const lines = result.duplicates.map((d: any) => `${d.a.name} <${d.a.email}> ↔ ${d.b.name} <${d.b.email}> (${d.reason})`)
        setMessages((prev) => [...prev, { role: "agent", content: `Duplicates:\n- ${lines.join("\n- ")}` }])
      }
    }
  }

  async function quickPipelineStats() {
    const result = await callTool("stats.evaluate", {})
    if (result) {
      const by = Object.entries(result.byStatus).map(([k, v]) => `${k}: ${v}`).join(", ")
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: `Total: ${result.total} | Pipeline: $${result.pipelineValue.toLocaleString()} | By status: ${by}` },
      ])
    }
  }

  async function quickAddStatus() {
    const value = statusToAdd.trim()
    if (!value) return
    const result = await callTool("statuses.add", { value, current: statuses, defaults: [] })
    if (result) {
      setMessages((prev) => [...prev, { role: "agent", content: `Added status '${value}'.` }])
  if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
      setApplyStatus(value)
      setStatusToAdd("")
    }
  }

  async function quickRemoveStatus() {
    const value = statusToRemove.trim()
    if (!value) return
    const result = await callTool("statuses.remove", { value, current: statuses, defaults: defaultStatuses })
    if (result) {
      if (result.removed) {
        setMessages((prev) => [...prev, { role: "agent", content: `Removed status '${value}'.` }])
    if (onStatusesChangeAction) onStatusesChangeAction(result.statuses)
      } else {
        setMessages((prev) => [...prev, { role: "agent", content: result.reason || `Could not remove '${value}'.` }])
      }
      setStatusToRemove("")
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[92%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {busy && (
          <div className="text-left">
            <div className="inline-flex items-center gap-2 bg-muted rounded-2xl px-3 py-2 text-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the CRM Agent in natural language…"
            className="min-h-[48px] max-h-40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button onClick={send} disabled={busy} className="bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400">Send</Button>
        </div>
      </div>
    </Card>
  )
}
