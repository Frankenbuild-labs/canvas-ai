import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json()

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const filteredHistory = history.filter((msg: any) => msg.sender !== "system")

    // Find the first user message index to ensure conversation starts with user
    const firstUserIndex = filteredHistory.findIndex((msg: any) => msg.sender === "user")

    // Only include history from the first user message onwards
    const validHistory = firstUserIndex >= 0 ? filteredHistory.slice(firstUserIndex) : []

    const chatHistory = validHistory.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }))

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    // Send the current message
    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      message: text,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Chat orchestrator error:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
