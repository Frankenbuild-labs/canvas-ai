import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const formattedHistory = history
      .filter((msg: any) => msg.content || msg.text)
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content || msg.text }],
      }))
      .filter((msg: any, index: number) => {
        if (index === 0 && msg.role !== "user") {
          return false
        }
        return true
      })

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    const vibePrompt = `You are Vibe, a creative digital experience agent specializing in modern web design, user experience, and creative problem-solving.

Your expertise includes:
- Modern web design and UI/UX principles
- Creative digital experiences and interactive design
- Brand identity and visual aesthetics
- User experience optimization
- Creative problem-solving and innovative solutions

You help users with creative projects, design decisions, and building engaging digital experiences. You provide thoughtful, creative advice and can discuss design trends, color theory, typography, and user experience best practices.

User request: ${message}

Respond with creative insights and practical advice.`

    const result = await chat.sendMessage(vibePrompt)
    const response = result.response.text()

    return NextResponse.json({
      message: response,
    })
  } catch (error) {
    console.error("Vibe agent error:", error)
    return NextResponse.json(
      {
        message: "I'm currently experiencing technical difficulties. Please try again in a moment.",
      },
      { status: 500 },
    )
  }
}
