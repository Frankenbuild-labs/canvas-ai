"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Star,
  Paperclip,
  Send,
  PanelRightOpen,
  PanelLeftOpen,
  LoaderCircle,
  X,
  Layers,
  Search,
  Briefcase,
  FileText,
  Terminal,
  Brain,
} from "lucide-react"
import ChatMessage from "./chat-message"
import ResearchProgress from "./research-progress"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { ThemeToggle } from "../theme-toggle"
import ThemeAwareLogo from "../theme-aware-logo"
import { cn } from "@/lib/utils"
import { useArchagent } from "@/hooks/use-archagent"
// Pegasus integration removed


type ChatAreaProps = {
  isLeftPanelOpen: boolean
  toggleLeftPanelAction: () => void
  isRightPanelOpen: boolean
  toggleRightPanelAction: () => void
  isSecondaryPanelOpen: boolean
  toggleSecondaryPanelAction: () => void
  isDocumentsPanelOpen: boolean
  toggleDocumentsPanelAction: () => void
  isSandboxContainerOpen: boolean
  toggleSandboxContainerAction: () => void
  isVibeBuilderOpen: boolean
  toggleVibeBuilderAction: () => void
}

// Pegasus context removed
export default function ChatArea(props: ChatAreaProps) { return <ChatAreaInner {...props} /> }

function ChatAreaInner({
  isLeftPanelOpen,
  toggleLeftPanelAction,
  isRightPanelOpen,
  toggleRightPanelAction,
  isSecondaryPanelOpen,
  toggleSecondaryPanelAction,
  isDocumentsPanelOpen,
  toggleDocumentsPanelAction,
  isSandboxContainerOpen,
  toggleSandboxContainerAction,
  isVibeBuilderOpen,
  toggleVibeBuilderAction,
}: ChatAreaProps) {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: "initial-message",
      sender: "ai",
      text: "Hello! I am Metatron. How can I help you today?",
      timestamp: Date.now(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const cameraPreviewRef = useRef<HTMLVideoElement>(null)
  const screenPreviewRef = useRef<HTMLVideoElement>(null)

  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [showResearchProgress, setShowResearchProgress] = useState(false)
  const openedSecondaryForResearchRef = useRef(false)
  // Roo (vibe) integration state
  const [rooTaskId, setRooTaskId] = useState<string | null>(null)
  const [rooAwaitingFollowup, setRooAwaitingFollowup] = useState(false)
  const [rooSuggestions, setRooSuggestions] = useState<string[]>([])
  const [rooConfig, setRooConfig] = useState<{ model: string; temperature: string; autoApprove: boolean } | null>(null)
  // Track Documents panel context so Executive agent always knows what's open
  const [documentsContext, setDocumentsContext] = useState<{ activeTab?: 'docs' | 'sheets' | 'pdf' | 'slides'; docsUrl?: string; sheetsUrl?: string; pdfUrl?: string; slidesUrl?: string }>({})
  
  // Archagent integration (used when activeAgent === 'agent')
  const archagent = useArchagent({ autoConnect: false })

  // Builder (Vibe original) integration states
  const [generatedCode, setGeneratedCode] = useState<any>(null)
  const [isGeneratingBuilder, setIsGeneratingBuilder] = useState(false)
  const [toolkitInfos, setToolkitInfos] = useState<Record<string, any>>({})
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({})
  const [credentialCollection, setCredentialCollection] = useState<{
    isCollecting: boolean
    toolkitSlug: string
    authType: "oauth2" | "api_key"
    credentials: { clientId?: string; clientSecret?: string; apiKey?: string }
  } | null>(null)
  const [isCheckingConnections, setIsCheckingConnections] = useState(false)

  // Global error handlers to prevent page refresh
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[GLOBAL] Unhandled promise rejection:", event.reason)
      event.preventDefault()
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(), sender: 'ai', text: `❌ Unhandled error: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`, timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsTyping(false)
    }
    const handleError = (event: ErrorEvent) => {
      console.error("[GLOBAL] Unhandled error:", event.error)
      event.preventDefault()
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(), sender: 'ai', text: `❌ Error: ${event.error instanceof Error ? event.error.message : String(event.error)}`, timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsTyping(false)
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Connect to archagent when agent mode is selected
  useEffect(() => {
    if (activeAgent === 'agent' && archagent.status === 'idle') {
      archagent.connect()
    }
  }, [activeAgent, archagent.status, archagent.connect])

  // Merge archagent messages into the chat
  useEffect(() => {
    if (activeAgent === 'agent') {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = archagent.messages.filter(m => !existingIds.has(m.id))
        return [...prev, ...newMessages]
      })
      setIsTyping(archagent.isStreaming)
    }
  }, [activeAgent, archagent.messages, archagent.isStreaming])



  // Fetch Roo config on mount & when agent switches to vibe
  useEffect(() => {
    if (activeAgent === 'vibe') {
      fetch('/api/chat/roo/config').then(r => r.ok ? r.json(): null).then(data => {
        if (data) setRooConfig({ model: data.model, temperature: data.temperature, autoApprove: !!data.autoApprove })
      }).catch(() => {})
    }
  }, [activeAgent])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Listen for builder generation completion/errors and reproduce original left-pane outputs
  useEffect(() => {
    const onGenerated = (e: Event) => {
      const detail: any = (e as CustomEvent).detail
      const code = detail || {}
      setGeneratedCode(code)
      // Success message with features + system capabilities (from original)
      const featuresList = (code.discoveredTools || [])
        .map((tool: string) => `• ${tool.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}`)
        .join('\n')
      const success: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `Great! I've created your "${code.useCase}" agent. Here's what I built:\n\n**Features:**\n${featuresList}\n\n**System Capabilities:**\n• Frontend interface with input fields for API keys and prompts\n• Backend AI agent powered by Vercel AI SDK\n• Integration with ${(code.discoveredTools || []).length} Composio tools\n• Real-time response streaming\n\nThe agent is now ready for testing on the right side!`,
        timestamp: Date.now(),
        type: 'assistant'
      }
      setMessages(prev => [...prev, success])
      if (code.discoveredTools && code.discoveredTools.length > 0) {
        checkToolkitConnections(code.discoveredTools)
      }
      setIsTyping(false)
    }
    const onError = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message || 'Generation failed'
      const aiMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `❌ ${msg}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
      setIsGeneratingBuilder(false)
    }
    window.addEventListener('lovable:generated', onGenerated as EventListener)
    window.addEventListener('lovable:error', onError as EventListener)
    return () => {
      window.removeEventListener('lovable:generated', onGenerated as EventListener)
      window.removeEventListener('lovable:error', onError as EventListener)
    }
  }, [])

  // Listen for document panel events to keep context current
  useEffect(() => {
    const onActiveTab = (e: Event) => {
      const { tab } = (e as CustomEvent<{ tab: 'docs' | 'sheets' | 'pdf' | 'slides' }>).detail || ({} as any)
      if (!tab) return
      setDocumentsContext((prev) => ({ ...prev, activeTab: tab }))
    }
    const onLoadUrl = (e: Event) => {
      const { tab, url } = (e as CustomEvent<{ tab: 'docs' | 'sheets' | 'pdf' | 'slides'; url: string }>).detail || ({} as any)
      if (!tab || !url) return
      setDocumentsContext((prev) => ({
        ...prev,
        [tab === 'docs' ? 'docsUrl' : tab === 'sheets' ? 'sheetsUrl' : tab === 'pdf' ? 'pdfUrl' : 'slidesUrl']: url,
      }))
    }
    const onCreated = (e: Event) => {
      const { tab, url } = (e as CustomEvent<{ tab: 'docs' | 'sheets' | 'pdf' | 'slides'; url: string }>).detail || ({} as any)
      if (!tab || !url) return
      setDocumentsContext((prev) => ({
        ...prev,
        activeTab: tab,
        [tab === 'docs' ? 'docsUrl' : tab === 'sheets' ? 'sheetsUrl' : tab === 'pdf' ? 'pdfUrl' : 'slidesUrl']: url,
      }))
    }
    window.addEventListener('documentsActiveTabChanged', onActiveTab as EventListener)
    window.addEventListener('documentsLoadUrl', onLoadUrl as EventListener)
    window.addEventListener('documentCreated', onCreated as EventListener)
    return () => {
      window.removeEventListener('documentsActiveTabChanged', onActiveTab as EventListener)
      window.removeEventListener('documentsLoadUrl', onLoadUrl as EventListener)
      window.removeEventListener('documentCreated', onCreated as EventListener)
    }
  }, [])

  const stopStream = (stream: MediaStream | null, setter: (stream: MediaStream | null) => void) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setter(null)
    }
  }

  const handleCameraToggle = async () => {
    if (cameraStream) {
      stopStream(cameraStream, setCameraStream)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        setCameraStream(stream)
      } catch (err) {
        console.error("Error accessing camera:", err)
      }
    }
  }

  const handleScreenShareToggle = async () => {
    if (screenStream) {
      stopStream(screenStream, setScreenStream)
    } else {
      try {
        // Simplified constraints to avoid TS property issues; can enhance later.
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false } as any)
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenStream(null)
        })
        setScreenStream(stream)
      } catch (err) {
        console.error("Error accessing screen share:", err)
      }
    }
  }

  const handleResearcherClick = () => {
    setActiveAgent(activeAgent === "researcher" ? null : "researcher")
  }

  const handleExecutiveClick = () => {
    setActiveAgent(activeAgent === "executive" ? null : "executive")
  }

  const handleVibeClick = () => {
    const next = activeAgent === "vibe" ? null : "vibe"
    setActiveAgent(next)
    // Auto-open the Vibe Builder panel when activating Vibe agent
    if (next === "vibe") {
      if (!isVibeBuilderOpen) {
        try { toggleVibeBuilderAction() } catch {}
      }
    } else {
      // When leaving Vibe, close builder to reduce clutter
      if (isVibeBuilderOpen) {
        try { toggleVibeBuilderAction() } catch {}
      }
    }
  }

  // Pegasus agent toggle removed

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isTyping) return

    // Handle archagent mode
    if (activeAgent === 'agent') {
      archagent.sendPrompt(prompt)
      setPrompt("")
      return
    }

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      sender: "user",
      text: prompt,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
    const currentPrompt = prompt
    setPrompt("")
    setIsTyping(true)

    // Vibe integration (restore original builder chat semantics inside our chat UI)
    if (activeAgent === 'vibe') {
      // Delegate generation to the LovableBuilder via event so iframe logic & shims apply consistently.
      setIsGeneratingBuilder(true)
      const thinking: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: "I'll create an AI agent for you. Generating the code and interface...",
        timestamp: Date.now(),
        type: 'assistant'
      }
      setMessages(prev => [...prev, thinking])
      // Fire event consumed by lovable-builder.tsx which will perform fetch + dispatch lovable:generated / lovable:error
      try {
        window.dispatchEvent(new CustomEvent('lovable:generate', { detail: { idea: currentPrompt } }))
      } catch (e) {
        const fail: ChatMessageType = {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: 'Failed to start generation. Please retry.',
          timestamp: Date.now(),
          type: 'assistant'
        }
        setMessages(prev => [...prev, fail])
        setIsTyping(false)
        setIsGeneratingBuilder(false)
      }
      return
    }

    try {
      let endpoint = "/api/chat/orchestrator"
      if (activeAgent === "researcher") {
        endpoint = "/api/chat/researcher"
      } else if (activeAgent === "executive") {
        endpoint = "/api/chat/executive/stream" // Use streaming endpoint
      } else if (activeAgent === "vibe") {
        // TEMP: Repurpose the existing Vibe button to route to the new Roo integration placeholder.
        // Original endpoint: /api/chat/vibe
        // Future: rename activeAgent value & UI label to "roo" once stable.
        endpoint = "/api/chat/roo"
      } else if (activeAgent === "agent") {
        endpoint = "/api/chat/agent"
      }

      // Decide endpoint (new vs follow-up for Roo)
      let effectiveEndpoint = endpoint
      if (activeAgent === "vibe" && rooTaskId) {
        effectiveEndpoint = "/api/chat/roo/message"
      }

      console.log(`[CHAT] sending request to ${effectiveEndpoint}`)
      console.log("[CHAT] request body:", { message: currentPrompt, history: messages?.length || 0, taskId: rooTaskId })
      
      // Researcher uses streaming SSE to drive progress UI and secondary panel
      if (activeAgent === "researcher") {
        setShowResearchProgress(true)
        // Start streaming request with stream flag
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: currentPrompt, history: messages, stream: true }),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => "")
          throw new Error(`Failed to get response from researcher (${response.status}) ${errorText}`)
        }

        const contentType = response.headers.get("content-type") || ""
        const reader = response.body?.getReader()
        const decoder = new TextDecoder("utf-8")

        // If server did not stream, handle JSON directly
        if (!contentType.includes("text/event-stream")) {
          try {
            const text = await response.text()
            const data = JSON.parse(text)
            setShowResearchProgress(false)
            if (data?.searchResults) {
              if (!isSecondaryPanelOpen) toggleSecondaryPanelAction()
              window.dispatchEvent(new CustomEvent("searchResults", { detail: data.searchResults }))
            }
            setIsTyping(false)
            return
          } catch (err) {
            // fallthrough to error
          }
        }

        if (reader) {
          let thoughtBuffer = ""
          const emitSentences = (text: string) => {
            const parts = text.split(/(?<=[.!?])\s+/)
            const complete = parts.slice(0, -1)
            thoughtBuffer = parts[parts.length - 1] || ""
            for (const sent of complete) {
              const s = sent.trim()
              if (s) {
                window.dispatchEvent(
                  new CustomEvent("researchProgress", {
                    detail: { type: 'progress', phase: 'analyzing', message: s },
                  })
                )
              }
            }
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.type === 'delta' && typeof data.content === 'string' && data.content.length > 0) {
                    emitSentences(thoughtBuffer + data.content)
                    continue
                  }
                  if (data.type === 'progress') {
                    // Open the secondary panel at first progress so logs are visible live
                    if (!openedSecondaryForResearchRef.current) {
                      if (!isSecondaryPanelOpen) toggleSecondaryPanelAction()
                      openedSecondaryForResearchRef.current = true
                    }
                    window.dispatchEvent(new CustomEvent("researchProgress", { detail: data }))
                    continue
                  }
                  if (data.type === 'complete') {
                    const finalThought = (thoughtBuffer || '').trim()
                    if (finalThought) {
                      window.dispatchEvent(
                        new CustomEvent("researchProgress", {
                          detail: { type: 'progress', phase: 'analyzing', message: finalThought },
                        })
                      )
                    }
                    // Prefer the formatted message as the response content shown in Secondary Panel
                    const payload = { ...data }
                    if (typeof payload.message === 'string' && payload.message.trim()) {
                      payload.searchResults = payload.searchResults || {}
                      payload.searchResults.response = payload.message
                    }
                    window.dispatchEvent(new CustomEvent("researchProgress", { detail: payload }))
                    if (payload.searchResults) {
                      // Ensure the Secondary Panel is mounted before dispatching the event
                      const dispatchResults = () => window.dispatchEvent(new CustomEvent("searchResults", { detail: payload.searchResults }))
                      if (!isSecondaryPanelOpen) {
                        toggleSecondaryPanelAction()
                        // Defer dispatch to the next tick to allow mount
                        setTimeout(dispatchResults, 60)
                      } else {
                        dispatchResults()
                      }
                    }
                    setTimeout(() => setShowResearchProgress(false), 3000)
                    openedSecondaryForResearchRef.current = false
                    setIsTyping(false)
                    return
                  }
                } catch {
                  // ignore malformed lines
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        }
        return
      }

      let response: Response
      try {
        response = await fetch(effectiveEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentPrompt,
            history: messages,
            taskId: rooTaskId || undefined,
            documents: documentsContext,
          }),
        })
      } catch (fetchError) {
        console.error("[CHAT] Fetch error:", fetchError)
        const errorMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          sender: "ai",
          text: `❌ Network error: Could not connect to server. ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
        setIsTyping(false)
        return
      }

      console.log(`[CHAT] response status: ${response.status}`)
      console.log("[CHAT] response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[CHAT] response error:", errorText)
        const errorMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          sender: "ai",
          text: `❌ Server error (${response.status}): ${errorText.substring(0, 200)}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
        setIsTyping(false)
        return
      }

      // Roo (currently reusing "vibe") and Executive use SSE streaming
      const isRoo = activeAgent === "vibe"
      const isExecutive = activeAgent === "executive"
      const contentType = response.headers.get("content-type") || ""

      if ((isRoo || isExecutive) && contentType.startsWith("text/event-stream")) {
        console.log(`[${activeAgent}] starting SSE processing, content-type:`, contentType)
        const reader = response.body?.getReader()
        const decoder = new TextDecoder("utf-8")
        let buffer = ""
        let streamingMessageId: string | null = null
        let frontendEventCount = 0
        let executiveAccumulatedText = "" // Accumulate executive agent message text

        const pushOrUpdate = (text: string, partial: boolean, meta?: any) => {
          if (!streamingMessageId) {
            streamingMessageId = crypto.randomUUID()
            setMessages((prev) => [
              ...prev,
              { id: streamingMessageId!, sender: "ai", text: text, timestamp: Date.now(), role: meta?.role, meta },
            ])
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === streamingMessageId ? { ...m, text, meta: { ...(m.meta||{}), ...meta } } : m)),
            )
          }
          if (!partial) {
            streamingMessageId = null
          }
        }

        let lastChunkTs = Date.now()
        const HEARTBEAT_MS = 15000
        const TIMEOUT_MS = 45000
        const heartbeatInterval = setInterval(() => {
          const now = Date.now()
            if (now - lastChunkTs > TIMEOUT_MS) {
              console.warn('Roo SSE timed out; closing stream')
              try { reader?.cancel().catch(()=>{}) } catch {}
              clearInterval(heartbeatInterval)
            }
        }, HEARTBEAT_MS)

        if (reader) {
          console.log("[SSE] reader ready, starting read loop")
          try {
            while (true) {
              let readResult
              try {
                readResult = await reader.read()
              } catch (readError) {
                console.error("[SSE] Read error:", readError)
                throw readError
              }
              const { value, done } = readResult
              console.log(`[vibe] SSE read: done=${done}, value length=${value?.length || 0}`)
              
              if (done) {
                console.log("[vibe] SSE stream completed")
                break
              }
              
              lastChunkTs = Date.now()
              const chunk = decoder.decode(value, { stream: true })
              console.log("[vibe] received chunk:", JSON.stringify(chunk))
              buffer += chunk
              // Split SSE events
              const parts = buffer.split(/\n\n+/)
              // Keep last (possibly incomplete) in buffer
              buffer = parts.pop() || ""
              for (const part of parts) {
                if (!part.trim()) continue
                frontendEventCount++
                
                console.log(`[vibe] FRONTEND EVENT #${frontendEventCount}:`, JSON.stringify(part))
                
                const lines = part.split(/\n/).filter(Boolean)
                let event: string | null = null
                let dataRaw = ""
                for (const line of lines) {
                  if (line.startsWith("event:")) event = line.slice(6).trim()
                  else if (line.startsWith("data:")) dataRaw += line.slice(5).trim()
                }
                if (!dataRaw) {
                  console.log(`[vibe] event #${frontendEventCount} has no data, skipping`)
                  continue
                }
                
                // Handle both Agent Maestro event formats (UPPERCASE and lowercase)
                const eventType = event?.toLowerCase()
                console.log(`[vibe] EVENT PARSED -> Type: "${eventType}", Data:`, dataRaw.substring(0, 100) + (dataRaw.length > 100 ? "..." : ""))
                
                // Check Executive agent events FIRST before generic handlers
                if (isExecutive && eventType === "message") {
                  // Executive agent message - accumulate tokens
                  try {
                    const parsed = JSON.parse(dataRaw)
                    const text = parsed.text || ""
                    console.log("[Executive] Message chunk:", text)
                    
                    if (typeof text === "string" && text.length) {
                      executiveAccumulatedText += text // Accumulate
                      pushOrUpdate(executiveAccumulatedText, true) // Update with full accumulated text
                    }
                  } catch (e) {
                    console.warn("[Executive] Failed to parse message", e)
                  }
                } else if (isExecutive && eventType === "document") {
                  // Executive agent created a document
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("[Executive] Document created:", parsed)
                    
                    // Open documents panel
                    if (!isDocumentsPanelOpen) {
                      console.log("[Executive] Opening documents panel")
                      toggleDocumentsPanelAction()
                    }
                    
                    // Load the document
                    console.log("[Executive] Dispatching documentCreated event with:", {
                      url: parsed.url,
                      type: parsed.type,
                      tab: parsed.tab,
                    })
                    window.dispatchEvent(
                      new CustomEvent("documentCreated", {
                        detail: {
                          url: parsed.url,
                          type: parsed.type || "document",
                          tab: parsed.tab || "docs",
                        },
                      })
                    )
                    console.log("[Executive] documentCreated event dispatched")
                  } catch (e) {
                    console.warn("Failed to parse executive document event", e)
                  }
                } else if (isExecutive && eventType === "status") {
                  // Executive agent status update - just log, don't add to message
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("[Executive] Status:", parsed.text)
                    // Don't add status to message text
                  } catch (e) {
                    console.warn("Failed to parse executive status event", e)
                  }
                } else if (isExecutive && eventType === "tool") {
                  // Executive agent is calling a tool - just log, don't add to message
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("[Executive] Calling tool:", parsed.name, parsed.args)
                    // Don't add tool info to message text
                  } catch (e) {
                    console.warn("Failed to parse executive tool event", e)
                  }
                } else if (isExecutive && eventType === "done") {
                  // Executive agent finished - finalize message
                  console.log("[Executive] Done - finalizing message")
                  if (executiveAccumulatedText) {
                    pushOrUpdate(executiveAccumulatedText, false) // Finalize with accumulated text
                  }
                  executiveAccumulatedText = "" // Reset accumulator
                } else if (eventType === "message") {
                  // Vibe/Roo agent message handler
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("Parsed message data:", parsed)
                    
                    // Agent Maestro message structure: { taskId, action, message: { text, type, ask, etc } }
                    const messageObj = parsed.message || parsed
                    const text = messageObj.text || parsed.text || ""
                    const { partial, ask, suggestions, taskId } = { ...parsed, ...messageObj }
                    
                    if (taskId && !rooTaskId) {
                      setRooTaskId(taskId)
                    }
                    
                    console.log("Extracted text:", JSON.stringify(text), "Partial:", partial, "Ask:", ask)
                    
                    if (typeof text === "string" && text.length) {
                      let role: ChatMessageType["role"] | undefined
                      if (messageObj.type === "reasoning" || messageObj.reasoning) role = "reasoning"
                      else if (messageObj.type === "command" || messageObj.command) role = "command"
                      else if (messageObj.type === "result" || messageObj.result) role = "result"
                      
                      console.log("Calling pushOrUpdate with:", { text: text.substring(0, 50), partial, role })
                      pushOrUpdate(text, !!partial, { eventType: event, partial, taskId: taskId || rooTaskId || undefined, askType: ask, suggestions, raw: parsed, role })
                    }
                    if (!partial) {
                      // Follow-up ask detection (Roo uses ask: 'followup')
                      if (ask === "followup") {
                        setRooAwaitingFollowup(true)
                        if (Array.isArray(suggestions)) {
                          setRooSuggestions(suggestions.filter((s: any) => typeof s === "string"))
                        }
                        // Auto-approve if configured
                        if (rooConfig?.autoApprove && rooTaskId) {
                          fetch('/api/chat/roo/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: rooTaskId, action: 'pressPrimaryButton' }) }).catch(()=>{})
                        }
                      } else if (ask === "resume_completed_task") {
                        // Auto-approve resuming completed task
                        console.log("Auto-approving resume_completed_task for task:", taskId || rooTaskId)
                        if (rooTaskId || taskId) {
                          fetch('/api/chat/roo/action', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ taskId: taskId || rooTaskId, action: 'pressPrimaryButton' }) 
                          }).catch(()=>{})
                        }
                      } else {
                        setRooAwaitingFollowup(false)
                        setRooSuggestions([])
                      }
                    }
                  } catch (e) {
                    console.warn("Failed to parse Roo SSE message", e)
                  }
                } else if (eventType === "task_created" || eventType === "taskcreated") {
                  try {
                    const parsed = JSON.parse(dataRaw)
                    if (parsed.taskId && !rooTaskId) setRooTaskId(parsed.taskId)
                    console.log("Task created:", parsed.taskId)
                  } catch {/* ignore */}
                } else if (eventType === "task_started" || eventType === "taskstarted") {
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("Task started:", parsed.taskId)
                    setIsTyping(true) // Show typing indicator when task starts
                  } catch {/* ignore */}
                } else if (eventType === "task_completed" || eventType === "taskcompleted") {
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("Task completed:", parsed.taskId, "Token usage:", parsed.tokenUsage)
                  } catch {/* ignore */}
                  setRooAwaitingFollowup(false)
                  setIsTyping(false) // Stop spinner on task completion
                } else if (eventType === "task_aborted" || eventType === "taskaborted") {
                  setRooAwaitingFollowup(false)
                  setIsTyping(false) // Stop spinner on task abort
                } else if (eventType === "task_ask_responded" || eventType === "taskaskresponded") {
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("Task ask responded:", parsed.taskId)
                  } catch {/* ignore */}
                } else if (eventType === "task_token_usage_updated" || eventType === "tasktokenusageupdated") {
                  try {
                    const parsed = JSON.parse(dataRaw)
                    console.log("Token usage updated:", parsed.taskId, "Usage:", parsed.tokenUsage)
                  } catch {/* ignore */}
                } else if (eventType === "error") {
                  console.error("Agent error:", dataRaw)
                  setIsTyping(false) // Stop spinner on error
                  
                  // Parse and display error to user
                  try {
                    const parsed = JSON.parse(dataRaw)
                    const errorMsg = parsed.error || dataRaw
                    const errorMessage: ChatMessageType = {
                      id: crypto.randomUUID(),
                      sender: "ai",
                      text: `❌ Error: ${errorMsg}`,
                      timestamp: Date.now(),
                    }
                    setMessages((prev) => [...prev, errorMessage])
                  } catch (e) {
                    // Fallback if parsing fails
                    const errorMessage: ChatMessageType = {
                      id: crypto.randomUUID(),
                      sender: "ai",
                      text: `❌ Error: ${dataRaw}`,
                      timestamp: Date.now(),
                    }
                    setMessages((prev) => [...prev, errorMessage])
                  }
                } else if (eventType === "tool_failed" || eventType === "toolfailed") {
                  console.warn("Agent Maestro tool failed:", dataRaw)
                } else if (eventType === "ping") {
                  // Heartbeat to keep SSE alive; no action needed
                } else {
                  // Log unknown events for debugging
                  console.log("Unknown SSE event:", event, dataRaw)
                }
              }
            }
          } catch (streamError) {
            console.error("[SSE] Stream error:", streamError)
            const errorMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              sender: "ai",
              text: `❌ Stream error: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, errorMessage])
          } finally {
            clearInterval(heartbeatInterval)
            setIsTyping(false)
          }
        } else {
          console.error("[SSE] No reader available")
          const errorMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            sender: "ai",
            text: "❌ Error: Could not read response stream",
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, errorMessage])
          setIsTyping(false)
        }

        return
      }

      const responseData = await response.json()
      const { message: aiResponse, searchResults, agentInfo, documentCreation } = responseData

      // Handle document creation from executive agent
      if (documentCreation && activeAgent === "executive") {
        const aiMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          sender: "ai",
          text: aiResponse,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, aiMessage])

        if (!isDocumentsPanelOpen) {
          toggleDocumentsPanelAction()
        }
        
        // Dispatch event to open the document in OnlyOffice
        window.dispatchEvent(
          new CustomEvent("documentCreated", {
            detail: {
              url: documentCreation.url,
              type: documentCreation.type || "document",
              tab: documentCreation.tab || "docs",
            },
          }),
        )
        setIsTyping(false)
        return
      }

      if (searchResults && activeAgent === "researcher") {
        if (!isSecondaryPanelOpen) {
          toggleSecondaryPanelAction()
        }
        window.dispatchEvent(
          new CustomEvent("searchResults", {
            detail: searchResults,
          }),
        )
        setIsTyping(false)
        return
      }

      if (agentInfo && activeAgent === "agent") {
        const aiMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          sender: "ai",
          text: aiResponse,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, aiMessage])

        if (!isDocumentsPanelOpen) {
          toggleDocumentsPanelAction()
        }
        window.dispatchEvent(
          new CustomEvent("agentGenerated", {
            detail: agentInfo,
          }),
        )
        setIsTyping(false)
        return
      }

      const aiMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: aiResponse,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, aiMessage])
      // Mirror AI completion into preview? (No direct action needed; preview already updated during generation.)
    } catch (error) {
      console.error("[CHAT] Unhandled error:", error)
      console.error("[CHAT] Error stack:", error instanceof Error ? error.stack : "No stack trace")
      const errorMsg = error instanceof Error ? error.message : String(error)
      const aiMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: `❌ Error: ${errorMsg}. Please check the console for details.`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setIsTyping(false)
    }
  }

  // Helper: toolkit name extraction (copied from original)
  const extractToolkitName = (toolName: string): string => {
    if (toolName.startsWith('_')) {
      const parts = toolName.split('_')
      if (parts.length >= 3) return (parts[0] + parts[1]).toLowerCase()
    }
    return toolName.split('_')[0].toLowerCase()
  }

  // Check toolkit connections and emit connection-status message with buttons
  const checkToolkitConnections = async (tools: string[]) => {
    setIsCheckingConnections(true)
    const statusMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      sender: 'ai',
      text: 'Checking required toolkit connections...',
      timestamp: Date.now(),
      type: 'system'
    }
    setMessages(prev => [...prev, statusMsg])
    try {
      const uniqueToolkits = [...new Set(tools.map(extractToolkitName))]
      const toolkitResults = await Promise.all(uniqueToolkits.map(async (slug) => {
        try {
          const r = await fetch('/api/lovable/toolkit-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug })
          })
          if (!r.ok) return { slug, toolkit: null }
          const data = await r.json()
          return { slug, toolkit: data.toolkit }
        } catch { return { slug, toolkit: null } }
      }))
      const infos: Record<string, any> = {}
      const statuses: Record<string, any> = {}
      const connectionItems: string[] = []
      toolkitResults.forEach(({ slug, toolkit }) => {
        if (toolkit) {
          infos[slug] = toolkit
          const managedSchemes = toolkit.composio_managed_auth_schemes || []
          const authScheme = toolkit.auth_config_details?.[0]?.mode
          const lowerManaged = managedSchemes.map((s: string) => s.toLowerCase())
          const isOAuth2 = lowerManaged.includes('oauth2') || lowerManaged.includes('oauth') || authScheme?.toLowerCase() === 'oauth2'
          const isApiKey = lowerManaged.includes('api_key') || lowerManaged.includes('bearer_token') || lowerManaged.includes('apikey') || authScheme?.toLowerCase() === 'api_key'
          statuses[slug] = {
            connected: false,
            status: 'not_connected',
            authScheme,
            isComposioManaged: managedSchemes.length > 0,
            isOAuth2,
            isApiKey,
            managedSchemes,
            toolkitSlug: slug
          }
          const authType = isOAuth2 ? 'OAuth2' : isApiKey ? 'API Key' : authScheme
            const managedStatus = managedSchemes.length > 0 ? '🟢 Composio Managed' : '🟡 Custom Setup Required'
          connectionItems.push(`**${toolkit.name}** - ${authType} (${managedStatus})`)
        }
      })
      setToolkitInfos(infos)
      setConnectionStatuses(statuses)
      const connectionMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `**Required Connections:**\n\n${connectionItems.join('\n')}\n\nConnect these services to enable your agent's full functionality:`,
        timestamp: Date.now(),
        type: 'connection-status',
        meta: { toolkits: statuses }
      }
      setMessages(prev => [...prev, connectionMsg])
    } finally {
      setIsCheckingConnections(false)
    }
  }

  const waitForOAuthConnection = async (connectionId: string, toolkitSlug: string) => {
    try {
      const r = await fetch('/api/lovable/wait-for-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, timeout: 300000 })
      })
      const data = await r.json()
      if (data.success && data.status === 'ACTIVE') {
        setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], connected: true, status: 'connected', connectionId } }))
        const m: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `🎉 ${toolkitInfos[toolkitSlug]?.name || toolkitSlug} connected successfully! Your agent can now use this service.`, timestamp: Date.now() }
        setMessages(prev => [...prev, m])
      } else {
        setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], status: 'not_connected' } }))
        const m: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `❌ OAuth connection for ${toolkitInfos[toolkitSlug]?.name || toolkitSlug} ${data.status?.toLowerCase()}. Please try again.`, timestamp: Date.now() }
        setMessages(prev => [...prev, m])
      }
    } catch {
      setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], status: 'not_connected' } }))
      const m: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `❌ Failed to complete OAuth connection for ${toolkitInfos[toolkitSlug]?.name || toolkitSlug}. Please try again.`, timestamp: Date.now() }
      setMessages(prev => [...prev, m])
    }
  }

  const connectToolkit = async (toolkitSlug: string) => {
    const toolkit = toolkitInfos[toolkitSlug]
    const status = connectionStatuses[toolkitSlug]
    if (!toolkit || !status) return
    try {
      if (status.isComposioManaged && status.isOAuth2) {
        const m: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `Initiating OAuth connection for ${toolkit.name}... Please authorize in the popup window.`, timestamp: Date.now(), type: 'system' }
        setMessages(prev => [...prev, m])
        const r = await fetch('/api/lovable/create-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolkitSlug, authType: 'oauth2', userId: 'default' })
        })
        if (r.ok) {
          const data = await r.json()
          if (data.redirectUrl && data.connectionId) {
            setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], status: 'connecting' } }))
            window.open(data.redirectUrl, '_blank')
            waitForOAuthConnection(data.connectionId, toolkitSlug)
          } else if (data.connectionId) {
            setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], connected: true, status: 'connected', connectionId: data.connectionId } }))
            const done: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `🎉 ${toolkit.name} is already connected! Your agent can now use this service.`, timestamp: Date.now() }
            setMessages(prev => [...prev, done])
          }
        } else {
          const errData = await r.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to initiate OAuth connection')
        }
      } else if (status.isComposioManaged && status.isApiKey) {
        setCredentialCollection({ isCollecting: true, toolkitSlug, authType: 'api_key', credentials: {} })
      } else if (!status.isComposioManaged && status.isOAuth2) {
        setCredentialCollection({ isCollecting: true, toolkitSlug, authType: 'oauth2', credentials: {} })
      } else if (!status.isComposioManaged && status.isApiKey) {
        setCredentialCollection({ isCollecting: true, toolkitSlug, authType: 'api_key', credentials: {} })
      } else {
        const unsupported: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `${toolkit.name} authentication (${status.authScheme}) is not yet supported in this interface.`, timestamp: Date.now(), type: 'system' }
        setMessages(prev => [...prev, unsupported])
      }
    } catch (error: any) {
      const fail: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `❌ Failed to connect ${toolkit.name}: ${error.message}`, timestamp: Date.now(), type: 'system' }
      setMessages(prev => [...prev, fail])
    }
  }

  const handleCredentialSubmit = async () => {
    if (!credentialCollection) return
    const { toolkitSlug, authType, credentials } = credentialCollection
    const toolkit = toolkitInfos[toolkitSlug]
    try {
      const connecting: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `Connecting ${toolkit?.name || toolkitSlug}...`, timestamp: Date.now(), type: 'system' }
      setMessages(prev => [...prev, connecting])
      setCredentialCollection(null)
      const r = await fetch('/api/lovable/create-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkitSlug, authType, credentials, userId: 'default' })
      })
      const data = await r.json()
      if (r.ok) {
        if (authType === 'oauth2' && data.redirectUrl) {
          setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], status: 'connecting' } }))
          window.open(data.redirectUrl, '_blank')
          if (data.connectionId) waitForOAuthConnection(data.connectionId, toolkitSlug)
        } else {
          setConnectionStatuses(prev => ({ ...prev, [toolkitSlug]: { ...prev[toolkitSlug], connected: true, status: 'connected' } }))
          const ok: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `✅ ${toolkit?.name || toolkitSlug} connected successfully!`, timestamp: Date.now() }
          setMessages(prev => [...prev, ok])
        }
      } else {
        throw new Error(data.error || 'Connection failed')
      }
    } catch (err: any) {
      const fail: ChatMessageType = { id: crypto.randomUUID(), sender: 'ai', text: `❌ Failed to connect ${toolkit?.name || toolkitSlug}: ${err.message}`, timestamp: Date.now(), type: 'system' }
      setMessages(prev => [...prev, fail])
    }
  }



  useEffect(() => {
    if (cameraPreviewRef.current && cameraStream) {
      cameraPreviewRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  useEffect(() => {
    if (screenPreviewRef.current && screenStream) {
      screenPreviewRef.current.srcObject = screenStream
    }
  }, [screenStream])

  // When a document is created from Secondary Panel actions, switch to Executive and open docs
  useEffect(() => {
    const handleDocCreated = () => {
      setActiveAgent('executive')
      if (!isDocumentsPanelOpen) {
        try { toggleDocumentsPanelAction() } catch {}
      }
    }
    window.addEventListener('documentCreated', handleDocCreated as EventListener)
    return () => window.removeEventListener('documentCreated', handleDocCreated as EventListener)
  }, [isDocumentsPanelOpen, toggleDocumentsPanelAction])

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="w-48 flex justify-start">
          {!isLeftPanelOpen && !isSandboxContainerOpen && (
            <Button variant="ghost" size="icon" onClick={toggleLeftPanelAction} className="text-muted-foreground">
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          <ThemeAwareLogo />
        </div>
        <div className="w-48 flex justify-end">
          <ThemeToggle />
          {!isRightPanelOpen && (
            <Button variant="ghost" size="icon" onClick={toggleRightPanelAction} className="text-muted-foreground ml-2">
              <PanelRightOpen className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>
      
      {/* Standard chat UI (Pegasus integration removed) */}
      <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                <ChatMessage sender={msg.sender} text={msg.text} />
                {msg.type === 'connection-status' && msg.meta?.toolkits && (
                  <div className="ml-2 mr-8 space-y-3">
                    {Object.entries(msg.meta.toolkits as Record<string, any>).map(([slug, status]: any) => (
                      <div key={slug} className="flex items-center justify-between bg-secondary rounded-xl p-3 border">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {toolkitInfos[slug]?.name || slug}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${status?.isComposioManaged ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              {status?.isComposioManaged ? '●' : '◐'} {status?.isComposioManaged ? 'Managed' : 'Custom'}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span>{status?.authScheme || 'unknown'}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => connectToolkit(slug)}
                          disabled={connectionStatuses[slug]?.status === 'connecting'}
                          variant={connectionStatuses[slug]?.connected ? 'secondary' : 'default'}
                          className={`text-sm ${connectionStatuses[slug]?.connected ? 'opacity-80 cursor-default' : ''}`}
                        >
                          {connectionStatuses[slug]?.connected ? '✓ Connected' : connectionStatuses[slug]?.status === 'connecting' ? '⏳ Connecting...' : 'Connect'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <ResearchProgress isVisible={showResearchProgress} onComplete={() => setShowResearchProgress(false)} />
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xl px-4 py-2.5 rounded-2xl bg-secondary text-muted-foreground rounded-bl-none flex items-center">
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            {credentialCollection && (
              <div className="ml-2 mr-8 bg-secondary rounded-xl p-4 border">
                <div className="text-sm font-semibold mb-3">
                  Connect {toolkitInfos[credentialCollection.toolkitSlug]?.name || credentialCollection.toolkitSlug}
                </div>
                {credentialCollection.authType === 'oauth2' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Client ID"
                      value={credentialCollection.credentials.clientId || ''}
                      onChange={(e) => setCredentialCollection(prev => prev ? { ...prev, credentials: { ...prev.credentials, clientId: e.target.value } } : null)}
                      className="w-full bg-background border rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="password"
                      placeholder="Client Secret"
                      value={credentialCollection.credentials.clientSecret || ''}
                      onChange={(e) => setCredentialCollection(prev => prev ? { ...prev, credentials: { ...prev.credentials, clientSecret: e.target.value } } : null)}
                      className="w-full bg-background border rounded px-3 py-2 text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="password"
                      placeholder="API Key"
                      value={credentialCollection.credentials.apiKey || ''}
                      onChange={(e) => setCredentialCollection(prev => prev ? { ...prev, credentials: { ...prev.credentials, apiKey: e.target.value } } : null)}
                      className="w-full bg-background border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleCredentialSubmit} disabled={credentialCollection.authType === 'oauth2' ? !credentialCollection.credentials.clientId || !credentialCollection.credentials.clientSecret : !credentialCollection.credentials.apiKey}>Connect</Button>
                  <Button variant="secondary" onClick={() => setCredentialCollection(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-card">
        <div className="flex gap-2 pb-2">
          {cameraStream && (
            <div className="relative w-40 h-28 bg-black rounded-lg">
              <video ref={cameraPreviewRef} autoPlay muted className="w-full h-full object-cover rounded-md" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleCameraToggle}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          {screenStream && (
            <div className="relative w-40 h-28 bg-black rounded-lg">
              <video ref={screenPreviewRef} autoPlay muted className="w-full h-full object-contain rounded-md" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleScreenShareToggle}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="bg-secondary p-3 rounded-lg">
          <div className="relative">
            <Input
              placeholder="Enter your prompt"
              className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground w-full pr-32"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isTyping}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                disabled={isTyping || !prompt.trim()}
              >
                {isTyping ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isSecondaryPanelOpen && "bg-accent-primary text-primary-foreground hover:bg-accent-secondary",
                )}
                onClick={toggleSecondaryPanelAction}
              >
                <Layers className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isDocumentsPanelOpen && "bg-accent-primary text-primary-foreground hover:bg-accent-secondary",
                )}
                onClick={toggleDocumentsPanelAction}
              >
                <FileText className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isSandboxContainerOpen && "bg-accent-primary text-primary-foreground hover:bg-accent-secondary",
                )}
                onClick={toggleSandboxContainerAction}
              >
                <Terminal className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isVibeBuilderOpen && "bg-accent-primary text-primary-foreground hover:bg-accent-secondary",
                )}
                onClick={toggleVibeBuilderAction}
                aria-label="Toggle Vibe Builder"
                title="Toggle Vibe Builder"
              >
                <Brain className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-end mt-3 pt-3 border-t">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResearcherClick}
                className={cn(
                  "px-3 py-1 h-8",
                  activeAgent === "researcher"
                    ? "bg-blue-500/60 text-blue-200 hover:bg-blue-500/70 border border-blue-400/50 shadow-lg shadow-blue-500/20"
                    : "bg-blue-500/40 text-blue-100 hover:bg-blue-500/50 hover:text-white",
                )}
              >
                <Search className="w-4 h-4 mr-1" />
                Researcher
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExecutiveClick}
                className={cn(
                  "px-3 py-1 h-8",
                  activeAgent === "executive"
                    ? "bg-green-500/60 text-green-200 hover:bg-green-500/70 border border-green-400/50 shadow-lg shadow-green-500/20"
                    : "bg-green-500/40 text-green-100 hover:bg-green-500/50 hover:text-white",
                )}
              >
                <Briefcase className="w-4 h-4 mr-1" />
                Executive
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleVibeClick}
                className={cn(
                  "px-3 py-1 h-8",
                  activeAgent === "vibe"
                    ? "bg-purple-500/60 text-purple-200 hover:bg-purple-500/70 border border-purple-400/50 shadow-lg shadow-purple-500/20"
                    : "bg-purple-500/40 text-purple-100 hover:bg-purple-500/50 hover:text-white",
                )}
              >
                <Brain className="w-4 h-4 mr-1" />
                Vibe{rooTaskId && activeAgent === "vibe" ? "*" : ""}
              </Button>
              <Button
                // Pegasus button removed entirely
                className="hidden"
              ></Button>
            </div>
          </div>
          {activeAgent === "vibe" && rooAwaitingFollowup && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-muted-foreground px-2">
                🤖 Roo Code is asking for your approval to continue with the next step:
              </div>
              <div className="flex flex-wrap gap-2">
                {rooSuggestions.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPrompt(s)}
                    className="text-xs"
                  >
                    {s}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => {
                    // Approve = primary button
                    if (!rooTaskId) return
                    fetch("/api/chat/roo/action", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ taskId: rooTaskId, action: "pressPrimaryButton" }),
                    }).catch(() => {})
                  }}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ Approve & Continue
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!rooTaskId) return
                    fetch("/api/chat/roo/action", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ taskId: rooTaskId, action: "pressSecondaryButton" }),
                    }).catch(() => {})
                  }}
                  className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                >
                  ❌ Reject & Stop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRooTaskId(null)
                    setRooAwaitingFollowup(false)
                    setRooSuggestions([])
                  }}
                  className="text-xs text-muted-foreground"
                >
                  🔄 Reset Session
                </Button>
              </div>
            </div>
          )}
        </form>
          </div>
        </>
    </div>
  )
}
