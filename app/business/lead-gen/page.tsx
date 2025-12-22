"use client"
import dynamic from "next/dynamic"

const LeadGenConsole = dynamic(() => import("../../../leadgen-console/App"), { ssr: false })

export default function LeadGenPage() {
  return (
    <div className="h-full w-full flex flex-col">
      <LeadGenConsole />
    </div>
  )
}
