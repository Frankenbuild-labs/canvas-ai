import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1"

export async function POST(req: NextRequest) {
  try {

    const body = await req.json()
    const message = body?.message as string
    const rawContext = body?.context ?? {}
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    // Compact the client context to avoid token bloat
    const context = compactContext(rawContext)

    const systemPrompt = buildSystemPrompt(context)

    // Prefer OpenAI if key available; otherwise try Google; if provider fails and the other is available, fallback.
    const preferOpenAI = !!OPENAI_API_KEY
    let text: string | null = null
    let lastError: any = null

    if (preferOpenAI && OPENAI_API_KEY) {
      try {
        text = await callOpenAI(systemPrompt, message, OPENAI_API_KEY)
      } catch (e) {
        lastError = e
        // Fallback to Google if available
        if (GOOGLE_API_KEY) {
          try {
            text = await callGoogle(systemPrompt, message, GOOGLE_API_KEY)
          } catch (e2) {
            lastError = e2
          }
        }
      }
    } else if (GOOGLE_API_KEY) {
      try {
        text = await callGoogle(systemPrompt, message, GOOGLE_API_KEY)
      } catch (e) {
        lastError = e
        if (OPENAI_API_KEY) {
          try {
            text = await callOpenAI(systemPrompt, message, OPENAI_API_KEY)
          } catch (e2) {
            lastError = e2
          }
        }
      }
    }

    if (text == null) {
      const reason = !OPENAI_API_KEY && !GOOGLE_API_KEY ? "No API keys configured" : (lastError?.message || "Unknown LLM error")
      return NextResponse.json({ error: reason }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: text })
  } catch (err: any) {
    console.error("CRM chat error:", err)
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 })
  }
}

function compactContext(input: any) {
  try {
    const leads = Array.isArray(input?.leads)
      ? input.leads.slice(0, 200).map((l: any) => ({
          id: String(l.id ?? ""),
          name: String(l.name ?? ""),
          email: String(l.email ?? ""),
          company: String(l.company ?? ""),
          phone: l.phone ? String(l.phone) : undefined,
          status: l.status ? String(l.status) : undefined,
          value: typeof l.value === "number" ? l.value : undefined,
          source: l.source ? String(l.source) : undefined,
          notes: l.notes ? String(l.notes).slice(0, 500) : undefined,
        }))
      : []
    return {
      filter: input?.filter ?? "",
      searchQuery: input?.searchQuery ?? "",
      selectedIds: Array.isArray(input?.selectedIds) ? input.selectedIds.slice(0, 200) : [],
      statuses: Array.isArray(input?.statuses) ? input.statuses.slice(0, 100) : undefined,
      defaultStatuses: Array.isArray(input?.defaultStatuses) ? input.defaultStatuses.slice(0, 100) : undefined,
      leads,
    }
  } catch {
    return {}
  }
}

function buildSystemPrompt(context: any) {
  const tools = [
    `- leads.search: { query?: string; status?: string; source?: string; ids?: string[] }`,
    `- leads.bulkUpdate: { ids: string[]; patch: { status?: string; source?: string; value?: number; notes?: string } }`,
    `- leads.bulkDelete: { ids: string[] }`,
    `- email.draft: { ids: string[]; purpose?: string; tone?: 'friendly'|'formal' }`,
    `- status.suggest: { id: string }`,
    `- notes.summarize: { id: string; notes?: string }`,
    `- leads.create: { name: string; email: string; company: string; phone?: string; position?: string; status?: string; value?: number; source?: string; notes?: string; lastContact?: string }`,
    `- leads.dedupe: {}`,
    `- stats.evaluate: {}`,
    `- statuses.add: { value: string; current?: string[]; defaults?: string[] }`,
    `- statuses.remove: { value: string; current?: string[]; defaults?: string[] }`,
  ].join("\n")

  const actionExample = `<action>{"tool":"leads.bulkUpdate","input":{"ids":["1","2"],"patch":{"status":"qualified"}}}</action>`

  return [
    `You are the CRM Agent for a sales CRM. Your goals: help the user manage leads and keep responses concise, correct, and actionable.`,
    ``,
    `Output format:`,
    `1) If you plan to perform a tool action, output exactly ONE JSON action wrapped in <action>…</action>. Do not include additional JSON outside the block.`,
    `2) Optionally include brief natural language before/after the action, but only ONE <action> block total.`,
    `3) If no tool is needed, reply in plain text with helpful guidance.`,
    `4) If the user asks “how many <status>” (e.g., “how many appointments”), prefer stats.evaluate and report the count for that status from byStatus.`,
    ``,
    `Action JSON shape: { "tool": string, "input": object }` ,
    `Example:`,
    actionExample,
    ``,
    `Available tools:`,
    tools,
    ``,
    `Context (trimmed):`,
    '```json',
    JSON.stringify(context ?? {}, null, 2),
    '```',
  ].join("\n")
}

async function callOpenAI(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  async function doCall(model: string) {
    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`OpenAI error ${res.status}: ${errText}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === "string" ? content : JSON.stringify(content)
  }

  // Try requested model first; if it fails (e.g., unsupported on this endpoint), fallback to a compatible model.
  try {
    return await doCall(OPENAI_MODEL)
  } catch (e) {
    // Fallback to gpt-4o-mini which is widely available on chat completions
    return await doCall("gpt-4o-mini")
  }
}

async function callGoogle(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" })
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  })
  return result.response.text()
}
