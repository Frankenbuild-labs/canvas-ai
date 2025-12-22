"use client";

import * as React from "react";
import {
  CarouselLayout,
  Chat,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
  isTrackReference,
  useParticipants,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { Bot } from "lucide-react";

function trackKey(track: any): string {
  const identity = track?.participant?.identity ?? "";
  const source = track?.source ?? track?.publication?.source ?? "";
  const sid = track?.publication?.trackSid ?? "";
  return `${identity}:${String(source)}:${sid}`;
}

// Custom ParticipantTile with agent badge
function AgentAwareParticipantTile(props: any) {
  const isAgent = React.useMemo(() => {
    try {
      const metadata = props.participant?.metadata ? JSON.parse(props.participant.metadata) : {};
      return metadata.is_agent === true;
    } catch {
      return false;
    }
  }, [props.participant?.metadata]);
  
  return (
    <div className="relative">
      <ParticipantTile {...props} />
      {isAgent && (
        <div className="lk-agent-badge">
          <Bot className="w-3 h-3" />
          <span>AI</span>
        </div>
      )}
    </div>
  );
}

export default function MeetingConference() {
  const [widgetState, setWidgetState] = React.useState({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });

  const layoutContext = useCreateLayoutContext();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const focusKey = focusTrack ? trackKey(focusTrack) : null;

  const remoteScreenShareTracks = React.useMemo(() => {
    return tracks
      .filter(isTrackReference)
      .filter((tr) => tr.publication.source === Track.Source.ScreenShare)
      .filter((tr) => !tr.participant.isLocal);
  }, [tracks]);

  const carouselTracks = React.useMemo(() => {
    if (!focusKey) return tracks;
    return tracks.filter((t) => trackKey(t) !== focusKey);
  }, [tracks, focusKey]);

  const lastAutoFocusedRemoteShare = React.useRef<string | null>(null);

  React.useEffect(() => {
    const subscribedRemoteShares = remoteScreenShareTracks.filter((t) => t.publication.isSubscribed);
    const focusIsRemoteShare =
      focusTrack &&
      isTrackReference(focusTrack) &&
      focusTrack.publication.source === Track.Source.ScreenShare &&
      !focusTrack.participant.isLocal;

    if (subscribedRemoteShares.length > 0 && !focusIsRemoteShare) {
      const next = subscribedRemoteShares[0];
      layoutContext.pin.dispatch?.({ msg: "set_pin", trackReference: next });
      lastAutoFocusedRemoteShare.current = next.publication.trackSid;
      return;
    }

    if (
      lastAutoFocusedRemoteShare.current &&
      !subscribedRemoteShares.some((t) => t.publication.trackSid === lastAutoFocusedRemoteShare.current)
    ) {
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
      lastAutoFocusedRemoteShare.current = null;
    }
  }, [remoteScreenShareTracks, focusTrack, layoutContext.pin]);

  const focusIsRemoteScreenshare = React.useMemo(() => {
    return (
      !!focusTrack &&
      isTrackReference(focusTrack) &&
      focusTrack.publication.source === Track.Source.ScreenShare &&
      !focusTrack.participant.isLocal
    );
  }, [focusTrack]);

  // Simple filter: exclude ALL local screenshare tracks from rendering to prevent mirror effect.
  // They still publish to other participants (like Zoom/Meet behavior).
  const isLocalScreenshare = React.useCallback((trackRef: any): boolean => {
    if (!trackRef || !isTrackReference(trackRef)) return false;
    return (
      trackRef.participant?.isLocal &&
      trackRef.publication?.source === Track.Source.ScreenShare
    );
  }, []);

  // Filter all local screenshares from UI.
  const filteredTracks = React.useMemo(() => {
    return tracks.filter((t) => !isLocalScreenshare(t));
  }, [tracks, isLocalScreenshare]);

  // Check if user is actively sharing their screen
  const hasLocalScreenshare = React.useMemo(() => {
    return tracks.some((t) => isLocalScreenshare(t));
  }, [tracks, isLocalScreenshare]);

  // If focus track is local screenshare, clear it.
  React.useEffect(() => {
    if (focusTrack && isLocalScreenshare(focusTrack)) {
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
    }
  }, [focusTrack, isLocalScreenshare, layoutContext.pin]);

  return (
    <div className={`lk-video-conference ${hasLocalScreenshare ? "lk-screensharing" : ""}`}>
      <LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState as any}>
        <div className="lk-video-conference-inner">
          {!focusTrack ? (
            <div className="lk-grid-layout-wrapper">
              <GridLayout tracks={filteredTracks}>
                <AgentAwareParticipantTile />
              </GridLayout>
            </div>
          ) : (
            <div className={`lk-focus-layout-wrapper ${focusIsRemoteScreenshare ? "no-mirror" : ""}`}>
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks.filter((t) => !isLocalScreenshare(t))}>
                  <AgentAwareParticipantTile />
                </CarouselLayout>
                <FocusLayout trackRef={focusTrack} />
              </FocusLayoutContainer>
            </div>
          )}

          <ControlBar
            controls={{ chat: true }}
            style={{ marginTop: "0.25rem" }}
          />
        </div>

        <Chat
          style={{ display: widgetState.showChat ? "grid" : "none" }}
          className="tight-chat"
        />
      </LayoutContextProvider>

      <RoomAudioRenderer />
      <ConnectionStateToast />

      {/* Minimal styles to prevent screenshare mirroring and tighten chat spacing */}
      <style>{`
        .lk-focus-layout-wrapper.no-mirror video { transform: none !important; }
        .lk-chat.tight-chat { gap: 0.25rem; font-size: 0.95rem; }
        .lk-chat.tight-chat .lk-chat-messages { padding: 0.25rem 0.5rem; }
        .lk-chat.tight-chat .lk-message { margin: 0.15rem 0; }
        .lk-chat.tight-chat .lk-chat-input { padding: 0.35rem 0.5rem; }
        
        /* When screensharing, minimize video UI to small pip so user can interact with their screen */
        .lk-video-conference.lk-screensharing .lk-video-conference-inner {
          position: fixed;
          bottom: 5rem;
          right: 1rem;
          width: 280px;
          height: 180px;
          z-index: 100;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
        }
        
        .lk-video-conference.lk-screensharing .lk-grid-layout-wrapper,
        .lk-video-conference.lk-screensharing .lk-focus-layout-wrapper {
          height: 100%;
        }
        
        .lk-video-conference.lk-screensharing .lk-participant-tile {
          border-radius: 0;
        }
        
        .lk-video-conference.lk-screensharing .lk-control-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          margin: 0 !important;
          background: rgba(15, 23, 42, 0.9);
          padding: 0.25rem;
        }
        
        /* Hide chat when screensharing */
        .lk-video-conference.lk-screensharing .lk-chat {
          display: none !important;
        }
        
        /* Agent badge styling */
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
