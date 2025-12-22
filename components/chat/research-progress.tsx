"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Search, Brain, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ResearchPhase = 'initializing' | 'searching' | 'analyzing' | 'complete' | 'error'

type ResearchProgressEvent = {
  type: 'progress' | 'complete' | 'error'
  phase: ResearchPhase
  message: string
  searchResults?: any
  metadata?: {
    visitedUrls?: number
    totalUrls?: number
  }
}

type ResearchProgressProps = {
  isVisible: boolean
  onComplete?: (result: any) => void
}

export default function ResearchProgress({ isVisible, onComplete }: ResearchProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('initializing')
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const [metadata, setMetadata] = useState<any>(null)

  const phases = [
    { id: 'initializing', label: 'Initializing', icon: Search },
    { id: 'searching', label: 'Web Search', icon: Search },
    { id: 'analyzing', label: 'Analysis', icon: Brain },
    { id: 'complete', label: 'Complete', icon: CheckCircle },
  ]

  const getPhaseStatus = (phaseId: string) => {
    const currentIndex = phases.findIndex(p => p.id === currentPhase)
    const phaseIndex = phases.findIndex(p => p.id === phaseId)
    if (currentPhase === 'error') return 'error'
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'active'
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-500'
      case 'active': return 'text-blue-500'
      case 'error': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string, Icon: any) => {
    if (status === 'error') return <AlertCircle className="w-4 h-4" />
    if (status === 'complete') return <CheckCircle className="w-4 h-4" />
    if (status === 'active') return <Icon className="w-4 h-4 animate-pulse" />
    return <Icon className="w-4 h-4" />
  }

  useEffect(() => {
    if (isVisible) {
      setCurrentPhase('initializing')
      setProgressMessages([])
      setMetadata(null)
      setIsExpanded(true)
    }
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    const handleProgressUpdate = (event: Event) => {
      const data = (event as CustomEvent<ResearchProgressEvent>).detail
      if (!data) return
      if (data.type === 'progress') {
        setCurrentPhase(data.phase)
        if (data.metadata) setMetadata(data.metadata)
        if (data.message) setProgressMessages(prev => [...prev, data.message])
      } else if (data.type === 'complete') {
        setCurrentPhase('complete')
        if (data.metadata) setMetadata(data.metadata)
        setTimeout(() => {
          onComplete?.({ phase: 'complete', metadata: data.metadata })
        }, 3000)
      }
    }
    window.addEventListener('researchProgress', handleProgressUpdate as EventListener)
    return () => window.removeEventListener('researchProgress', handleProgressUpdate as EventListener)
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div className="bg-secondary/30 border border-secondary rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-sm">Deep Research in Progress</span>
          {metadata && (
            <span className="text-xs text-muted-foreground">
              ({metadata.visitedUrls}/{metadata.totalUrls} sources)
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-6 w-6 p-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase.id)
              const Icon = phase.icon
              return (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className={`${getStatusColor(status)} flex items-center gap-1`}>
                    {getStatusIcon(status, Icon)}
                    <span className="text-xs font-medium">{phase.label}</span>
                  </div>
                  {index < phases.length - 1 && (
                    <div className={`w-8 h-px ${status === 'complete' ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {currentPhase === 'initializing' && "Setting up deep research system..."}
            {currentPhase === 'searching' && "Searching web for relevant information..."}
            {currentPhase === 'analyzing' && "Analyzing content and building insights..."}
            {currentPhase === 'complete' && "Research completed successfully!"}
            {currentPhase === 'error' && "Research encountered an error, falling back..."}
          </div>

          {progressMessages.length > 0 && (
            <div className="max-h-20 overflow-y-auto text-xs text-muted-foreground space-y-1">
              {progressMessages.slice(-4).map((msg, index) => (
                <div key={index} className="opacity-70">• {msg}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
