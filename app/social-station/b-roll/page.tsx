"use client"
import dynamic from "next/dynamic"

// Lazy-load the Buzz Roll micro-app (client-only rendering)
const BuzzRollApp = dynamic(() => import("../../../buzz-roll/App"), { ssr: false })

export default function BRollPage() {
  return (
    <div className="h-full w-full flex flex-col">
      <BuzzRollApp />
    </div>
  )
}
