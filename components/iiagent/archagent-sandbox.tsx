"use client";
import { useEffect, useState } from 'react'

// Embed ii-agent Docker container and hide chat interface
export default function ArchagentSandbox() {
  // Use environment variable with embed parameter to hide chat interface
  const IIAGENT_URL = `${process.env.NEXT_PUBLIC_IIAGENT_URL}?embed=1`
  
  return (
    <div className="w-full h-full relative overflow-hidden">
      <iframe 
        src={IIAGENT_URL}
        className="w-full h-full border-0"
        title="II-Agent Sandbox" 
      />
    </div>
  )
}
