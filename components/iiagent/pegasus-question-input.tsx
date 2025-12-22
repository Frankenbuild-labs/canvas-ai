"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { usePegasusContext } from "./pegasus-context"

interface PegasusQuestionInputProps {
  onSubmit: (text: string) => void
  onEnhancePrompt?: () => void
  disabled?: boolean
  placeholder?: string
}

export default function PegasusQuestionInput({
  onSubmit,
  onEnhancePrompt,
  disabled = false,
  placeholder = "Type your message here...",
}: PegasusQuestionInputProps) {
  const { state } = usePegasusContext()
  const [localValue, setLocalValue] = useState(state.currentQuestion || "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(state.currentQuestion || "")
  }, [state.currentQuestion])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [localValue])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = localValue.trim()
    if (trimmed && !disabled) {
      onSubmit(trimmed)
      setLocalValue("")
    }
  }

  return (
    <div className="relative flex items-end gap-2 p-3 bg-secondary rounded-lg">
      <Textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || state.isLoading}
        className="min-h-[40px] max-h-[200px] resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!localValue.trim() || disabled || state.isLoading}
        size="icon"
        className="shrink-0 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
      >
        {state.isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}
