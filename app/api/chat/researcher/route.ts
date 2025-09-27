import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

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

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    const prompt = `You are a Research Agent specialized in finding, analyzing, and synthesizing information. Your role is to:

1. Conduct thorough research on topics
2. Analyze data and trends
3. Provide comprehensive insights
4. Cite sources and evidence
5. Present findings in a structured format

User query: ${message}`

    const result = await chat.sendMessage(prompt)
    const response = result.response.text()

    // Mock search results for secondary panel display
    const searchResults = {
      query: message,
      response: response,
      sources: [
        {
          title: "Research Analysis",
          url: "#",
          snippet: "Comprehensive research findings and analysis",
          favicon: "/favicon.ico",
        },
      ],
    }

    return NextResponse.json({
      message: response,
      searchResults,
    })
  } catch (error) {
    console.error("Researcher agent error:", error)
    return NextResponse.json({ error: "Failed to get response from researcher agent" }, { status: 500 })
  }
}
