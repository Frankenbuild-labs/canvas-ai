/**
 * OnlyOffice MCP Client
 * Wraps OnlyOffice document creation and editing capabilities
 */

export interface CreateDocumentOptions {
  type: "docx" | "xlsx" | "pptx" | "pdf"
  title: string
  template?: string
  content?: any
}

export interface EditDocumentOptions {
  documentId: string
  instruction: string
  section?: string
}

export interface InsertTableOptions {
  documentId: string
  rows: number
  columns: number
  data?: any[][]
  position?: string
}

export interface InsertChartOptions {
  documentId: string
  type: "bar" | "line" | "pie" | "scatter"
  data: {
    labels: string[]
    values: number[]
  }
  title?: string
}

export interface FormatOptions {
  documentId: string
  format: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    fontSize?: number
    color?: string
    alignment?: "left" | "center" | "right" | "justify"
  }
  range?: string
}

/**
 * OnlyOffice MCP Client
 * 
 * This wraps direct OnlyOffice API calls for programmatic document manipulation.
 * For now, it uses the existing lib/documents APIs, but will be converted to
 * a full MCP server in Phase 2.
 */
export class OnlyOfficeMCP {
  public baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  }

  async createDocument(options: CreateDocumentOptions): Promise<{ url: string; documentId: string }> {
    try {
      const response = await fetch(this.baseUrl + "/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: options.type,
          prompt: options.title,
          template: options.template,
          content: options.content,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        url: data.url,
        documentId: data.filename || data.url,
      }
    } catch (error) {
      console.error("[OnlyOfficeMCP] Error creating document:", error)
      throw error
    }
  }

  async editDocument(options: EditDocumentOptions): Promise<{ url: string }> {
    try {
      const response = await fetch(this.baseUrl + "/api/documents/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Failed to edit document: ${response.statusText}`)
      }

      const data = await response.json()
      return { url: data.url }
    } catch (error) {
      console.error("[OnlyOfficeMCP] Error editing document:", error)
      throw error
    }
  }

  async insertTable(options: InsertTableOptions): Promise<{ url: string }> {
    try {
      const response = await fetch(this.baseUrl + "/api/documents/insert-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Failed to insert table: ${response.statusText}`)
      }

      const data = await response.json()
      return { url: data.url }
    } catch (error) {
      console.error("[OnlyOfficeMCP] Error inserting table:", error)
      throw error
    }
  }

  async insertChart(options: InsertChartOptions): Promise<{ url: string }> {
    try {
      const response = await fetch(this.baseUrl + "/api/documents/insert-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Failed to insert chart: ${response.statusText}`)
      }

      const data = await response.json()
      return { url: data.url }
    } catch (error) {
      console.error("[OnlyOfficeMCP] Error inserting chart:", error)
      throw error
    }
  }

  async formatDocument(options: FormatOptions): Promise<{ url: string }> {
    try {
      const response = await fetch(this.baseUrl + "/api/documents/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Failed to format document: ${response.statusText}`)
      }

      const data = await response.json()
      return { url: data.url }
    } catch (error) {
      console.error("[OnlyOfficeMCP] Error formatting document:", error)
      throw error
    }
  }

  /**
   * Helper: Create a rental agreement from template
   */
  async createRentalAgreement(params: {
    tenant: string
    address: string
    rent: string
    term?: string
    deposit?: string
  }): Promise<{ url: string; documentId: string }> {
    return this.createDocument({
      type: "docx",
      title: `Rental Agreement - ${params.tenant}`,
      template: "rental_agreement",
      content: {
        tenant: params.tenant,
        address: params.address,
        rent: params.rent,
        term: params.term || "12 months",
        deposit: params.deposit || params.rent,
        date: new Date().toLocaleDateString(),
      },
    })
  }

  /**
   * Helper: Create a spreadsheet with data
   */
  async createSpreadsheetFromData(params: {
    title: string
    headers: string[]
    rows: any[][]
    charts?: any
    sheets?: Array<{ name: string; headers?: string[]; data?: any[][] }>
    formats?: Record<string, string>
    freeze?: { row?: number; column?: number }
    autoFilter?: boolean
    tableStyle?: string
    namedRanges?: Array<{ name: string; range: string }>
    summary?: boolean
  }): Promise<{ url: string; documentId: string }> {
    return this.createDocument({
      type: "xlsx",
      title: params.title,
      content: {
        headers: params.headers,
        data: params.rows,
        charts: params.charts,
        sheets: params.sheets,
        formats: params.formats,
        freeze: params.freeze,
        autoFilter: params.autoFilter,
        tableStyle: params.tableStyle,
        namedRanges: params.namedRanges,
        summary: params.summary,
      },
    })
  }

  /**
   * Helper: Create a presentation from outline
   */
  async createPresentation(params: {
    title: string
    slides: Array<{ title: string; bullets: string[] }>
    theme?: string
  }): Promise<{ url: string; documentId: string }> {
    return this.createDocument({
      type: "pptx",
      title: params.title,
      content: {
        slides: params.slides,
        theme: params.theme || "professional",
      },
    })
  }
}
