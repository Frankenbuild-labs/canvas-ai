#!/usr/bin/env node

/**
 * Test Executive Agent SSE Stream
 */

async function testExecutiveSSE() {
  const baseUrl = "http://localhost:3002"
  
  console.log("Testing Executive Agent SSE stream...\n")

  try {
    const response = await fetch(`${baseUrl}/api/chat/executive/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Create a simple document titled 'Test Document' with one paragraph saying hello",
        history: []
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("❌ Error response:", error)
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    console.log("✓ Connected to SSE stream\n")

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log("\n✓ Stream completed")
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        
        const eventMatch = line.match(/^event: (.+)$/m)
        const dataMatch = line.match(/^data: (.+)$/m)
        
        if (eventMatch && dataMatch) {
          const event = eventMatch[1]
          const data = JSON.parse(dataMatch[1])
          
          console.log(`[${event}]`, JSON.stringify(data, null, 2))
        }
      }
    }

    console.log("\n✅ Executive Agent SSE test passed!")
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message)
    process.exit(1)
  }
}

testExecutiveSSE()
