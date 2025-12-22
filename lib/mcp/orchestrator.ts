/**
 * MCP Orchestrator
 * Routes natural language requests to the appropriate MCP servers
 */

import { DoclingMCP } from "./docling-client"
import { OnlyOfficeMCP } from "./onlyoffice-client"
import { getStore } from "@/lib/memory/store"
import { now } from "@/lib/memory/fileStore"
import { v4 as uuidv4 } from "uuid"
import { renderAndPersistSlidev } from "@/lib/presentation/slidev/exporter"
import type { SlideDeckSpec } from "@/types/presentation"
// import { DocumentSearch } from "../documents/semantic-search" // Phase 3

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
  handler: (args: any) => Promise<any>
}

export interface MCPOrchestratorOptions {
  baseUrl?: string
  userId?: string
  sessionId?: string
}

export class MCPOrchestrator {
  private docling: DoclingMCP
  private onlyoffice: OnlyOfficeMCP
  // private search?: DocumentSearch // Phase 3
  private tools: MCPTool[] = []
  private userId: string
  private sessionId?: string

  constructor(options: MCPOrchestratorOptions = {}) {
    this.docling = new DoclingMCP()
    this.onlyoffice = new OnlyOfficeMCP(options.baseUrl)
    this.userId = options.userId || "anonymous"
    this.sessionId = options.sessionId
    // this.search = new DocumentSearch() // Phase 3

    this.registerTools()
  }

  private registerTools() {
    // DOCLING TOOLS (Analysis & Conversion)
    this.tools.push({
      name: "convert_document",
      description: "Convert a document from one format to another (PDF to Markdown, DOCX to JSON, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL or path to the document" },
          format: { type: "string", enum: ["markdown", "json", "html", "text"], description: "Output format" },
          ocr: { type: "boolean", description: "Enable OCR for scanned documents" },
        },
        required: ["url"],
      },
      handler: async (args) => {
        const result = await this.docling.convertDocument({
          url: args.url,
          format: args.format || "markdown",
          ocr: args.ocr || false,
        })
        return { content: result.content, metadata: result.metadata }
      },
    })

    this.tools.push({
      name: "extract_tables",
      description: "Extract all tables from a document (PDF, DOCX, XLSX)",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL or path to the document" },
        },
        required: ["url"],
      },
      handler: async (args) => {
        const tables = await this.docling.extractTables(args.url)
        return { tables }
      },
    })

    this.tools.push({
      name: "analyze_layout",
      description: "Analyze document layout, structure, and reading order",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL or path to the document" },
        },
        required: ["url"],
      },
      handler: async (args) => {
        const layout = await this.docling.analyzeLayout(args.url)
        return { layout }
      },
    })

    this.tools.push({
      name: "translate_document",
      description: "Translate a document to another language",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL or path to the document" },
          targetLang: { type: "string", description: "Target language code (e.g., 'es', 'fr', 'de')" },
        },
        required: ["url", "targetLang"],
      },
      handler: async (args) => {
        const translated = await this.docling.translateDocument(args.url, args.targetLang)
        return { translated }
      },
    })

    // ONLYOFFICE TOOLS (Creation & Editing)
    this.tools.push({
      name: "create_document",
      description: "Create a new Word document (.docx) with content. Prefer passing content.documentSpec for full-fidelity rendering.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Document title" },
          template: { type: "string", description: "Template name (rental_agreement, nda, invoice, etc.)" },
          content: {
            type: "object",
            description: "Document content and data. Preferred: { text?: string, documentSpec?: { title?: string, subtitle?: string, sections: Array<{ heading: string, body?: string, bullets?: string[], numbered?: string[], table?: { headers?: string[], rows: (string|number)[][] } }> } }",
            properties: {
              text: { type: "string", description: "Plain or markdown-ish body text (fallback)" },
              documentSpec: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string" },
                        body: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                        numbered: { type: "array", items: { type: "string" } },
                        table: {
                          type: "object",
                          properties: {
                            headers: { type: "array", items: { type: "string" } },
                            rows: {
                              type: "array",
                              items: { type: "array", items: { anyOf: [{ type: "string" }, { type: "number" }] } },
                            },
                          },
                        },
                      },
                      required: ["heading"],
                    },
                  },
                },
              },
            },
          },
        },
        required: ["title", "content"],
      },
      handler: async (args) => {
        const hasDocumentSpec = !!(args.content && typeof args.content === "object" && args.content.documentSpec)
        const hasText = typeof args.content?.text === "string" && args.content.text.trim().length > 0
        if (!hasDocumentSpec && !hasText) {
          throw new Error("create_document requires content.documentSpec or content.text with the full body to keep chat and OnlyOffice in sync.")
        }

        const result = await this.onlyoffice.createDocument({
          type: "docx",
          title: args.title,
          template: args.template,
          content: args.content,
        })
        return { url: result.url, documentId: result.documentId, message: "Document created successfully" }
      },
    })

    this.tools.push({
      name: "create_spreadsheet",
      description: "Create a new Excel spreadsheet (.xlsx) with rich structure (multiple sheets, formats, summary).",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Spreadsheet title" },
          headers: { type: "array", items: { type: "string" }, description: "Column headers for the main Data sheet" },
          data: { type: "array", items: { type: "array", items: { anyOf: [{ type: "string" }, { type: "number" }] } }, description: "Row data (array of arrays)" },
          columns: {
            type: "array",
            description: "Optional column metadata aligning with headers for formatting/validation",
            items: {
              type: "object",
              properties: {
                header: { type: "string", description: "Header this column spec applies to" },
                key: { type: "string" },
                width: { type: "number" },
                type: { type: "string", enum: ["text", "date", "currency", "percent", "number"] },
                format: { type: "string", description: "Excel number format string" },
                options: { type: "array", items: { type: "string" }, description: "Dropdown options for validation" },
                formula: { type: "string", description: "Optional formula applied to the column (structured references recommended)" },
                colorRules: {
                  type: "array",
                  description: "Conditional formatting rules",
                  items: {
                    type: "object",
                    properties: {
                      match: {
                        type: "object",
                        properties: {
                          mode: { type: "string", enum: ["equals", "contains", "expression"], default: "equals" },
                          value: { type: ["string", "number"] },
                          formula: { type: "string" },
                        },
                      },
                      style: {
                        type: "object",
                        properties: {
                          fill: { type: "string", description: "Hex color e.g. #FDE68A" },
                          fontColor: { type: "string" },
                          bold: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
              required: ["header"],
            },
          },
          sheets: {
            type: "array",
            description: "Optional additional sheets to create",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                headers: { type: "array", items: { type: "string" } },
                data: { type: "array", items: { type: "array", items: { anyOf: [{ type: "string" }, { type: "number" }] } } },
              },
            },
          },
          formats: {
            type: "object",
            description: "Column formats by header, e.g. { Date: 'yyyy-mm-dd', Price: '$#,##0.00', Volume: '#,##0' }",
            additionalProperties: { type: "string" },
          },
          instructions: {
            type: "object",
            description: "Instructions sheet content",
            properties: {
              sheetName: { type: "string" },
              title: { type: "string" },
              overview: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
              tips: { type: "array", items: { type: "string" } },
            },
          },
          settings: {
            type: "array",
            description: "Settings sheet entries (key/value with optional named ranges)",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                namedRange: { type: "string" },
              },
            },
          },
          freeze: { type: "object", properties: { row: { type: "number" }, column: { type: "number" } } },
          autoFilter: { type: "boolean", description: "Apply auto-filter on header row" },
          tableStyle: { type: "string", description: "Excel table style name, e.g. 'TableStyleMedium9'" },
          namedRanges: { type: "array", items: { type: "object", properties: { name: { type: "string" }, range: { type: "string" } }, required: ["name", "range"] } },
          summary: {
            description: "Summary sheet instructions. Boolean true keeps legacy stats; object enables smart dashboard.",
            anyOf: [
              { type: "boolean" },
              {
                type: "object",
                properties: {
                  sheetName: { type: "string" },
                  statusField: { type: "string" },
                  statusValues: { type: "array", items: { type: "string" } },
                  ownerField: { type: "string" },
                  metrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        formula: { type: "string" },
                      },
                      required: ["label", "formula"],
                    },
                  },
                },
              },
            ],
          },
          charts: {
            type: "array",
            description: "Chart requests (will prepare data regions; actual chart insertion may be deferred to editor)",
            items: { type: "object", properties: { type: { type: "string" }, sheet: { type: "string" }, title: { type: "string" }, x: { type: "string" }, ys: { type: "array", items: { type: "string" } } } },
          },
        },
        required: ["title", "headers", "data"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.createSpreadsheetFromData({
          title: args.title,
          headers: args.headers,
          rows: args.data,
          charts: args.charts,
          sheets: args.sheets,
          formats: args.formats,
          freeze: args.freeze,
          autoFilter: args.autoFilter,
          tableStyle: args.tableStyle,
          namedRanges: args.namedRanges,
          summary: args.summary,
        })
        return { url: result.url, documentId: result.documentId, message: "Spreadsheet created successfully" }
      },
    })

    this.tools.push({
      name: "create_presentation",
      description: "Create a new PowerPoint presentation (.pptx) with slides",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Presentation title" },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
              },
            },
            description: "Slide content",
          },
          theme: { type: "string", description: "Presentation theme" },
        },
        required: ["title", "slides"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.createPresentation({
          title: args.title,
          slides: args.slides,
          theme: args.theme,
        })
        return { url: result.url, documentId: result.documentId, message: "Presentation created successfully" }
      },
    })

    this.tools.push({
      name: "export_slidev_deck",
      description: "Render a Slidev presentation deck to PDF (default) or PNG slides. Provide either deckSpec or raw Slidev markdown.",
      inputSchema: {
        type: "object",
        properties: {
          markdown: { type: "string", description: "Full Slidev markdown string. Include frontmatter + slide sections." },
          deckSpec: {
            type: "object",
            description: "Structured slide deck spec. Provide title + sections with bullet points or raw markdown blocks.",
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              theme: { type: "string" },
              brandColor: { type: "string", description: "Hex color used as the primary accent (e.g. #0ea5e9)." },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    points: { type: "array", items: { type: "string" } },
                    rawMarkdown: { type: "string" },
                    layout: { type: "string" },
                    className: { type: "string" },
                    background: { type: "string", description: "CSS color/gradient background override." },
                    accentColor: { type: "string", description: "Per-slide accent color override." },
                    image: { type: "string", description: "Public URL for hero/illustration image." },
                    callout: { type: "string", description: "Short emphasis block rendered as info box." },
                    notes: { type: "string", description: "Speaker notes for the slide." },
                    stats: {
                      type: "array",
                      description: "KPI cards for the slide (max 3 recommended).",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          value: { type: "string" },
                          trend: { type: "string", enum: ["up", "down", "flat"] },
                          caption: { type: "string" },
                        },
                      },
                    },
                    quote: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        author: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
              appendix: { type: "array", items: { type: "string" } },
            },
          },
          format: { type: "string", enum: ["pdf", "png"], description: "Export format. PDF produces a single multi-page file; PNG exports slide images." },
          slug: { type: "string", description: "Optional slug/friendly identifier used in output filename." },
          publicPathPrefix: { type: "string", description: "Override the public path prefix for generated assets (default /exports)." },
        },
      },
      handler: async (args) => {
        if (!args.markdown && !args.deckSpec) {
          throw new Error("Provide either markdown or deckSpec to export a Slidev deck")
        }
        const format: "pdf" | "png" = args.format === "png" ? "png" : "pdf"
        const result = await renderAndPersistSlidev({
          markdown: args.markdown,
          deckSpec: args.deckSpec as SlideDeckSpec | undefined,
          format,
          slug: args.slug,
          publicPathPrefix: args.publicPathPrefix,
        })
        return {
          url: result.url,
          path: result.path,
          markdown: result.markdown,
          format: result.format,
          kind: "slidev",
          message: `Slidev deck exported as ${result.format.toUpperCase()}`,
        }
      },
    })

    this.tools.push({
      name: "create_rental_agreement",
      description: "Create a rental agreement document with tenant details",
      inputSchema: {
        type: "object",
        properties: {
          tenant: { type: "string", description: "Tenant name" },
          address: { type: "string", description: "Property address" },
          rent: { type: "string", description: "Monthly rent amount" },
          term: { type: "string", description: "Lease term (e.g., '12 months')" },
          deposit: { type: "string", description: "Security deposit amount" },
          content: {
            type: "object",
            description: "Optional rich content. Prefer content.documentSpec with all clauses.",
            properties: {
              documentSpec: { type: "object" },
              text: { type: "string" },
            },
          },
        },
        required: ["tenant", "address", "rent"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.createRentalAgreement(args)
        return { url: result.url, documentId: result.documentId, message: "Rental agreement created successfully" }
      },
    })

    this.tools.push({
      name: "insert_table",
      description: "Insert a table into an existing document",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Document ID" },
          rows: { type: "number", description: "Number of rows" },
          columns: { type: "number", description: "Number of columns" },
          data: { 
            type: "array", 
            items: { 
              type: "array",
              items: { type: "string" }
            }, 
            description: "Table data (array of arrays)" 
          },
        },
        required: ["documentId", "rows", "columns"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.insertTable(args)
        return { url: result.url, message: "Table inserted successfully" }
      },
    })

    this.tools.push({
      name: "insert_chart",
      description: "Insert a chart/graph into an existing document",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Document ID" },
          type: { type: "string", enum: ["bar", "line", "pie", "scatter"], description: "Chart type" },
          data: {
            type: "object",
            properties: {
              labels: { type: "array", items: { type: "string" } },
              values: { type: "array", items: { type: "number" } },
            },
          },
          title: { type: "string", description: "Chart title" },
        },
        required: ["documentId", "type", "data"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.insertChart(args)
        return { url: result.url, message: "Chart inserted successfully" }
      },
    })

    // EDIT EXISTING DOCUMENT (DOCX preferred; others may create a new version)
    this.tools.push({
      name: "edit_document",
      description: "Edit or enhance the currently open document. Provide clear natural-language instructions.",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Document identifier or URL (prefer the currently loaded document)" },
          instruction: { type: "string", description: "Edit instructions, e.g., 'Clean up wording and add a summary section'" },
          section: { type: "string", description: "Optional target section or heading to focus on" },
        },
        required: ["documentId", "instruction"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.editDocument({
          documentId: args.documentId,
          instruction: args.instruction,
          section: args.section,
        })
        return { url: result.url, message: "Document edited successfully" }
      },
    })

    // FORMAT EXISTING DOCUMENT/SPREADSHEET (MVP)
    this.tools.push({
      name: "format_document",
      description: "Apply basic formatting to a loaded document (MVP: spreadsheet ranges).",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Document identifier or URL (prefer the currently loaded document)" },
          format: {
            type: "object",
            properties: {
              bold: { type: "boolean" },
              italic: { type: "boolean" },
              underline: { type: "boolean" },
              fontSize: { type: "number" },
              color: { type: "string" },
              alignment: { type: "string", enum: ["left", "center", "right", "justify"] },
            },
          },
          range: { type: "string", description: "Range spec like 'A1:D1' (primarily for spreadsheets)" },
        },
        required: ["documentId"],
      },
      handler: async (args) => {
        const result = await this.onlyoffice.formatDocument({
          documentId: args.documentId,
          format: args.format || {},
          range: args.range,
        })
        return { url: result.url, message: "Formatting applied" }
      },
    })

    // TEMPLATES: list available templates from public/templates via API
    this.tools.push({
      name: "list_templates",
      description: "List available document templates (docx, xlsx, pdf, pptx) with categories and preview info.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category id to filter (e.g., 'business', 'legal', 'marketing')" },
          limit: { type: "number", description: "Max number of templates to return" },
        },
      },
      handler: async (args) => {
        const res = await fetch((this.onlyoffice as any).baseUrl + "/api/templates", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to list templates: ${res.status}`)
        const data = await res.json()
        let templates = Array.isArray(data?.templates) ? data.templates : []
        if (args?.category) templates = templates.filter((t: any) => t.category === args.category)
        if (args?.limit && Number.isFinite(args.limit)) templates = templates.slice(0, Math.max(0, args.limit))
        return { categories: data?.categories || [], templates }
      },
    })

    // CREATE FROM TEMPLATE: open a template file directly in OnlyOffice (or generate from mapped id)
    this.tools.push({
      name: "create_from_template",
      description: "Create/open a document from a template. Provide either templateUrl (preferred) or template id.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title to display in editor and registry (if generated)" },
          templateUrl: { type: "string", description: "Public URL to the template under /templates/..." },
          templateId: { type: "string", description: "Known template id (e.g., 'nda', 'invoice', 'budget-planner')" },
          kind: { type: "string", enum: ["docx", "xlsx", "pdf", "pptx"], description: "File kind if templateUrl is provided" },
          content: { type: "object", description: "Optional content/documentSpec for immediate population after open" },
        },
        required: [],
      },
      handler: async (args) => {
        // Runtime validation to replace removed JSON Schema anyOf combinator
        const hasUrl = !!args.templateUrl
        const hasId = !!args.templateId
        if (!hasUrl && !hasId) {
          throw new Error("Provide either templateUrl+kind or templateId")
        }
        if (hasUrl && !args.kind) {
          throw new Error("When templateUrl is provided, kind is required (docx|xlsx|pdf|pptx)")
        }
        const payload: any = {
          prompt: args.title || "Untitled",
        }
        if (args.templateUrl) {
          payload.kind = args.kind
          payload.templateUrl = args.templateUrl
          if (args.content) payload.content = args.content
        } else if (args.templateId) {
          payload.template = args.templateId
          if (args.content) payload.content = args.content
        }
        const res = await fetch((this.onlyoffice as any).baseUrl + "/api/documents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Failed to create from template: ${res.status}`)
        const data = await res.json()
        // Try to infer kind from provided args or URL
        const url: string = data?.url
        const inferredKind: string | undefined = args?.kind || (typeof url === 'string' && url.match(/\.([a-z0-9]+)(?:$|\?)/i)?.[1])
        return { url, kind: (inferredKind || "docx").toLowerCase() }
      },
    })

    // SAVED DOCUMENTS: search registry
    this.tools.push({
      name: "search_saved_documents",
      description: "Search saved documents by title substring and/or kind.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Title substring or id/url fragment to match" },
          kind: { type: "string", enum: ["docx", "xlsx", "pdf", "pptx"], description: "Optional file kind filter" },
          limit: { type: "number", description: "Max number of results" },
        },
      },
      handler: async (args) => {
        const res = await fetch((this.onlyoffice as any).baseUrl + "/api/documents/registry", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to read registry: ${res.status}`)
        const data = await res.json()
        const items: any[] = Array.isArray(data?.items) ? data.items : []
        const q = (args?.query || "").toLowerCase()
        let filtered = items.filter((it) => {
          const s = `${it.title || ""} ${it.id || ""} ${it.url || ""}`.toLowerCase()
          const okQ = q ? s.includes(q) : true
          const okK = args?.kind ? it.kind === args.kind : true
          return okQ && okK
        })
        if (args?.limit && Number.isFinite(args.limit)) filtered = filtered.slice(0, Math.max(0, args.limit))
        return { results: filtered }
      },
    })

    // SAVED DOCUMENTS: open a specific saved document
    this.tools.push({
      name: "open_saved_document",
      description: "Open a saved document given its id or URL.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Document filename/id from registry" },
          url: { type: "string", description: "Direct URL of the saved document" },
        },
        required: [],
      },
      handler: async (args) => {
        // Runtime validation to enforce id OR url
        if (!args.id && !args.url) {
          throw new Error("Provide either id or url")
        }
        const res = await fetch((this.onlyoffice as any).baseUrl + "/api/documents/registry", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to read registry: ${res.status}`)
        const data = await res.json()
        const items: any[] = Array.isArray(data?.items) ? data.items : []
        let item = null as any
        if (args?.id) item = items.find((it) => it.id === args.id)
        if (!item && args?.url) item = items.find((it) => it.url === args.url)
        if (!item && args?.url) {
          // If not in registry, still return URL with inferred kind
          const ext = String(args.url).toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/i)?.[1]
          return { url: args.url, kind: (ext || "docx").toLowerCase() }
        }
        if (!item) throw new Error("Document not found")
        return { url: item.url, kind: item.kind, title: item.title || item.id }
      },
    })

    // MEMORY TOOLS (SuperMemory-style minimal set)
    this.tools.push({
      name: "search_memories",
      description: "Search user memories by query string with optional kind/containerTags filters.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Query text to search for" },
          kind: { type: "string", description: "Optional memory kind filter (note, research, document, image, edit, file, open)" },
          limit: { type: "number", description: "Max number of results (default 100)" },
          containerTags: { type: "array", items: { type: "string" }, description: "Optional tags for grouping/filtering" },
        },
        required: ["q"],
      },
      handler: async (args) => {
        const results = await getStore().search({
          userId: this.userId,
          q: String(args.q || ""),
          kind: args.kind,
          containerTags: Array.isArray(args.containerTags) ? args.containerTags : undefined,
          limit: Number.isFinite(args.limit) ? Number(args.limit) : 100,
        } as any)
        return { results }
      },
    })

    this.tools.push({
      name: "add_memory",
      description: "Add a memory entry (defaults to note).",
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string", description: "Memory kind (note, research, image, document, edit, file, open)", default: "note" },
          text: { type: "string", description: "Text content (for note/research)" },
          title: { type: "string", description: "Optional title (for note/document)" },
          metadata: { type: "object", description: "Optional metadata object" },
          containerTags: { type: "array", items: { type: "string" }, description: "Optional grouping tags" },
        },
        required: ["text"],
      },
      handler: async (args) => {
        const entry: any = {
          id: uuidv4(),
          kind: (args.kind || "note").toLowerCase(),
          userId: this.userId,
          sessionId: this.sessionId,
          timestamp: now(),
          containerTags: Array.isArray(args.containerTags) ? args.containerTags : undefined,
          metadata: args.metadata && typeof args.metadata === "object" ? args.metadata : undefined,
        }
        if (entry.kind === "note" || entry.kind === "research") {
          entry.title = args.title || undefined
          entry.text = String(args.text || "")
        } else if (entry.kind === "document") {
          entry.title = args.title || undefined
          entry.docId = args.docId || undefined
          entry.url = args.url || undefined
        } else if (entry.kind === "image") {
          entry.url = args.url || undefined
          entry.caption = args.title || undefined
        }
        await getStore().append(entry)
        return { ok: true, id: entry.id }
      },
    })

    this.tools.push({
      name: "fetch_memory",
      description: "Fetch a specific memory by id (searches recent entries for the user).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Memory id" },
        },
        required: ["id"],
      },
      handler: async (args) => {
        const items = await getStore().list({ userId: this.userId, limit: 1000 })
        const found = items.find((e: any) => e.id === args.id)
        if (!found) return { found: false }
        return { found: true, memory: found }
      },
    })
  }

  /**
   * Get all available tools for the LLM to choose from
   */
  async listTools(): Promise<MCPTool[]> {
    return this.tools
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.find((t) => t.name === name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }

    console.log(`[MCPOrchestrator] Executing tool: ${name}`, args)

    try {
      const result = await tool.handler(args)
      return result
    } catch (error) {
      console.error(`[MCPOrchestrator] Error executing tool ${name}:`, error)
      throw error
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeTools(toolCalls: Array<{ name: string; arguments: any }>): Promise<any[]> {
    const results: any[] = []

    for (const call of toolCalls) {
      try {
        const result = await this.executeTool(call.name, call.arguments)
        results.push(result)
      } catch (error) {
        results.push({ error: String(error) })
      }
    }

    return results
  }

  /**
   * Initialize connections to MCP servers
   */
  async connect() {
    try {
      await this.docling.connect()
      console.log("[MCPOrchestrator] Connected to Docling MCP")
    } catch (error) {
      console.error("[MCPOrchestrator] Failed to connect to Docling:", error)
    }
  }

  /**
   * Cleanup connections
   */
  async disconnect() {
    await this.docling.disconnect()
  }
}
