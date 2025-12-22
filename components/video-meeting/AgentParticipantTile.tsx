"use client";

import { useParticipants } from "@livekit/components-react";
import { Bot } from "lucide-react";

/**
 * Custom ParticipantTile wrapper that adds agent badge
 */
export function AgentAwareParticipantTile({ children, ...props }: any) {
  return (
    <div className="lk-participant-tile-wrapper">
      {children}
      <AgentBadgeOverlay participant={props.participant} />
    </div>
  );
}

/**
 * Badge overlay to show when participant is an AI agent
 */
function AgentBadgeOverlay({ participant }: { participant?: any }) {
  if (!participant) return null;
  
  // Check if participant is an agent from metadata
  let isAgent = false;
  try {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
    isAgent = metadata.is_agent === true;
  } catch {}
  
  if (!isAgent) return null;
  
  return (
    <div className="lk-agent-badge">
      <Bot className="w-3 h-3" />
      <span>AI</span>
      <style>{`
        .lk-participant-tile-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .lk-agent-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
