"use client";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRoomContext, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function ScreenShareBanner({ onStateAction }: { onStateAction?: (s: { hasLocalShare: boolean }) => void }) {
  const room = useRoomContext();
  const shareRefs = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });

  const hasLocalShare = useMemo(() => {
    return shareRefs.some((r) => r.participant?.isLocal);
  }, [shareRefs]);

  useEffect(() => {
    onStateAction?.({ hasLocalShare });
  }, [hasLocalShare, onStateAction]);

  if (!hasLocalShare) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-20 z-40">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-card/90 backdrop-blur px-3 py-2 shadow">
        <div className="text-sm">
          You&apos;re sharing your screen. If you see a mirror, you probably shared this meeting tab—stop and share a window or the full screen instead.
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => room?.localParticipant?.setScreenShareEnabled(false)}
        >
          Stop share
        </Button>
      </div>
    </div>
  );
}
