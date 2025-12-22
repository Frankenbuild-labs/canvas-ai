"use client"

import { useRef, useEffect } from "react"
import { usePegasusContext } from "./pegasus-context"
import { usePegasusDeviceId } from "@/hooks/use-pegasus-device-id"
import PegasusChatMessage from "./pegasus-chat-message"
import PegasusQuestionInput from "./pegasus-question-input"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePegasusWebSocket } from "@/hooks/use-pegasus-websocket"
import { usePegasusEvents } from "@/hooks/use-pegasus-events"
import { WebSocketConnectionState } from "@/lib/agent-types"
import Cookies from "js-cookie"

interface PegasusChatContainerProps {
  onClose?: () => void
}

export default function PegasusChatContainer({ onClose }: PegasusChatContainerProps) {
  const { state, dispatch } = usePegasusContext()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { deviceId } = usePegasusDeviceId()
  
  // Wire WS events into Pegasus state
  const { handleEvent, handleClickAction } = usePegasusEvents({ xtermRef: { current: null } })

  // Wrap event handler to also mirror events into the sandbox iframe (so its UI updates)
  const handleEventAndMirror = (evt: any) => {
    try {
      handleEvent(evt)
    } finally {
      const iframe = document.getElementById('pegasus-iframe') as HTMLIFrameElement | null
      const targetOrigin = (process.env.NEXT_PUBLIC_IIAGENT_URL || '').replace(/\/$/, '') || '*'
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'mirror_event', payload: evt }, targetOrigin)
      }
    }
  }

  const { sendMessage } = usePegasusWebSocket(deviceId, false, handleEventAndMirror)

  // Listen to events coming FROM the iframe and feed them into our event handler
  useEffect(() => {
    const iframeOrigin = process.env.NEXT_PUBLIC_IIAGENT_URL?.replace(/\/$/, '')
    const onMessage = (event: MessageEvent) => {
      if (!iframeOrigin || event.origin !== iframeOrigin) return
      const payload = event.data
      // Accept either { type, data } or full event shape { id, type, content }
      if (payload?.type) {
        const evt = payload.content || payload.data
          ? { id: Date.now().toString(), type: payload.type, content: payload.content || payload.data }
          : payload
        try { handleEvent(evt as any) } catch (e) { /* noop */ }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handleEvent])

  const handleQuestionSubmit = (text: string) => {
    console.log('[Pegasus HOST] 📝 handleQuestionSubmit called:', { text, deviceId })
    
    if (!text.trim()) return
    console.log('[Pegasus HOST] ✓ submitting query to iframe via postMessage:', text)

    // Immediately reflect the user message in UI
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        id: crypto.randomUUID(),
        type: "user",
        content: text,
        timestamp: Date.now(),
      },
    })

    // Show loading state
    dispatch({ type: "SET_LOADING", payload: true })

    // Resolve model from state, cookie, or env
    const model = state.selectedModel || Cookies.get('selected_model') || (process.env.NEXT_PUBLIC_II_AGENT_MODEL as string | undefined)
    if (!model) {
      dispatch({ type: "SET_LOADING", payload: false })
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: crypto.randomUUID(),
          type: "assistant",
          content:
            '❌ Error: No model selected. Set cookie "selected_model" in ii-agent or define NEXT_PUBLIC_II_AGENT_MODEL, then try again.',
          timestamp: Date.now(),
        },
      })
      return
    }

    // Send query to iframe (it will forward to its own WS and update its UI)
    const iframe = document.getElementById('pegasus-iframe') as HTMLIFrameElement | null
    const targetOrigin = process.env.NEXT_PUBLIC_IIAGENT_URL?.replace(/\/$/, '') || '*'
    iframe?.contentWindow?.postMessage({
      type: 'host_query',
      data: {
        query: text,
        deviceId,
        model,
        toolSettings: state.toolSettings,
        uploadedFiles: state.uploadedFiles,
        isAgentInitialized: state.isAgentInitialized,
      }
    }, targetOrigin)

    // Clear input
    dispatch({ type: "SET_CURRENT_QUESTION", payload: "" })
  }

  const handleEditMessage = (newContent: string) => {
    // Handle message editing - resubmit the edited message
    handleQuestionSubmit(newContent)
    dispatch({ type: "SET_EDITING_MESSAGE", payload: undefined })
  }

  const handleCancel = () => {
    dispatch({ type: "SET_EDITING_MESSAGE", payload: undefined })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back button to exit Pegasus mode */}
      {onClose && (
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-6">
        <PegasusChatMessage
          isReplayMode={false}
          messagesEndRef={messagesEndRef}
          handleClickAction={handleClickAction}
        />
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground mb-2">
          Connection: {state.wsConnectionState === WebSocketConnectionState.CONNECTED ? 'connected' : 'connecting...'}
        </div>
        <PegasusQuestionInput
          onSubmit={handleQuestionSubmit}
          disabled={state.isLoading}
          placeholder="Type your message to Pegasus..."
        />
      </div>
    </div>
  )
}
