"use client";

import { useEffect, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { Bot, Wifi, WifiOff } from "lucide-react";

export default function AgentStatusIndicator() {
  const participants = useParticipants();
  const [agentStatus, setAgentStatus] = useState<"none" | "connecting" | "connected" | "error">("none");
  
  useEffect(() => {
    const agents = participants.filter((p) => {
      try {
        const metadata = p.metadata ? JSON.parse(p.metadata) : {};
        return metadata.is_agent === true;
      } catch {
        return false;
      }
    });
    
    if (agents.length === 0) {
      setAgentStatus("none");
    } else {
      // Check if agent is properly connected with audio
      const connectedAgent = agents.find((a) => {
        const hasAudio = a.audioTrackPublications.size > 0;
        const audioConnected = Array.from(a.audioTrackPublications.values()).some(
          (pub) => pub.track && pub.track.isEnabled
        );
        return hasAudio && audioConnected;
      });
      
      if (connectedAgent) {
        setAgentStatus("connected");
      } else {
        setAgentStatus("connecting");
      }
    }
  }, [participants]);
  
  if (agentStatus === "none") return null;
  
  return (
    <div className={`agent-status agent-status-${agentStatus}`}>
      <Bot className="w-4 h-4" />
      <span className="text-sm">
        {agentStatus === "connecting" && "Agent connecting..."}
        {agentStatus === "connected" && "Agent active"}
        {agentStatus === "error" && "Agent error"}
      </span>
      {agentStatus === "connected" ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : agentStatus === "error" ? (
        <WifiOff className="w-4 h-4 text-red-500" />
      ) : (
        <div className="agent-spinner" />
      )}
      
      <style>{`
        .agent-status {
          position: fixed;
          bottom: 5rem;
          left: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          z-index: 50;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .agent-status-connecting {
          border-color: rgba(250, 204, 21, 0.5);
        }
        
        .agent-status-connected {
          border-color: rgba(16, 185, 129, 0.5);
        }
        
        .agent-status-error {
          border-color: rgba(239, 68, 68, 0.5);
        }
        
        .agent-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: #facc15;
          border-radius: 50%;
          animation: agent-spin 0.8s linear infinite;
        }
        
        @keyframes agent-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
