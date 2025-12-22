"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"

// Future: dynamically import external builder once integrated.
// Placeholder dynamic import (will be replaced with actual module entrypoint)
const LazyVibeBuilder = dynamic(() => import("./lovable-builder"), {
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">
      Loading Vibe Builder…
    </div>
  ),
  ssr: false,
})

export default function VibeBuilderContainer({ togglePanelAction }: { togglePanelAction: () => void }) {
  return (
    <div className="w-[65%] bg-card border-l flex flex-col" aria-label="Vibe Builder Panel">
      <div className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0 bg-background/60 backdrop-blur">
        <div className="text-sm font-medium">Vibe Agent Preview</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePanelAction}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close Vibe Builder"
          >
            ×
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-background overflow-hidden">
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading preview…</div>}>
          <LazyVibeBuilder />
        </Suspense>
      </div>
    </div>
  )
}
