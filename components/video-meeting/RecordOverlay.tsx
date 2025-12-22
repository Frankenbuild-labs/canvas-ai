"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleDot, Folder, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SavedFile = { name: string; url: string; size: number; mtime: number; path?: string };

export default function RecordOverlay({ disabled }: { disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [openSaved, setOpenSaved] = useState(false);
  const [saved, setSaved] = useState<SavedFile[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!openSaved) return;
    (async () => {
      const res = await fetch("/api/recordings/list", { credentials: "include" });
      const data = await res.json();
      if (data.ok) setSaved(data.files || []);
    })();
  }, [openSaved]);

  const deleteRecording = async (file: SavedFile) => {
    if (!file.path) {
      toast({ title: "Can't delete", description: "Missing recording path.", variant: "destructive" });
      return;
    }

    const encodedPath = file.path
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");

    const res = await fetch(`/api/recordings/${encodedPath}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast({
        title: "Delete failed",
        description: data?.error || "Could not delete recording",
        variant: "destructive",
      });
      return;
    }

    setSaved((prev) => prev.filter((f) => f.path !== file.path));
    toast({ title: "Deleted", description: "Recording removed." });
  };

  const startRecording = async () => {
    try {
      // Prefer current tab; avoid chooser UI when possible. Some browsers still show a minimal prompt.
      const constraints: any = {
        preferCurrentTab: true,
        video: {
          displaySurface: "browser",
          logicalSurface: true,
          frameRate: 30,
        },
        audio: {
          selfBrowserSurface: "include",
          systemAudio: "exclude",
          suppressLocalAudioPlayback: true,
        },
      };
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia(constraints);
      // Ensure we stop if user ends sharing from browser UI
      const [vTrack] = stream.getVideoTracks();
      if (vTrack) {
        vTrack.addEventListener("ended", () => {
          stopRecording();
        });
      }
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const file = new File([blob], `meeting-${Date.now()}.webm`, { type: "video/webm" });
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", file.name);
        await fetch("/api/recordings/upload", { method: "POST", body: fd, credentials: "include" });
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        streamRef.current = null;
        setOpenSaved(true);
      };
      mr.start(500);
      setRecording(true);
      toast({ title: "Recording started", description: "We'll capture this tab until you stop." });
    } catch (e) {
      console.warn("record start failed", e);
      toast({
        title: "Recording not started",
        description: "If screen sharing is active, stop it first. Browsers only allow one display capture at a time.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    try {
      if (mr && recording && mr.state !== "inactive") mr.stop();
    } finally {
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        streamRef.current = null;
      }
    }
    setRecording(false);
    toast({ title: "Recording stopped", description: "Uploading… your file will appear in Saved." });
  };

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex gap-2">
        {!recording ? (
          <Button variant="destructive" size="sm" className="gap-2" onClick={startRecording} disabled={disabled}>
            <CircleDot className="w-4 h-4" /> Record
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="gap-2" onClick={stopRecording}>
            <CircleDot className="w-4 h-4 text-red-500" /> Stop
          </Button>
        )}
        <Button variant={openSaved ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setOpenSaved((v) => !v)}>
          <Folder className="w-4 h-4" /> Saved
        </Button>
      </div>

      {openSaved && (
        <div className="pointer-events-auto bg-card rounded-xl border shadow-xl w-[380px] max-h-[50vh] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b text-sm">
            <div>Saved Recordings</div>
            <button className="p-1" onClick={() => setOpenSaved(false)} aria-label="Close saved list">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-[42vh] overflow-y-auto">
            {saved.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No recordings yet</div>
            ) : (
              <ul className="divide-y">
                {saved.map((f) => (
                  <li key={f.url} className="p-3 text-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{(f.size / (1024 * 1024)).toFixed(1)} MB</div>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <a href={f.url} target="_blank" rel="noreferrer" className="underline text-primary">Open</a>
                      <a href={f.url} download className="underline">Download</a>
                      <button
                        type="button"
                        className="underline text-destructive"
                        onClick={() => deleteRecording(f)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
