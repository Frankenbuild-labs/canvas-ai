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
  Brain,
  Briefcase,
  FileText,
  Bot,
  Terminal,
} from "lucide-react"
import ChatMessage from "./chat-message"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { ThemeToggle } from "../theme-toggle"
import ThemeAwareLogo from "../theme-aware-logo"
import { cn } from "@/lib/utils"
import { useArchagent } from "@/hooks/use-archagent"


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
}

export default function ChatArea({
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
  // Roo (vibe) integration state
  const [rooTaskId, setRooTaskId] = useState<string | null>(null)
  const [rooAwaitingFollowup, setRooAwaitingFollowup] = useState(false)
  const [rooSuggestions, setRooSuggestions] = useState<string[]>([])
  const [rooConfig, setRooConfig] = useState<{ model: string; temperature: string; autoApprove: boolean } | null>(null)

  // Archagent integration hook
  const archagent = useArchagent({ autoConnect: false })

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
    setActiveAgent(activeAgent === "vibe" ? null : "vibe")
  }

  const handleAgentClick = () => {
    setActiveAgent(activeAgent === "agent" ? null : "agent")
  }

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

    try {
      let endpoint = "/api/chat/orchestrator"
      if (activeAgent === "researcher") {
        endpoint = "/api/chat/researcher"
      } else if (activeAgent === "executive") {
        endpoint = "/api/chat/executive"
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

      console.log(`[vibe] sending request to ${effectiveEndpoint}`)
      console.log("[vibe] request body:", { message: currentPrompt, history: messages?.length || 0, taskId: rooTaskId })
      
      const response = await fetch(effectiveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentPrompt,
          history: messages,
          taskId: rooTaskId || undefined,
        }),
      })

      console.log(`[vibe] response status: ${response.status}`)
      console.log("[vibe] response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[vibe] response error:", errorText)
        throw new Error(`Failed to get response from ${activeAgent || "orchestrator"}: ${response.status} ${errorText}`)
      }

      // Roo (currently reusing "vibe") uses SSE mock streaming; detect event-stream
      const isRoo = activeAgent === "vibe"
      const contentType = response.headers.get("content-type") || ""

      if (isRoo && contentType.startsWith("text/event-stream")) {
        console.log("[vibe] starting SSE processing, content-type:", contentType)
        const reader = response.body?.getReader()
        const decoder = new TextDecoder("utf-8")
        let buffer = ""
        let streamingMessageId: string | null = null
        let frontendEventCount = 0

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
          console.log("[vibe] SSE reader ready, starting read loop")
          try {
            while (true) {
              const { value, done } = await reader.read()
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
                
                if (eventType === "message") {
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
                  console.error("Agent Maestro error:", dataRaw)
                  setIsTyping(false) // Stop spinner on error
                } else if (eventType === "tool_failed" || eventType === "toolfailed") {
                  console.warn("Agent Maestro tool failed:", dataRaw)
                } else {
                  // Log unknown events for debugging
                  console.log("Unknown SSE event:", event, dataRaw)
                }
              }
            }
          } catch (streamError) {
            console.error("SSE stream error:", streamError)
          }
        }

        clearInterval(heartbeatInterval)
        setIsTyping(false)  // Fix: Stop the spinning indicator when SSE ends
        return
      }

      const responseData = await response.json()
      const { message: aiResponse, searchResults, agentInfo } = responseData

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
    } catch (error) {
      console.error("Chat error:", error)
      const aiMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setIsTyping(false)
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
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} />
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-xl px-4 py-2.5 rounded-2xl bg-secondary text-muted-foreground rounded-bl-none flex items-center">
              <LoaderCircle className="w-5 h-5 animate-spin" />
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
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center space-x-2">
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Star className="w-5 h-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Paperclip className="w-5 h-5" />
              </Button>
            </div>
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
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAgentClick}
                className={cn(
                  "px-3 py-1 h-8",
                  activeAgent === "agent"
                    ? "bg-orange-500/60 text-orange-200 hover:bg-orange-500/70 border border-orange-400/50 shadow-lg shadow-orange-500/20"
                    : "bg-orange-500/40 text-orange-100 hover:bg-orange-500/50 hover:text-white",
                )}
              >
                <Bot className="w-4 h-4 mr-1" />
                Archagent
              </Button>
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
    </div>
  )
}
