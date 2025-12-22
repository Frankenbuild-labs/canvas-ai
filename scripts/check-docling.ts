import { DoclingMCP } from "../lib/mcp/docling-client"

async function main() {
  const client = new DoclingMCP()
  try {
    await client.connect()
    const tools = await client.listTools()
    console.log("Docling MCP connected. Tools available:", tools.map((tool) => tool.name))
  } finally {
    await client.disconnect()
  }
}

main().catch((error) => {
  console.error("Docling MCP health check failed:", error)
  process.exit(1)
})
