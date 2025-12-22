export type Node = {
  id: string
  x: number
  y: number
  width: number
  height: number
  prompt: string
  imageUrl?: string
  isGenerating: boolean
}

export type Edge = {
  id: string
  from: string
  to: string
}

export type Frame = {
  id: string
  x: number
  y: number
  width: number
  height: number
  prompt: string
  imageUrl?: string
  isGenerating: boolean
}

export type ChatMessage = {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: number
  // Extended type so we can replicate original builder message kinds
  type?: "user" | "assistant" | "system" | "connection-status"
  // Optional richer metadata for agent (Roo) streaming classification & builder integration
  role?: "assistant" | "tool" | "system" | "reasoning" | "command" | "result"
  meta?: {
    eventType?: string // Original SSE event name (message, taskCreated, etc.)
    partial?: boolean
    taskId?: string
    askType?: string
    suggestions?: string[]
    raw?: any // raw parsed data payload
    // Builder-specific connection data
    toolkits?: Record<string, any>
  }
}
