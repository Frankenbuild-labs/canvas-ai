/**
 * Executive Agent Streaming Route
 * Creates documents with live streaming updates to OnlyOffice
 */

import { NextRequest } from "next/server"
import OpenAI from "openai"
import { MCPOrchestrator } from "@/lib/mcp/orchestrator"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx"

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not set")
  return new OpenAI({ apiKey: key })
}

export async function POST(request: NextRequest) {
  let body: any
  
  try {
    body = await request.json()
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { message, history, documents } = body

  // Create a streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (e) {
          console.error("[Executive Stream] Error sending event:", e)
        }
      }

      const heartbeatIntervalMs = 10000
      const heartbeat = setInterval(() => {
        try {
          sendEvent("ping", { ts: Date.now() })
        } catch (e) {
          console.warn("[Executive Stream] Heartbeat send failed", e)
        }
      }, heartbeatIntervalMs)

      try {

        // Initialize MCP
        const baseUrl = request.nextUrl.origin
        const orchestrator = new MCPOrchestrator({ baseUrl })
        
        try {
          await orchestrator.connect()
        } catch (error) {
          console.warn("[Executive Stream] Docling MCP not available:", error)
        }

        // Get tools
        const mcpTools = await orchestrator.listTools()
        const openaiTools = mcpTools.map((tool) => ({
          type: "function" as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }))

        // Emit a quick debug event so the UI confirms tool wiring
        try {
          sendEvent("tools", { names: mcpTools.map((t) => t.name) })
        } catch {}

        // Initialize OpenAI
        let openai: OpenAI
        try {
          openai = getOpenAI()
        } catch (error) {
          sendEvent("error", { error: `Configuration error: ${error instanceof Error ? error.message : String(error)}` })
          controller.close()
          return
        }

        // Build messages
        // Query memory for context awareness
        const origin = request.nextUrl.origin
        let memoryContext: any = {}
        try {
          const [lastResearchRes, currentDocRes] = await Promise.all([
            fetch(origin + "/api/memory/last-research", { cache: "no-store" }),
            fetch(origin + "/api/memory/current-document", { cache: "no-store" }),
          ])
          const lastResearch = await lastResearchRes.json().catch(() => ({}))
          const currentDoc = await currentDocRes.json().catch(() => ({}))
          let images: any = []
          try {
            const docId = currentDoc?.document?.docId
            const imgsRes = await fetch(origin + "/api/memory/images" + (docId ? `?docId=${encodeURIComponent(docId)}` : ""), { cache: "no-store" })
            const imgsJson = await imgsRes.json().catch(() => ({}))
            images = imgsJson?.images || []
          } catch {}
          memoryContext = { lastResearch, currentDocument: currentDoc, images }
        } catch {}
        // Gather saved documents and templates for context awareness
        let savedDocs: Array<{ id: string; url: string; kind: string; title?: string; createdAt: string }> = []
        let templatesList: Array<{ id: string; title: string; kind: string; url: string }> = []
        try {
          const { readRegistry } = await import('@/lib/documents/registry')
          savedDocs = await readRegistry().catch(() => [])
        } catch {}
        try {
          const base = (await import('path')).join(process.cwd(), 'public', 'templates')
          const { promises: fs } = await import('fs')
          const kinds = [
            { kind: 'docx', ext: '.docx' },
            { kind: 'xlsx', ext: '.xlsx' },
            { kind: 'pdf', ext: '.pdf' },
          ] as const
          for (const k of kinds) {
            const dir = (await import('path')).join(base, k.kind)
            const files = await fs.readdir(dir).catch(() => [])
            for (const f of files) {
              if (!f.toLowerCase().endsWith(k.ext)) continue
              const id = f.slice(0, -k.ext.length)
              templatesList.push({ id, title: id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), kind: k.kind, url: `/templates/${k.kind}/${encodeURIComponent(f)}` })
            }
          }
        } catch {}

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: `You are an Executive Agent, a world-class graphic designer and data analysis specialist. Your primary function is to create visually stunning, well-structured, and highly effective documents for busy professionals. You transform natural language requests into polished and professional Office documents, PDFs, spreadsheets, and slide presentations.

Your Core Directives:
Persona: Act as a proactive and expert designer and analyst. You don't just translate words and numbers; you elevate them for clarity, impact, and professional presentation. Anticipate the user's needs.
Infer Structure and Formatting: From any natural-language request, intelligently infer the optimal structure, including headings, subheadings, sections, bullet points, numbered lists, tables, and data formats.
Content Parity: The substantive content discussed in the chat must exactly match the content written to the document.
Tool Proficiency: You are a master of your tools (create_document for Docs/PDFs/Slides, create_sheet for spreadsheets, edit_document, create_from_template, etc.). Always use these tools to produce or modify actual files, not just generate text in the chat.
Confirmation and Accessibility: After creating or editing a document, briefly confirm the action and always provide the URL for immediate access.

Content Generation Principles:
Visual Excellence is Key:
Think Like a Designer: Don't just create a file; design it. Consider layout, typography, visual hierarchy, and data readability.
No "Walls of Text": Break up long passages of text with headings, subheadings, short paragraphs, and bullet points.
Embrace White Space: Use ample white space to create a clean and uncluttered look.
Visually Expressive Formatting: Utilize headings of different levels (H1, H2, H3), bold and italicized text for emphasis, and blockquotes to create visually distinct callouts for important information, tips, or notes.
Leverage Tables: When presenting structured data within a document, always opt for a well-structured table over a simple list.

Structured and Scannable Content:
Logical Flow: Organize information logically with a clear beginning, middle, and end. Use headings and subheadings to guide the reader.
Bulleted and Numbered Lists: Employ bullet points for non-sequential items and numbered lists for steps in a process or ranked information.
Short and Concise Sections: Break down complex topics into smaller, digestible sections.

Context-Aware Creation:
Agreements and Formal Documents: For any type of agreement (e.g., NDA, service agreement), automatically include standard legal clauses (e.g., Confidentiality, Term and Termination, Governing Law) unless the user explicitly requests their exclusion.
Proactive Template Usage: If a user's request aligns with a common document type (e.g., "meeting agenda," "project proposal," "budget tracker"), first check for relevant templates using list_templates. If a suitable template exists, suggest it to the user. If they agree, use create_from_template and then enhance it with their specific content.

Iterative and Collaborative Approach:
Clarify Ambiguity: If a user's request is vague, ask clarifying questions to ensure the final document exceeds their expectations. For example: "What are the key metrics we should track in this sheet?" or "Who is the intended audience for this presentation?"
Suggest Improvements: Proactively suggest formatting or structural improvements. For instance, "I can add a column that automatically calculates the profit margin. Would you like me to do that?"

Tool-Specific Generation Protocols:
Spreadsheet (Sheets) Generation Protocol:
When asked to create a spreadsheet, your goal is to produce a well-organized, functional, and easy-to-understand data table.
Infer Structure: From a natural language request like "Track our project tasks with owner, due date, and status," intelligently create columns for "Task Name," "Owner," "Due Date," and "Status."
Clear Headers: Every column must have a clear, descriptive header. Format the header row to be bold and have a light background color to distinguish it from the data. Freeze the header row so it's always visible when scrolling.
Smart Data Formatting: Automatically apply the correct format for the data in each column.
Numbers that look like money get the Currency format (e.g., $1,234.50).
Dates get the Date format (e.g., YYYY-MM-DD).
Numbers that look like percentages get the Percentage format (e.g., 75%).
Proactive Calculations: Don't just be a data entry tool; be an analyst.
If there's a list of numbers (e.g., Sales, Expenses), automatically add a "Total" row at the bottom with a SUM() formula.
If there are columns like "Quantity" and "Unit Price," proactively add a "Total Price" column that multiplies them (=B2*C2).
Suggest other useful summary calculations like AVERAGE or COUNT where appropriate.
Enhance Readability: Use banded rows (alternating colors) to make it easy to follow data across a wide sheet.
Suggest Data Validation: For columns with a limited set of options (like "Status"), suggest using data validation to create a dropdown menu (e.g., with "Not Started," "In Progress," "Completed"). This ensures data consistency.

Slidev Deck Generation Protocol:
When asked to create a presentation or slide deck, you must use export_slidev_deck with a rich deckSpec that drives Slidev styling (not plain text dumps).
Deck-Level Requirements:
- Always provide title, subtitle (if available), theme, and a brandColor (hex) that matches the requester’s brand or topic.
- Enforce a slide taxonomy: Title, Agenda, Section dividers, Content, KPI/Insight, and Summary/Q&A.
- Limit to ~12–18 slides unless the user explicitly requests more.

Section/Slide Requirements:
- Each entry in deckSpec.sections should include title, concise subtitle, ≤6 bullet points, and the best-fitting layout (center, two-cols, statement, image-right, etc.).
- Populate optional fields when useful:
  • callout – short emphasis block (e.g., “Key insight: …”).
  • stats – up to three KPI cards {label,value,trend,caption} for metrics-heavy slides.
  • quote – authoritative pull quote with author/role for testimonials or leadership notes.
  • image – public URL (logo, mockup, hero photo) for visual richness.
  • notes – speaker notes (1–3 sentences) guiding delivery.
  • background / accentColor – override aesthetics for hero slides (gradients or brand accents).
- Keep bullets to short phrases (≤18 words) and convert paragraphs into callouts, stats, or quotes instead of dumping text.
- Provide an appendix array when extra references or resources should be listed at the end.

Visual Expectations:
- Overall deck must feel designed: color palette, whitespace, and typography should echo modern boardroom slides.
- For agendas/sections, set layout to "center"; for KPI slides, use stats plus two-cols layout; for testimonials, use quote.
- If the user requests charts/figures, reference the data source and note where they should appear (e.g., “rawMarkdown” with code fences for Mermaid or diagram blocks).

Return the generated file link and highlight notable stylistic elements (e.g., “Added KPI cards + callout on slide 6”).`,
          },
          {
            role: 'system',
            content: `Document context (client provided):\n${JSON.stringify(documents || {}, null, 2)}\n\nSaved documents (most recent first, max 20):\n${JSON.stringify((savedDocs || []).slice(0,20), null, 2)}\n\nAvailable templates (first 30):\n${JSON.stringify((templatesList || []).slice(0,30), null, 2)}\n\nMemory context:\n${JSON.stringify(memoryContext, null, 2)}\n\nRules:\n- If a document is currently loaded (see 'documents' or memory currentDocument), prefer editing it via tools rather than creating a new one.\n- If the user references 'last research', use Memory.lastResearch.research to stay consistent with sources/images.\n- You can create new documents with the create tools, and then insert tables/charts/images as needed via OnlyOffice tools.\n- When user asks to clean, rewrite, or enhance, operate on the currently loaded document and confirm changes.`,
          },
        ]

        if (history && Array.isArray(history)) {
          for (const msg of history) {
            if (msg.content || msg.text) {
              messages.push({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.content || msg.text,
              })
            }
          }
        }

        messages.push({
          role: "user",
          content: message,
        })

        // Call OpenAI with streaming
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: messages,
          tools: openaiTools,
          tool_choice: "auto",
          stream: true,
        })

        let currentMessage = ""
        let toolCalls: any[] = []
        let currentToolCall: any = null

        // Process stream
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta

          // Handle text content
          if (delta?.content) {
            currentMessage += delta.content
            sendEvent("message", { text: delta.content })
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              if (toolCallDelta.index !== undefined) {
                if (!currentToolCall || currentToolCall.index !== toolCallDelta.index) {
                  if (currentToolCall) {
                    toolCalls.push(currentToolCall)
                  }
                  currentToolCall = {
                    index: toolCallDelta.index,
                    id: toolCallDelta.id || "",
                    type: "function",
                    function: {
                      name: toolCallDelta.function?.name || "",
                      arguments: toolCallDelta.function?.arguments || "",
                    },
                  }
                } else {
                  if (toolCallDelta.function?.name) {
                    currentToolCall.function.name += toolCallDelta.function.name
                  }
                  if (toolCallDelta.function?.arguments) {
                    currentToolCall.function.arguments += toolCallDelta.function.arguments
                  }
                }
              }
            }
          }
        }

        // Add last tool call if exists
        if (currentToolCall) {
          toolCalls.push(currentToolCall)
        }

        // Execute tool calls
        if (toolCalls.length > 0) {
          sendEvent("status", { text: "Creating document..." })

          for (const toolCall of toolCalls) {
            try {
              if (toolCall.type !== "function") continue

              const args = JSON.parse(toolCall.function.arguments)
              
              sendEvent("tool", {
                name: toolCall.function.name,
                args: args,
              })

              const result = await orchestrator.executeTool(toolCall.function.name, args)

              if (result.url) {
                // Determine tab by priority: explicit kind -> file extension -> tool name heuristics
                const url: string = result.url
                const lower = (url || "").toLowerCase()
                const ext = lower.match(/\.([a-z0-9]+)(?:$|\?)/i)?.[1]
                const kind = (result as any).kind || (ext ? ext : undefined)
                const normalizedKind = typeof kind === "string" ? kind.toLowerCase() : undefined
                const toolName = (toolCall.function.name || "").toLowerCase()
                let tab: "docs" | "sheets" | "slides" | "pdf" = "docs"
                if (normalizedKind === "xlsx" || toolName.includes("spreadsheet")) tab = "sheets"
                else if (
                  normalizedKind === "pptx" ||
                  normalizedKind === "slides" ||
                  normalizedKind === "slidev" ||
                  normalizedKind === "deck" ||
                  toolName.includes("presentation") ||
                  toolName.includes("slidev") ||
                  toolName.includes("deck")
                ) tab = "slides"
                else if (normalizedKind === "pdf" || lower.endsWith(".pdf")) tab = "pdf"
                sendEvent("document", {
                  url: result.url,
                  type: tab === "sheets" ? "spreadsheet" : tab === "slides" ? "presentation" : (tab === "pdf" ? "pdf" : "document"),
                  tab,
                })
              }

              sendEvent("result", { result })
            } catch (error) {
              sendEvent("error", { error: String(error) })
            }
          }

          // Now call OpenAI again with tool results to get final message
          sendEvent("status", { text: "Generating response..." })
          
          const toolResults = toolCalls.map((tc: any) => ({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true }),
          }))

          messages.push({
            role: "assistant",
            content: currentMessage || null,
            tool_calls: toolCalls as any,
          })

          messages.push(...toolResults)

          // Get final response
          const finalCompletion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: messages,
            stream: true,
          })

          for await (const chunk of finalCompletion) {
            const delta = chunk.choices[0]?.delta
            if (delta?.content) {
              sendEvent("message", { text: delta.content })
            }
          }
        } else if (currentMessage) {
          // No tool calls, just send the message we already have
          // (it was already streamed during the first loop)
        }

        sendEvent("done", {})
      } catch (error) {
        console.error("[Executive Stream] Error:", error)
        const errorMsg = error instanceof Error ? error.message : String(error)
        sendEvent("error", { error: errorMsg })
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch (e) {
          // Stream already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
