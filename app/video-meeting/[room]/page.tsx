"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Video, Link2, Share2 } from "lucide-react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import RecordOverlay from "@/components/video-meeting/RecordOverlay";
import { useToast } from "@/hooks/use-toast";
import ScreenShareBanner from "@/components/video-meeting/ScreenShareBanner";
import AgentSettingsCard from "@/components/video-meeting/AgentSettings";
import MeetingConference from "@/components/video-meeting/MeetingConference";
import AgentControls from "@/components/video-meeting/AgentControls";
import AgentStatusIndicator from "@/components/video-meeting/AgentStatusIndicator";

type Props = {
  params: { room: string };
};

export default function VideoMeetingRoomPage({ params }: Props) {
  const room = decodeURIComponent(params.room);
  const sp = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const [hasLocalShare, setHasLocalShare] = useState(false);

  const initialNameFromQuery = useMemo(() => sp?.get("name") || "", [sp]);

  useEffect(() => {
    const savedName = typeof window !== "undefined" ? localStorage.getItem("meeting.displayName") : null;
    if (initialNameFromQuery) {
      setName(initialNameFromQuery);
      return;
    }
    if (savedName) setName(savedName);
  }, [initialNameFromQuery]);

  const startMeeting = async () => {
    setConnecting(true);
    try {
      const qs = new URLSearchParams({ room, ...(name.trim() ? { name: name.trim() } : {}) }).toString();
      const res = await fetch(`/api/livekit/token?${qs}`);
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setServerUrl(data.url);
        if (name.trim()) localStorage.setItem("meeting.displayName", name.trim());
      } else {
        console.error("token error", data);
        toast({ title: "Unable to join", description: data?.error || "Token request failed", variant: "destructive" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Unable to join", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/video-meeting/${encodeURIComponent(room)}`;
  }, [room]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Invite link copied", description: "Share it with anyone to join this room." });
    } catch {
      toast({ title: "Copy failed", description: inviteUrl, variant: "destructive" });
    }
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my meeting", url: inviteUrl });
        return;
      } catch {
        // fall back
      }
    }
    await copyInvite();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Meeting</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">{room}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {token && (
            <>
              <AgentControls />
              <div className="flex items-center gap-2">
                <Button onClick={shareInvite} variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Invite
                </Button>
                <Button onClick={copyInvite} variant="ghost" size="sm" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Copy link
                </Button>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
            <Users className="w-4 h-4" />
            <span>LiveKit</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {token && serverUrl ? (
          <LiveKitRoom serverUrl={serverUrl} token={token} connect options={{ dynacast: true }}>
            <div className="relative h-full pb-4 md:pb-6">
              <MeetingConference />
              <ScreenShareBanner onStateAction={(s) => setHasLocalShare(s.hasLocalShare)} />
              <RecordOverlay disabled={hasLocalShare} />
              <AgentStatusIndicator />
            </div>
          </LiveKitRoom>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Join meeting</h2>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Room</label>
                  <div className="w-full rounded-md border bg-background px-3 py-2 text-sm">{room}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Display name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={startMeeting} disabled={connecting} className="flex-1">
                    {connecting ? "Connecting…" : "Join"}
                  </Button>
                  <Button type="button" onClick={copyInvite} variant="secondary" className="gap-2">
                    <Link2 className="w-4 h-4" />
                    Copy invite
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">Share the invite link to bring others in.</p>
              </div>

              <AgentSettingsCard room={room} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
