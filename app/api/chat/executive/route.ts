/**
 * Executive Agent Route - MCP Version
 * Clean implementation using Docling + OnlyOffice MCP tools
 * 
 * BEFORE: 1132 lines of regex hell 😱
 * AFTER: ~200 lines of clean MCP code ✨
 */

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { MCPOrchestrator } from "@/lib/mcp/orchestrator"

// Initialize OpenAI
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env and restart the server.")
  }
  return new OpenAI({ apiKey: key })
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    // Validate environment
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Set OPENAI_API_KEY in .env and restart the dev server." },
        { status: 500 }
      )
    }

    // Initialize MCP Orchestrator
    const baseUrl = request.nextUrl.origin
    const orchestrator = new MCPOrchestrator({ baseUrl })

    try {
      await orchestrator.connect()
    } catch (error) {
      console.warn("[Executive] Could not connect to Docling MCP (analysis features will be limited):", error)
    }

    // Get available MCP tools
    const mcpTools = await orchestrator.listTools()

    // Convert MCP tools to OpenAI function format
    const openaiTools = mcpTools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))

    // Initialize OpenAI
    const openai = getOpenAI()

    // Format history for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an Executive Agent specialized in document creation, editing, and analysis.

Natural language in — professionally formatted documents out. Users never need to specify markdown or structure explicitly: you infer it.

Capabilities
- Document Creation (OnlyOffice): create_document, create_spreadsheet, create_presentation, create_rental_agreement, insert_table, insert_chart
- Document Analysis (Docling): convert_document, extract_tables, analyze_layout, translate_document

Critical rules for creation
1) From any natural-language request, infer sections, headings, lists, tables, and emphasis automatically.
2) When you create a document, include the full, final content INSIDE the tool call using content.documentSpec (preferred) or content.text (fallback).
3) Your chat reply must mirror exactly what is written to the document (content parity).
4) Use clear hierarchy, strong headings, bullets, callouts/notes, and tasteful color emphasis where useful.
5) For agreements/policies, include common clauses unless the user says otherwise (e.g., Rent, Term, Deposit, Utilities, Pets, Late Fees, Termination, Signatures).
6) Always return the document URL and offer follow-up edits.

Examples (users provide plain English; you infer structure):
• Rental agreement → create_rental_agreement with content.documentSpec including Parties, Terms, Deposit, and Signatures.
• Quarterly revenue sheet → create_spreadsheet with headers/data, formats (currency), freeze header, autoFilter, Summary sheet.
• Presentation → create_presentation with slide titles and bullets inferred from the topic.

Be natural: don't explain tools to users; just use them and provide links.`,
      },
    ]

    // Add history
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

    // Add current message
    messages.push({
      role: "user",
      content: message,
    })

    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: messages,
      tools: openaiTools,
      tool_choice: "auto",
    })

    const assistantMessage = completion.choices[0].message

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("[Executive] Tool calls detected:", assistantMessage.tool_calls)

      // Execute all tool calls
      const toolResults = []
      let lastDocumentCreation: any = null

      for (const toolCall of assistantMessage.tool_calls) {
        try {
          // Type guard for function tool calls
          if (toolCall.type !== "function") continue

          const args = JSON.parse(toolCall.function.arguments)
          const toolResult = await orchestrator.executeTool(toolCall.function.name, args)
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify(toolResult),
          })

          // Track document creation for UI
          if (toolCall.function.name.startsWith("create_") && toolResult.url) {
            const typeMap: Record<string, string> = {
              create_document: "document",
              create_spreadsheet: "spreadsheet",
              create_presentation: "presentation",
              create_rental_agreement: "document",
            }

            const tabMap: Record<string, string> = {
              create_document: "docs",
              create_spreadsheet: "sheets",
              create_presentation: "slides",
              create_rental_agreement: "docs",
            }

            const mappedType = typeMap[toolCall.function.name]
            if (mappedType) {
              lastDocumentCreation = {
                type: mappedType,
                stage: "created",
                url: toolResult.url,
                tab: tabMap[toolCall.function.name] || "docs",
              }
            }
          }
        } catch (error) {
          console.error(`[Executive] Error executing tool:`, error)
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify({ error: String(error) }),
          })
        }
      }

      // Continue chat with tool results
      messages.push(assistantMessage)
      messages.push(...toolResults)

      const followUpCompletion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: messages,
      })

      const finalText = followUpCompletion.choices[0].message.content || "Done!"

      // Return with document creation info if applicable
      const responseData: any = { message: finalText }

      if (lastDocumentCreation) {
        responseData.documentCreation = lastDocumentCreation
      }

      return NextResponse.json(responseData)
    }

    // No tool calls - just return text response
    return NextResponse.json({ message: assistantMessage.content || "I'm here to help with documents!" })
  } catch (error) {
    console.error("[Executive] Error:", error)
    return NextResponse.json({ error: "Failed to get response from executive agent" }, { status: 500 })
  }
}
