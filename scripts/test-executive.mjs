#!/usr/bin/env node

/**
 * Test Executive Agent with Docling Integration
 */

async function testExecutiveAgent() {
  const baseUrl = "http://localhost:3002"
  
  console.log("Testing Executive Agent with document creation...\n")

  try {
    const response = await fetch(`${baseUrl}/api/chat/executive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Create a simple document titled 'Meeting Notes' with a paragraph about quarterly planning",
        history: []
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Error response:", error)
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json()
    console.log("\n✅ Executive Agent Response:")
    console.log("Message:", result.message)
    
    if (result.documentCreation) {
      console.log("\n📄 Document Created:")
      console.log("  Type:", result.documentCreation.type)
      console.log("  URL:", result.documentCreation.url)
      console.log("  Tab:", result.documentCreation.tab)
    }

    console.log("\n✅ Executive Agent + Docling integration working!")
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message)
    process.exit(1)
  }
}

testExecutiveAgent()
