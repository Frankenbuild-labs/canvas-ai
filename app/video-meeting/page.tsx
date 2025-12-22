"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Video, Link2, Share2 } from "lucide-react";
import { LiveKitRoom, VideoConference, useTracks } from "@livekit/components-react";
import "@livekit/components-styles";
import RecordOverlay from "@/components/video-meeting/RecordOverlay";
import { useToast } from "@/hooks/use-toast";
import ScreenShareBanner from "@/components/video-meeting/ScreenShareBanner";
import AgentSettingsCard from "@/components/video-meeting/AgentSettings";

export default function VideoMeetingPage() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<string>("canvas-room");
  const [name, setName] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const [hasLocalShare, setHasLocalShare] = useState(false);

  // Auto-fill name from localStorage if present
  useEffect(() => {
    const savedName = typeof window !== "undefined" ? localStorage.getItem("meeting.displayName") : null;
    if (savedName) setName(savedName);
    // Pre-fill from URL params if present
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get("room");
      const n = sp.get("name");
      if (r) setRoom(r);
      if (n) setName(n);
    }
  }, []);

  const startMeeting = async () => {
    setConnecting(true);
    try {
      const params: Record<string, string> = { room };
      if (name.trim()) params.name = name.trim();
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/livekit/token?${qs}`);
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setServerUrl(data.url);
        if (name.trim()) localStorage.setItem("meeting.displayName", name.trim());
      } else {
        console.error("token error", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const makeInviteUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/video-meeting/${encodeURIComponent(room)}`;
  };

  const copyInvite = async () => {
    const url = makeInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Invite link copied", description: "Share it with anyone to join this room." });
    } catch (e) {
      console.error(e);
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  const shareInvite = async () => {
    const url = makeInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my LiveKit room", url });
        return;
      } catch (e) {
        // fall back to copy
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
            <h1 className="text-lg font-semibold">Video Meeting</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {token && (
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
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
            <Users className="w-4 h-4" />
            <span>Powered by LiveKit</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {token && serverUrl ? (
          <LiveKitRoom serverUrl={serverUrl} token={token} connect options={{ dynacast: true }}>
            <div className="relative h-full pb-4 md:pb-6">
              <VideoConference />
              <ScreenShareBanner onStateAction={(s) => setHasLocalShare(s.hasLocalShare)} />
              <RecordOverlay disabled={hasLocalShare} />
            </div>
          </LiveKitRoom>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Join a Meeting</h2>
              </div>
              <label className="text-sm text-muted-foreground">Room name</label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="e.g. canvas-room"
              />
              <label className="text-sm text-muted-foreground">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Display name"
              />
              <div className="flex items-center gap-2">
                <Button onClick={startMeeting} disabled={connecting || !room.trim()} className="flex-1">
                  {connecting ? "Connecting…" : "Join"}
                </Button>
                <Button type="button" onClick={copyInvite} variant="secondary" disabled={!room.trim()} className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Copy invite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Uses LiveKit for real-time audio/video.</p>
              </div>
              <AgentSettingsCard room={room} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
