import { useState, useEffect, useRef, useCallback } from "react";

// EXACT TRANSPLANT from ii-agent frontend - MOVED not copied

export interface ChatMessage {
  id: string
  sender: 'user' | 'ai' 
  text: string
  timestamp: number
  role?: 'command' | 'result' | 'reasoning' | 'assistant' | 'system' | 'tool'
  meta?: { partial?: boolean; [key: string]: any }
}

export interface SendPromptOptions {
  resume?: boolean
  files?: string[]
}

interface UseArchagentOptions {
  autoConnect?: boolean
}

export function useArchagent(options: UseArchagentOptions = {}) {
  const { autoConnect = true } = options
  // EXACT ii-agent state management transplanted 
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closed'>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAgentInitialized, setIsAgentInitialized] = useState(false)
  const [vscodeUrl, setVscodeUrl] = useState<string>('')
  
  // EXACT ii-agent device and model management
  const deviceIdRef = useRef(crypto.randomUUID())
  const selectedModelRef = useRef<string | undefined>(undefined)
  // Track the current streaming assistant message to update in-place
  const streamingMessageIdRef = useRef<string | null>(null)
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Helper: read cookies like ii-agent does (cookie is shared across localhost ports)
  const getCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(';').shift()
    return undefined
  }

  // Determine model name: cookie -> env -> ref
  const getModelName = (): string | undefined => {
    return (
      selectedModelRef.current ||
      getCookie('selected_model') ||
      (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_II_AGENT_MODEL as string | undefined) : undefined)
    )
  }
  
  // EXACT ii-agent connectWebSocket function - MOVED HERE
  const connectWebSocket = useCallback(() => {
    setStatus('connecting')
    setIsAgentInitialized(false)
    
    const wsPayload: { [key: string]: string } = {
      device_id: deviceIdRef.current,
    }
    const params = new URLSearchParams(wsPayload)
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_API_URL}/ws?${params.toString()}`
    )

    ws.onopen = () => {
      console.log('WebSocket connection established')
      setStatus('connected')
      ws.send(
        JSON.stringify({
          type: 'workspace_info',
          content: {},
        })
      )
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleEvent({ ...data, id: Date.now().toString() })
      } catch (error) {
        console.error('Error parsing WebSocket data:', error)
      }
    }

    ws.onerror = (error) => {
      console.log('WebSocket error:', error)
      setStatus('error')
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
      setStatus('closed')
      setSocket(null)
    }

    setSocket(ws)
  }, [])

  // EXACT ii-agent sendMessage function - MOVED HERE  
  const sendMessage = useCallback((payload: { type: string; content: any }) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket connection is not open. Please try again.')
      return false
    }
    socket.send(JSON.stringify(payload))
    return true
  }, [socket])

  // EXACT ii-agent handleEvent function - MOVED HERE
  const handleEvent = useCallback((data: { id: string; type: string; content: Record<string, unknown> }) => {
    // Enhanced debug logs to track all events and streaming state
    try { 
      console.debug('[archagent:event]', data.type, data, { isStreaming: isStreaming, streamingId: streamingMessageIdRef.current }); 
    } catch {}
    switch (data.type) {
      case 'agent_initialized': {
        setIsAgentInitialized(true)
        if (data.content?.vscode_url) {
          setVscodeUrl(data.content.vscode_url as string)
        }
        return
      }
      case 'processing': {
        // Start spinner; wait for first assistant chunk to create message
        setIsStreaming(true)
        
        // Set a 30-second timeout to auto-stop spinning if no completion event comes
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current)
        }
        streamTimeoutRef.current = setTimeout(() => {
          console.debug('[archagent:timeout]', 'Auto-stopping stream after 30s timeout')
          setIsStreaming(false)
          streamingMessageIdRef.current = null
        }, 30000)
        
        return
      }
      case 'agent_response': {
        const text = (data.content.text || data.content.message || '') as string
        console.debug('[archagent:agent_response]', 'Processing agent_response with text:', text)
        
        setMessages(prev => {
          const updated = [...prev]
          // If there is an active partial assistant message, finalize it
          if (updated.length > 0) {
            const lastIdx = updated.length - 1
            if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) {
              if (text) {
                updated[lastIdx] = { ...updated[lastIdx], text: updated[lastIdx].text + text, meta: { ...updated[lastIdx].meta, partial: false } }
              } else {
                updated[lastIdx] = { ...updated[lastIdx], meta: { ...updated[lastIdx].meta, partial: false } }
              }
              return updated
            }
          }
          // If no partial exists and text is provided, add a final assistant message
          if (text) {
            updated.push({
              id: data.id || crypto.randomUUID(),
              sender: 'ai',
              text,
              timestamp: Date.now(),
              role: 'assistant'
            })
          }
          return updated
        })
        
        console.debug('[archagent:agent_response]', 'Stopping stream and clearing streaming ref')
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current)
          streamTimeoutRef.current = null
        }
        setIsStreaming(false)
        streamingMessageIdRef.current = null
        return
      }
      case 'tool_call': {
        const toolName = (data.content.tool_name as string) || ''
        // If agent is handing control back, finalize stream
        if (toolName.toLowerCase() === 'return_control_to_user') {
          console.debug('[archagent:return_control]', 'Agent returning control to user')
          if (streamTimeoutRef.current) {
            clearTimeout(streamTimeoutRef.current)
            streamTimeoutRef.current = null
          }
          setIsStreaming(false)
          setMessages(prev => {
            const updated = [...prev]
            if (updated.length > 0) {
              const lastIdx = updated.length - 1
              if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) {
                updated[lastIdx] = { ...updated[lastIdx], meta: { ...updated[lastIdx].meta, partial: false } }
              }
            }
            return updated
          })
          streamingMessageIdRef.current = null
          return
        }
        // Handle sequential thinking like ii-agent does
        if (toolName.toLowerCase() === 'sequential_thinking') {
          const thought = ((data.content.tool_input as any)?.thought || '') as string
          if (!thought) return
          
          setMessages(prev => [...prev, {
            id: data.id,
            text: thought,
            sender: 'ai' as const,
            timestamp: Date.now()
          }])
          return
        }
        
        // Only handle message_user for streaming
        if (toolName.toLowerCase() !== 'message_user') return
        const chunk = ((data.content.tool_input as any)?.text || '') as string
        if (!chunk) return
        setMessages(prev => {
          let updated = [...prev]
          let idx = -1
          if (streamingMessageIdRef.current) {
            idx = updated.findIndex(m => m.id === streamingMessageIdRef.current)
          } else if (updated.length > 0) {
            const lastIdx = updated.length - 1
            if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) idx = lastIdx
          }
          if (idx >= 0) {
            const m = updated[idx]
            updated[idx] = { ...m, text: (m.text || '') + chunk }
          } else {
            const id = data.id || crypto.randomUUID()
            streamingMessageIdRef.current = id
            updated.push({
              id,
              sender: 'ai',
              text: chunk,
              timestamp: Date.now(),
              role: 'assistant',
              meta: { partial: true }
            })
          }
          return updated
        })
        return
      }
      case 'tool_result': {
        const toolName = (data.content.tool_name as string) || ''
        if (toolName.toLowerCase() === 'return_control_to_user') {
          setIsStreaming(false)
          setMessages(prev => {
            const updated = [...prev]
            if (updated.length > 0) {
              const lastIdx = updated.length - 1
              if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) {
                updated[lastIdx] = { ...updated[lastIdx], meta: { ...updated[lastIdx].meta, partial: false } }
              }
            }
            return updated
          })
          streamingMessageIdRef.current = null
        }
        return
      }
      case 'agent_response_interrupted':
      case 'stream_complete': {
        // Mark stream done
        console.debug('[archagent:completion]', 'Stream completion event:', data.type)
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current)
          streamTimeoutRef.current = null
        }
        setIsStreaming(false)
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            const lastIdx = updated.length - 1
            if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) {
              updated[lastIdx] = { ...updated[lastIdx], meta: { ...updated[lastIdx].meta, partial: false } }
            }
          }
          return updated
        })
        streamingMessageIdRef.current = null
        return
      }
      case 'error': {
        const errorMsg = (data.content.message || data.content.error || 'Unknown error') as string
        setMessages(prev => [...prev, {
          id: data.id,
          sender: 'ai',
          text: `❌ Error: ${errorMsg}`,
          timestamp: Date.now(),
          role: 'system'
        }])
        setIsStreaming(false)
        streamingMessageIdRef.current = null
        return
      }
      case 'agent_thinking': {
        // Show agent thinking as separate messages like ii-agent does
        const thinkingText = (data.content.text as string) || ''
        if (!thinkingText) return
        
        setMessages(prev => [...prev, {
          id: data.id,
          text: thinkingText,
          sender: 'ai' as const,
          timestamp: Date.now()
        }])
        return
      }
      case 'system': {
        // Show system messages like ii-agent does  
        const systemText = (data.content.message as string) || ''
        if (!systemText) return
        
        setMessages(prev => [...prev, {
          id: data.id,
          text: systemText,
          sender: 'ai' as const,
          timestamp: Date.now()
        }])
        return
      }
      // Catch-all for any other events that might indicate completion
      default:
        // Log unhandled events to help debug
        console.debug('[archagent:unhandled]', data.type, data)
        
        // If we're currently streaming and get any "completion" type event, try to finalize
        if (isStreaming && (
          data.type.includes('complete') || 
          data.type.includes('done') || 
          data.type.includes('finished') ||
          data.type.includes('end') ||
          data.type === 'agent_finished' ||
          data.type === 'task_complete' ||
          data.type === 'response_complete'
        )) {
          console.debug('[archagent:auto-complete]', 'Auto-finalizing stream for event:', data.type)
          if (streamTimeoutRef.current) {
            clearTimeout(streamTimeoutRef.current)
            streamTimeoutRef.current = null
          }
          setIsStreaming(false)
          setMessages(prev => {
            const updated = [...prev]
            if (updated.length > 0) {
              const lastIdx = updated.length - 1
              if (updated[lastIdx].sender === 'ai' && updated[lastIdx].meta?.partial) {
                updated[lastIdx] = { ...updated[lastIdx], meta: { ...updated[lastIdx].meta, partial: false } }
              }
            }
            return updated
          })
          streamingMessageIdRef.current = null
        }
        return
    }
  }, [])

  // EXACT ii-agent sendPrompt logic from home-content.tsx - MOVED HERE
  const sendPrompt = useCallback((text: string, opts: SendPromptOptions = {}) => {
    if (!text.trim() || isStreaming) return
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket connection is not open. Please try again.')
      return
    }
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: Date.now()
    }])
    setIsStreaming(true)
    
    // EXACT ii-agent logic: only initialize agent if not already initialized
    if (!isAgentInitialized) {
      const modelName = getModelName()
      if (!modelName) {
        // Without a model, backend rejects init; stop cleanly with minimal system notice
        setIsStreaming(false)
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: '❌ Error: No model selected. Set cookie "selected_model" in ii-agent or define NEXT_PUBLIC_II_AGENT_MODEL, then try again.',
          timestamp: Date.now(),
          role: 'system'
        }])
        return
      }
      selectedModelRef.current = modelName
      sendMessage({
        type: 'init_agent',
        content: { 
          model_name: modelName,
          tool_args: { browser: true },
          thinking_tokens: 10000
        },
      })
    }
    
    // Send the query using the existing socket connection
    sendMessage({
      type: 'query',
      content: {
        text,
        resume: messages.length > 0,
        files: opts.files,
      },
    })
  }, [isAgentInitialized, messages.length, sendMessage, socket, isStreaming])

  const cancel = useCallback(() => {
    sendMessage({ type: 'cancel', content: {} })
    setIsStreaming(false)
  }, [sendMessage])

  // EXACT ii-agent useEffect - MOVED HERE  
  useEffect(() => {
    // Prime selected model from cookie/env on mount
    const cookieModel = getCookie('selected_model')
    if (cookieModel) selectedModelRef.current = cookieModel
    else if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_II_AGENT_MODEL) {
      selectedModelRef.current = process.env.NEXT_PUBLIC_II_AGENT_MODEL
    }

    if (autoConnect && deviceIdRef.current) {
      connectWebSocket()
    }
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [autoConnect, connectWebSocket])

  return { 
    status, 
    connect: connectWebSocket, 
    sendPrompt, 
    cancel, 
    messages, 
    isStreaming, 
    vscodeUrl 
  }
}
