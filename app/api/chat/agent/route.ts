import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { Composio } from "@composio/core"
import { VercelProvider } from "@composio/vercel"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const composioApiKey = process.env.COMPOSIO_API_KEY

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Agent API called")
    const { message, history } = await request.json()
    console.log("[v0] Received message:", message)

    if (!message) {
      console.log("[v0] No message provided")
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (!process.env.GOOGLE_API_KEY) {
      console.log("[v0] Google API key missing")
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    if (!composioApiKey) {
      console.log("[v0] Composio API key missing")
      return NextResponse.json(
        {
          error: "Composio API key not configured. Please set COMPOSIO_API_KEY in your environment.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Starting agent generation process")

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const formattedHistory = history
      .filter((msg: any) => msg.content || msg.text) // Filter out empty messages
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content || msg.text }],
      }))
      .filter((msg: any, index: number) => {
        // Ensure conversation starts with user message
        if (index === 0 && msg.role !== "user") {
          return false
        }
        return true
      })

    // Initialize Composio for tool discovery
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider(),
    })

    // Step 1: Generate use case from agent idea
    const useCasePrompt = `
Based on this agent idea: "${message}"

Generate a concise, specific use case description that captures the core functionality and required actions. 
Focus on what the agent needs to DO, not what it is. Use action verbs and be specific about the domain.

Examples:
- Agent idea: "Customer support agent that handles refunds and tracks orders"
  Use case: "customer support automation and order management"

- Agent idea: "Social media manager that schedules posts on twitter"  
  Use case: "social media content scheduling and analytics"

- Agent idea: "Email marketing assistant for campaigns"
  Use case: "email campaign management and automation"

Generate only the use case description (2-4 words), no explanations.
    `

    const useCaseResult = await model.generateContent(useCasePrompt)
    const useCase = useCaseResult.response.text().trim()

    // Step 2: Discover required tools using COMPOSIO_SEARCH_TOOLS
    let discoveredTools: string[] = ["COMPOSIO"] // Default fallback tools

    try {
      // Get the search tools first
      const searchTools = await composio.tools.get("default", {
        tools: ["COMPOSIO_SEARCH_TOOLS"],
      })

      // Use AI to determine likely tools based on use case
      const toolSelectionPrompt = `
Based on this use case: "${useCase}"

Suggest 3-5 most relevant tool names for this use case. Consider tools like:
- GMAIL, OUTLOOK for email management
- TWITTER, FACEBOOK, INSTAGRAM for social media
- SHOPIFY, STRIPE for e-commerce
- SLACK, DISCORD for communication
- GITHUB for development
- CALENDAR for scheduling

Return only a comma-separated list of tool names. No explanations.
      `

      const toolSelectionResult = await model.generateContent(toolSelectionPrompt)
      const suggestedTools = toolSelectionResult.response
        .text()
        .split(",")
        .map((tool) => tool.trim())
        .filter((tool) => tool.length > 0)

      discoveredTools = [...new Set([...suggestedTools])]
    } catch (error: any) {
      console.warn("Tool discovery failed, using defaults:", error?.message || error)
    }

    // Step 3: Generate system prompt for the agent
    const systemPromptResult =
      await model.generateContent(`Create a focused system prompt for an AI agent with this idea: "${message}"

The agent will have access to these Composio tools: ${discoveredTools.join(", ")}

Requirements:
- Be specific about the agent's role and capabilities
- Explain what the agent can do with the available tools
- Mention specific use cases and workflows
- Keep it concise but comprehensive (2-3 sentences)
- Focus on helping the user effectively
- Don't mention technical details about the tools, focus on what the user can accomplish

Example format: "You are a [role] agent that helps users [main purpose]. You can [specific capabilities using tools] and [other capabilities]. Ask me what you'd like to accomplish and I'll help you get it done."

Generate only the system prompt text.`)

    // Step 4: Generate frontend code with working JavaScript
    const frontendPrompt = `
Create a complete, single-file HTML page for a modern AI chat interface based on this idea: "${message}"

**Non-Negotiable Requirements:**

1.  **HTML Structure:**
    *   The \`<body>\` must have \`display: flex; flex-direction: column; height: 100vh;\` to create a full-height container.
    *   A header \`<div class="chat-header">\` displaying the agent's name: "${message}".
    *   A message container \`<div class="chat-messages" id="chatMessages">\`.
    *   An initial message from the assistant welcoming the user.
    *   A message input form container \`<div class="chat-input-container">\`.
    *   The form must contain a \`<textarea id="chatInput">\` and a send \`<button id="sendButton">\`.

2.  **Styling (Inline CSS):**
    *   Create a modern, clean, responsive chat interface. Use a dark theme with a professional color palette.
    *   The styling **must** be fully contained within a \`<style>\` tag in the \`<head>\`. Do not use external stylesheets.
    *   **Layout CSS is critical:**
        *   \`body { display: flex; flex-direction: column; height: 100vh; margin: 0; }\`
        *   \`.chat-messages { flex-grow: 1; overflow-y: auto; padding: 20px; }\`
        *   \`.chat-input-container { display: flex; padding: 10px; border-top: 1px solid #333; }\`
    *   Include styles for user messages (e.g., blue background, right-aligned) and agent messages (e.g., gray background, left-aligned).
    *   Style the loading indicator and error messages to be clear and visually distinct.
    *   The textarea should be responsive (\`width: 100%\`) and auto-resize based on content.

3.  **JavaScript Logic (Inline Script):**
    *   All JavaScript must be within a single \`<script>\` tag at the end of the \`<body>\`.
    *   Define a constant for user ID only (API keys must NOT be exposed in the browser):
        \`\`\`javascript
        const USER_ID = "default";
        \`\`\`
    *   The script must get the following data, which is already embedded in this prompt:
        *   \`const DISCOVERED_TOOLS = ${JSON.stringify(discoveredTools)};\`
        *   \`const SYSTEM_PROMPT = ${JSON.stringify(systemPromptResult.response.text().replace(/"/g, '\\"'))};\`
    *   **The send button's \`onclick\` event must trigger a \`sendMessage\` function with the following behavior:**
        1.  It must read the text from the \`chatInput\` textarea.
        2.  It must display the user's message on the screen.
        3.  It must show a loading indicator while waiting for the response.
        4.  Inside the \`sendMessage\` function, it must define the base URL for API calls: \`const API_BASE_URL = window.location.origin;\`.
        5.  **It must send a POST request to \`\${API_BASE_URL}/integrations/api/execute-generated-agent\`**.
        6.  The request body **MUST** be a JSON object with this exact structure (do NOT include API keys):
            \`\`\`json
            {
              "prompt": "The user's message",
              "discoveredTools": DISCOVERED_TOOLS,
              "systemPrompt": SYSTEM_PROMPT,
              "userId": USER_ID
            }
            \`\`\`
        7.  It must handle the JSON response from the API, displaying either the agent's \`response\` text or the \`error\` and \`details\` if the call fails.
        8.  It must remove the loading indicator after the response is received.

Generate only the complete, single HTML file. Do not wrap it in markdown or provide any explanation.
    `

    const frontendResult = await model.generateContent(frontendPrompt)

    // Step 5: Generate backend code using the template structure
    const backendTemplate = `
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId = "default" } = await req.json();
    const composioApiKey = process.env.COMPOSIO_API_KEY;

    if (!composioApiKey || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Composio
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider(),
    });

    // Get tools for this agent - ${message}
    const tools = await composio.tools.get(userId, {
      tools: [${discoveredTools.map((tool) => `"${tool.toUpperCase()}"`).join(", ")}]
    });

    // System prompt for ${message}
    const systemPrompt = \`${systemPromptResult.response.text().replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate response using the agent
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\\n\\nUser: " + prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const text = result.response.text();
    console.log('Agent response:', text);
    
    return NextResponse.json({ 
      response: text,
      success: true,
      metadata: {
        toolsUsed: [${discoveredTools.map((tool) => `"${tool}"`).join(", ")}],
        useCase: "${useCase}",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute agent', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
}`

    // Return agent information for the documents panel
    const agentInfo = {
      frontend: frontendResult.response.text(),
      backend: backendTemplate,
      discoveredTools: discoveredTools,
      useCase: useCase,
      systemPrompt: systemPromptResult.response.text(),
      agentIdea: message,
      metadata: {
        toolCount: discoveredTools.length,
        generatedAt: new Date().toISOString(),
      },
    }

    console.log("[v0] Agent generation completed successfully")
    return NextResponse.json({
      message: `I've generated a custom AI agent for "${message}". The agent has been created with ${discoveredTools.length} specialized tools and is ready to use. You can interact with it in the documents panel.`,
      agentInfo,
    })
  } catch (error) {
    console.error("[v0] Agent generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate agent", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
