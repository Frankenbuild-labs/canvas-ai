"use client";

import { useState } from "react";
import { useRoomContext, useParticipants } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Bot, Volume2, VolumeX, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AgentControls() {
  const room = useRoomContext();
  const participants = useParticipants();
  
  // Find agent participants
  const agents = participants.filter((p) => {
    try {
      const metadata = p.metadata ? JSON.parse(p.metadata) : {};
      return metadata.is_agent === true;
    } catch {
      return false;
    }
  });
  
  const [mutedAgents, setMutedAgents] = useState<Set<string>>(new Set());
  
  const toggleAgentMute = async (agentIdentity: string) => {
    const agent = agents.find((a) => a.identity === agentIdentity);
    if (!agent) return;
    
    const newMuted = new Set(mutedAgents);
    if (mutedAgents.has(agentIdentity)) {
      newMuted.delete(agentIdentity);
    } else {
      newMuted.add(agentIdentity);
    }
    setMutedAgents(newMuted);
    
    // Mute/unmute agent's audio tracks
    agent.audioTrackPublications.forEach((pub) => {
      if (mutedAgents.has(agentIdentity)) {
        pub.track?.unmute();
      } else {
        pub.track?.mute();
      }
    });
  };
  
  const removeAgent = async (agentIdentity: string) => {
    // In production, you'd call an API to remove the agent from the room
    // For now, we can only mute it
    await toggleAgentMute(agentIdentity);
  };
  
  if (agents.length === 0) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Agents ({agents.length})</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>AI Agents in Meeting</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {agents.map((agent) => {
          const isMuted = mutedAgents.has(agent.identity);
          return (
            <div key={agent.identity} className="px-2 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">{agent.name || "Agent"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAgentMute(agent.identity)}
                  className="h-8 w-8 p-0"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAgent(agent.identity)}
                  className="h-8 w-8 p-0"
                >
                  <UserX className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
