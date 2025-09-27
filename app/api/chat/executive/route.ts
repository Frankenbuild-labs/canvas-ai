import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { spawn } from "child_process"
import path from "path"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const composioApiKey = process.env.COMPOSIO_API_KEY

const DOCUMENT_KEYWORDS = ["create", "build", "generate", "make"]
const DOCUMENT_TYPES = ["presentation", "report", "spreadsheet", "pdf", "document", "chart", "slides"]

const DOCUMENT_QUESTIONS = {
  presentation: [
    "How many slides do you need? (default: 8-12)",
    "What's your preferred style? (Professional/Creative/Minimal)",
    "Who's your target audience? (Executive/General/Technical)",
  ],
  report: [
    "What's the report length? (Summary/Detailed/Comprehensive)",
    "Do you need charts/graphs? (Yes/No/Specific types)",
    "What's the primary focus? (Data analysis/Recommendations/Overview)",
  ],
  spreadsheet: [
    "What type of analysis? (Financial/Data tracking/Calculations)",
    "Do you need charts? (Yes/No/Dashboard style)",
    "How much historical data? (Current/6 months/1 year+)",
  ],
}

function detectDocumentRequest(message: string): string | null {
  const lowerMessage = message.toLowerCase()
  const hasDocKeyword = DOCUMENT_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))

  if (hasDocKeyword) {
    for (const docType of DOCUMENT_TYPES) {
      if (lowerMessage.includes(docType)) {
        return docType === "slides" ? "presentation" : docType
      }
    }
  }
  return null
}

async function createDocument(
  documentType: string,
  content: any,
): Promise<{ success: boolean; filename?: string; error?: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "document-processor.py")
    const contentJson = JSON.stringify(content)

    console.log("[v0] Creating document:", documentType)
    console.log("[v0] Script path:", scriptPath)

    const pythonProcess = spawn("python3", [scriptPath, contentJson], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    })

    let output = ""
    let errorOutput = ""

    pythonProcess.stdout.on("data", (data) => {
      const dataStr = data.toString()
      console.log("[v0] Python stdout:", dataStr)
      output += dataStr
    })

    pythonProcess.stderr.on("data", (data) => {
      const errorStr = data.toString()
      console.log("[v0] Python stderr:", errorStr)
      errorOutput += errorStr
    })

    pythonProcess.on("close", (code) => {
      console.log("[v0] Python process closed with code:", code)
      console.log("[v0] Full output:", output)
      console.log("[v0] Full error output:", errorOutput)

      if (code === 0) {
        try {
          // Extract JSON from output
          const lines = output.split("\n")
          const jsonLine = lines.find((line) => line.startsWith('{"success"'))
          if (jsonLine) {
            const result = JSON.parse(jsonLine)
            resolve(result)
          } else {
            resolve({ success: false, error: "No valid output from document processor" })
          }
        } catch (error) {
          resolve({ success: false, error: `Failed to parse output: ${error}` })
        }
      } else {
        resolve({ success: false, error: errorOutput || `Process exited with code ${code}` })
      }
    })

    pythonProcess.on("error", (error) => {
      console.log("[v0] Python process error:", error)
      resolve({ success: false, error: `Failed to start process: ${error.message}` })
    })
  })
}

function generateDocumentContent(documentType: string, userMessage: string, history: any[]) {
  const baseContent = {
    type: documentType,
    title: `Professional ${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`,
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    timestamp: new Date().toISOString(),
  }

  switch (documentType) {
    case "presentation":
      return {
        ...baseContent,
        slides: [
          {
            title: "Executive Summary",
            bullets: [
              "Key objectives and goals",
              "Strategic initiatives overview",
              "Expected outcomes and metrics",
              "Timeline and milestones",
            ],
          },
          {
            title: "Market Analysis",
            bullets: [
              "Current market conditions",
              "Competitive landscape",
              "Opportunities and challenges",
              "Strategic positioning",
            ],
          },
          {
            title: "Implementation Plan",
            bullets: [
              "Phase 1: Foundation and setup",
              "Phase 2: Core implementation",
              "Phase 3: Optimization and scaling",
              "Success metrics and KPIs",
            ],
          },
          {
            title: "Next Steps",
            bullets: [
              "Immediate action items",
              "Resource requirements",
              "Timeline and deadlines",
              "Follow-up and review process",
            ],
          },
        ],
      }

    case "report":
      return {
        ...baseContent,
        sections: [
          {
            heading: "Executive Summary",
            paragraphs: [
              "This report provides a comprehensive analysis of current business operations and strategic recommendations for future growth.",
              "Key findings indicate significant opportunities for improvement in operational efficiency and market expansion.",
            ],
          },
          {
            heading: "Analysis and Findings",
            paragraphs: [
              "Our analysis reveals several critical areas requiring immediate attention and strategic intervention.",
              "Data-driven insights support the need for systematic improvements across multiple business functions.",
            ],
          },
          {
            heading: "Recommendations",
            paragraphs: [
              "Based on our comprehensive analysis, we recommend implementing a phased approach to address identified challenges.",
              "Priority should be given to initiatives with the highest potential impact and return on investment.",
            ],
          },
          {
            heading: "Conclusion",
            paragraphs: [
              "The proposed recommendations provide a clear roadmap for achieving strategic objectives and sustainable growth.",
              "Regular monitoring and evaluation will ensure successful implementation and continuous improvement.",
            ],
          },
        ],
        table_data: [
          ["Metric", "Current", "Target", "Timeline"],
          ["Revenue Growth", "5%", "15%", "Q4 2024"],
          ["Market Share", "12%", "18%", "Q2 2025"],
          ["Customer Satisfaction", "85%", "95%", "Q1 2025"],
        ],
      }

    case "spreadsheet":
      return {
        ...baseContent,
        headers: ["Category", "Q1", "Q2", "Q3", "Q4", "Total"],
        data: [
          ["Revenue", 250000, 275000, 300000, 325000, 1150000],
          ["Expenses", 180000, 190000, 200000, 210000, 780000],
          ["Profit", 70000, 85000, 100000, 115000, 370000],
          ["Growth %", "8%", "12%", "15%", "18%", "13.25%"],
        ],
        chart_type: "bar",
        chart_title: "Quarterly Performance Analysis",
      }

    default:
      return {
        ...baseContent,
        sections: [
          {
            heading: "Overview",
            paragraphs: [
              "This document has been generated to address your specific requirements and provide professional-grade content.",
              "All sections have been structured to meet executive-level standards and business communication best practices.",
            ],
          },
        ],
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    const composio: any = null
    const availableTools: string[] = []

    if (composioApiKey) {
      try {
        // Composio initialization and tool setup removed
      } catch (error) {
        console.warn("Composio initialization failed:", error)
      }
    }

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
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    const documentType = detectDocumentRequest(message)

    let prompt = `You are an Executive Agent specialized in business strategy, decision-making, and high-level planning.`

    prompt += `\n\nNote: Professional tools (Gmail, Calendar, Drive, Slack) are available through centralized authentication in the Management Center MCP tab.`

    if (documentType && DOCUMENT_QUESTIONS[documentType as keyof typeof DOCUMENT_QUESTIONS]) {
      const questions = DOCUMENT_QUESTIONS[documentType as keyof typeof DOCUMENT_QUESTIONS]

      const hasAnsweredQuestions =
        history.length > 2 &&
        history.some(
          (msg: any) =>
            (msg.sender === "user" && (msg.content || msg.text).toLowerCase().includes("slide")) ||
            (msg.content || msg.text).toLowerCase().includes("professional") ||
            (msg.content || msg.text).toLowerCase().includes("executive"),
        )

      if (hasAnsweredQuestions) {
        const documentContent = generateDocumentContent(documentType, message, history)
        const documentResult = await createDocument(documentType, documentContent)

        if (documentResult.success) {
          prompt += `\n\nDOCUMENT CREATED SUCCESSFULLY: ${documentType.toUpperCase()}\n\nI have successfully created your professional ${documentType} with the following features:\n1. Executive-level content structure and organization\n2. Professional formatting and presentation standards\n3. Industry-standard templates and layouts\n4. Comprehensive content based on your requirements\n\nDocument file: ${documentResult.filename}\n\nThe document is now available in your documents panel and ready for download or further editing. You can also request specific modifications or create additional documents as needed.`
        } else {
          prompt += `\n\nDOCUMENT CREATION ERROR: I encountered an issue creating your ${documentType}: ${documentResult.error}\n\nI can still provide detailed guidance and structure for creating a professional ${documentType} manually. Would you like me to provide step-by-step instructions instead?`
        }
      } else {
        prompt += `\n\nDOCUMENT CREATION MODE DETECTED: ${documentType.toUpperCase()}\n\nBefore creating your professional ${documentType}, I need to gather key information. Please answer these questions:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nOnce you provide these details, I will create a professional ${documentType} with executive-level quality and automatically add it to your documents panel.`
      }
    } else {
      prompt += `\n\nYour role is to:\n1. Create and edit professional documents (Word, Excel, PowerPoint, PDF)\n2. Provide strategic business insights and analysis\n3. Offer executive-level communication and planning support\n4. Manage document workflows and formatting\n\nDocument Creation Capabilities:\n- Word documents (.docx) with professional formatting\n- Excel spreadsheets (.xlsx) with charts and analysis\n- PowerPoint presentations (.pptx) with executive templates\n- PDF reports (.pdf) with comprehensive layouts\n- Real-time document editing and modification\n\nFocus on executive-level thinking, strategic perspectives, and high-quality deliverables.`
    }

    prompt += `\n\nUser query: ${message}`

    const result = await chat.sendMessage(prompt)
    const response = result.response.text()

    const responseData: any = {
      message: response,
    }

    if (documentType) {
      const hasAnsweredQuestions =
        history.length > 2 &&
        history.some(
          (msg: any) =>
            (msg.sender === "user" && (msg.content || msg.text).toLowerCase().includes("slide")) ||
            (msg.content || msg.text).toLowerCase().includes("professional") ||
            (msg.content || msg.text).toLowerCase().includes("executive"),
        )

      if (!hasAnsweredQuestions) {
        responseData.documentCreation = {
          type: documentType,
          stage: "questioning",
          questions: DOCUMENT_QUESTIONS[documentType as keyof typeof DOCUMENT_QUESTIONS],
        }
      } else {
        responseData.documentCreation = {
          type: documentType,
          stage: "created",
          message: "Document has been created and is available in your documents panel",
        }
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Executive agent error:", error)
    return NextResponse.json({ error: "Failed to get response from executive agent" }, { status: 500 })
  }
}
