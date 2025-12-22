/**
 * BrightData MCP Client
 * Connects to BrightData MCP server for web scraping and lead generation
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

export interface BrightDataSearchParams {
  keyword: string
  location?: string
  country?: string
  limit?: number
}

export interface BrightDataLead {
  name?: string
  title?: string
  company?: string
  location?: string
  email?: string
  phone?: string
  linkedin?: string
  [key: string]: any
}

export class BrightDataMCP {
  private client: Client
  private transport: StdioClientTransport | null = null
  private connected = false

  constructor() {
    this.client = new Client(
      {
        name: "canvasai-brightdata-client",
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
      const apiToken = process.env.BRIGHTDATA_API_TOKEN
      if (!apiToken) {
        throw new Error("BRIGHTDATA_API_TOKEN not set")
      }

      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["@brightdata/mcp"],
        env: {
          ...process.env,
          API_TOKEN: apiToken,
          PRO_MODE: "true", // Enable Pro mode for LinkedIn tools
        },
      })
      
      await this.client.connect(this.transport)
      this.connected = true
      console.log("[BrightDataMCP] Connected successfully")
    } catch (error) {
      console.error("[BrightDataMCP] Connection error:", error)
      throw new Error(`Failed to connect to BrightData MCP server: ${error}`)
    }
  }

  async disconnect() {
    if (!this.connected || !this.transport) return

    try {
      await this.client.close()
      this.connected = false
      console.log("[BrightDataMCP] Disconnected")
    } catch (error) {
      console.error("[BrightDataMCP] Disconnect error:", error)
    }
  }

  async listTools() {
    if (!this.connected) await this.connect()
    
    try {
      const result = await this.client.listTools()
      return result.tools
    } catch (error) {
      console.error("[BrightDataMCP] List tools error:", error)
      return []
    }
  }

  async searchLinkedInJobs(params: BrightDataSearchParams): Promise<BrightDataLead[]> {
    if (!this.connected) await this.connect()

    try {
      console.log('[BrightDataMCP] Starting scraping browser session for LinkedIn people search')
      
      // Build LinkedIn people search URL
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(params.keyword)}`
      console.log('[BrightDataMCP] Navigating to:', searchUrl)
      
      // Step 1: Navigate to LinkedIn search
      await this.client.callTool({
        name: "scraping_browser_navigate",
        arguments: { url: searchUrl }
      })
      
      console.log('[BrightDataMCP] Waiting for page to load...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
      
      // Step 2: Get page snapshot to see search results
      const snapshot = await this.client.callTool({
        name: "scraping_browser_snapshot",
        arguments: {}
      })
      
      console.log('[BrightDataMCP] Got page snapshot')
      
      // Step 3: Extract text content
      const contentResult = await this.client.callTool({
        name: "scraping_browser_get_text",
        arguments: {}
      })
      
      console.log('[BrightDataMCP] Raw content result:', JSON.stringify(contentResult, null, 2))
      
      // Parse the content to extract leads
      if (contentResult.content && Array.isArray(contentResult.content)) {
        const textContent = contentResult.content.find((c: any) => c.type === "text")
        if (textContent && textContent.text) {
          const pageText = textContent.text
          console.log('[BrightDataMCP] Page text length:', pageText.length)
          console.log('[BrightDataMCP] First 500 chars:', pageText.substring(0, 500))
          
          // For now, return a placeholder - we need to parse the actual HTML/text
          // This is just to verify the browser automation works
          return [{
            id: `lead_${Date.now()}`,
            name: 'Test Lead from Browser',
            title: 'Test Title',
            company: 'Test Company',
            location: params.location || 'Unknown',
            industry: params.keyword,
            email: null,
            phone: null,
            linkedin: null,
            source: 'brightdata-browser',
            confidence: 0.5,
            timestamp: new Date().toISOString(),
          }]
        }
      }

      return []
    } catch (error) {
      console.error('[BrightDataMCP] Search error:', error)
      throw error
    }
  }
}

// Singleton instance
let brightDataClient: BrightDataMCP | null = null

export function getBrightDataMCP(): BrightDataMCP {
  if (!brightDataClient) {
    brightDataClient = new BrightDataMCP()
  }
  return brightDataClient
}
