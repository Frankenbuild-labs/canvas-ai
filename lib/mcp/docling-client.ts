/**
 * Docling MCP Client
 * Connects to Docling MCP server for document analysis and conversion
 */

import fs from "node:fs"
import path from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

export interface DoclingConvertOptions {
  url: string
  format?: "markdown" | "json" | "html" | "text" | "docling"
  ocr?: boolean
  images?: boolean
  tables?: boolean
}

export interface DoclingAnalysisResult {
  content: string
  metadata: {
    title?: string
    pages?: number
    format?: string
  }
  tables?: any[]
  images?: any[]
}

export class DoclingMCP {
  private client: Client
  private transport: StdioClientTransport | null = null
  private connected = false

  constructor() {
    this.client = new Client(
      {
        name: "canvasai-docling-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    )
  }

  async connect() {
    if (this.connected) return

    try {
      const allowedEnvKeys = [
        "PATH",
        "PATHEXT",
        "SYSTEMROOT",
        "WINDIR",
        "TEMP",
        "TMP",
        "HOME",
        "USERPROFILE",
        "HOMEDRIVE",
        "HOMEPATH",
        "NODE_ENV",
        "APPDATA",
        "LOCALAPPDATA",
        "UV_CACHE_DIR",
        "UV_PYTHON_INSTALL_DIR",
        "UV_TOOL_DIR",
      ]

      const sanitizedEnv: Record<string, string> = {}
      for (const key of allowedEnvKeys) {
        const value = process.env[key]
        if (typeof value === "string" && value.length > 0) {
          sanitizedEnv[key] = value
        }
      }

      const doclingWorkdir = path.join(process.cwd(), ".docling-runtime")
      if (!fs.existsSync(doclingWorkdir)) {
        fs.mkdirSync(doclingWorkdir, { recursive: true })
      }

      this.transport = new StdioClientTransport({
        command: "uvx",
        args: ["--from=docling-mcp", "docling-mcp-server"],
        env: sanitizedEnv,
        cwd: doclingWorkdir,
      })

      await this.client.connect(this.transport)
      this.connected = true
      console.log("[DoclingMCP] Connected successfully")
    } catch (error) {
      console.error("[DoclingMCP] Connection error:", error)
      throw new Error("Failed to connect to Docling MCP server")
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.client.close()
      this.transport = null
      this.connected = false
    }
  }

  async listTools() {
    if (!this.connected) await this.connect()

    try {
      const response = await this.client.listTools()
      return response.tools
    } catch (error) {
      console.error("[DoclingMCP] Error listing tools:", error)
      return []
    }
  }

  async convertDocument(options: DoclingConvertOptions): Promise<DoclingAnalysisResult> {
    if (!this.connected) await this.connect()

    try {
      const result: any = await this.client.callTool({
        name: "convert_document",
        arguments: {
          url: options.url,
          export_format: options.format || "markdown",
          ocr: options.ocr || false,
          export_images: options.images || false,
          export_tables: options.tables || false,
        },
      })

      // Parse the result
      const content = result.content?.[0]
      if (content?.type === "text") {
        return {
          content: content.text,
          metadata: {},
          tables: [],
          images: [],
        }
      }

      throw new Error("Unexpected response format from Docling")
    } catch (error) {
      console.error("[DoclingMCP] Error converting document:", error)
      throw error
    }
  }

  async extractTables(url: string): Promise<any[]> {
    if (!this.connected) await this.connect()

    try {
      const result: any = await this.client.callTool({
        name: "export_tables",
        arguments: { url },
      })

      const content = result.content?.[0]
      if (content?.type === "text") {
        return JSON.parse(content.text)
      }

      return []
    } catch (error) {
      console.error("[DoclingMCP] Error extracting tables:", error)
      return []
    }
  }

  async analyzeLayout(url: string): Promise<any> {
    if (!this.connected) await this.connect()

    try {
      const result: any = await this.client.callTool({
        name: "analyze_layout",
        arguments: { url },
      })

      const content = result.content?.[0]
      if (content?.type === "text") {
        return JSON.parse(content.text)
      }

      return null
    } catch (error) {
      console.error("[DoclingMCP] Error analyzing layout:", error)
      return null
    }
  }

  async translateDocument(url: string, targetLang: string): Promise<string> {
    if (!this.connected) await this.connect()

    try {
      const result: any = await this.client.callTool({
        name: "translate_document",
        arguments: {
          url,
          target_language: targetLang,
        },
      })

      const content = result.content?.[0]
      if (content?.type === "text") {
        return content.text
      }

      throw new Error("Translation failed")
    } catch (error) {
      console.error("[DoclingMCP] Error translating document:", error)
      throw error
    }
  }

  async extractImages(url: string): Promise<any[]> {
    if (!this.connected) await this.connect()

    try {
      const result: any = await this.client.callTool({
        name: "export_figures",
        arguments: { url },
      })

      const content = result.content?.[0]
      if (content?.type === "text") {
        return JSON.parse(content.text)
      }

      return []
    } catch (error) {
      console.error("[DoclingMCP] Error extracting images:", error)
      return []
    }
  }
}
