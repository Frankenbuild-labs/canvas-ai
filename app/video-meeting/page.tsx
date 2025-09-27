"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Video } from "lucide-react"
import Link from "next/link"

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export default function VideoMeetingPage() {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)

  useEffect(() => {
    // Load Jitsi Meet External API script
    const script = document.createElement("script")
    script.src = "https://8x8.vc/vpaas-magic-cookie-67af3a0e9d39486c968aae27fd01ad78/external_api.js"
    script.async = true

    script.onload = () => {
      if (jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
        const jwtToken =
          "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtNjdhZjNhMGU5ZDM5NDg2Yzk2OGFhZTI3ZmQwMWFkNzgvODczZTIyLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NTc4MTkxMDksImV4cCI6MTc1NzgyNjMwOSwibmJmIjoxNzU3ODE5MTA0LCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtNjdhZjNhMGU5ZDM5NDg2Yzk2OGFhZTI3ZmQwMWFkNzgiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOnRydWUsImZpbGUtdXBsb2FkIjp0cnVlLCJvdXRib3VuZC1jYWxsIjp0cnVlLCJzaXAtb3V0Ym91bmQtY2FsbCI6dHJ1ZSwidHJhbnNjcmlwdGlvbiI6dHJ1ZSwibGlzdC12aXNpdG9ycyI6dHJ1ZSwicmVjb3JkaW5nIjp0cnVlLCJmbGlwIjpmYWxzZX0sInVzZXIiOnsiaGlkZGVuLWZyb20tcmVjb3JkZXIiOnRydWUsIm1vZGVyYXRvciI6dHJ1ZSwibmFtZSI6Impvc2h1YS5iZDciLCJpZCI6Imdvb2dsZS1vYXV0aDJ8MTA5ODY4NjUwNTkxMjcyNTU1Mzg1IiwiYXZhdGFyIjoiIiwiZW1haWwiOiJqb3NodWEuYmQ3QGdtYWlsLmNvbSJ9fSwicm9vbSI6IioifQ.BSKVZVVSom-s1HwXbe8nQigJR2pueyPKfwoXWJ6CZDUXqNTTJ1RsGXVT8_9I5_oB4yRiPwQHBacRdDMBKdLFhuqln1fdiVyQXuTAznqIYEavrHi5fSi3YJw7BwBgVjTQSytmVbs4C7HauixfGfQIDd8Vm7GynvcA-mi7_3gjc3gdadzZDYC4rEx2gk_DaMWP3pSENs_5WN4KA9AwWSgISZ8xXc60ZktU0V1uJNKMQca9vq3c21-0YNbd-uJ-6jljtJXh1JG6eqIPqk3zQhBKRm8UGyWoybxMXM9GlPR6ypPJflMkGPLkWIVnT0H8bNhw5cHlzzJFnMnTFM2nW6mSww"

        apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
          roomName:
            "vpaas-magic-cookie-67af3a0e9d39486c968aae27fd01ad78/SampleAppExperimentalUnemploymentsSuspendWhatever",
          parentNode: jitsiContainerRef.current,
          jwt: jwtToken,
          width: "100%",
          height: "100%",
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "profile",
              "chat",
              "recording",
              "livestreaming",
              "etherpad",
              "sharedvideo",
              "settings",
              "raisehand",
              "videoquality",
              "filmstrip",
              "invite",
              "feedback",
              "stats",
              "shortcuts",
              "tileview",
              "videobackgroundblur",
              "download",
              "help",
              "mute-everyone",
              "security",
            ],
            SETTINGS_SECTIONS: ["devices", "language", "moderator", "profile", "calendar"],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
          userInfo: {
            displayName: "joshua.bd7",
            email: "joshua.bd7@gmail.com",
          },
        })

        apiRef.current.addEventListener("videoConferenceJoined", () => {
          const loadingOverlay = document.getElementById("loading-overlay")
          if (loadingOverlay) {
            loadingOverlay.style.opacity = "0"
            setTimeout(() => {
              loadingOverlay.style.display = "none"
            }, 300)
          }
        })

        apiRef.current.addEventListener("readyToClose", () => {
          window.location.href = "/"
        })

        apiRef.current.addEventListener("participantJoined", (participant: any) => {
          console.log("[v0] Participant joined:", participant)
        })

        apiRef.current.addEventListener("participantLeft", (participant: any) => {
          console.log("[v0] Participant left:", participant)
        })
      }
    }

    document.head.appendChild(script)

    // Cleanup function
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Powered by Jitsi Meet</span>
        </div>
      </div>

      {/* Meeting Container */}
      <div className="flex-1 relative">
        <div ref={jitsiContainerRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 4rem)" }} />

        {/* Loading State */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          id="loading-overlay"
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Connecting to meeting...</h2>
              <p className="text-muted-foreground">Please wait while we set up your video conference</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        #loading-overlay {
          transition: opacity 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
