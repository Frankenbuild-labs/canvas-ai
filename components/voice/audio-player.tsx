"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Download, RotateCcw } from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  className?: string
}

export function AudioPlayer({ audioUrl, onTimeUpdate, className = "" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime, audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("canplay", handleCanPlay)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("canplay", handleCanPlay)
    }
  }, [audioUrl, onTimeUpdate])

  // Draw waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw simple waveform bars
    const barCount = 80
    const barWidth = canvas.width / barCount
    const barGap = 1

    ctx.fillStyle = "#374151" // Gray bars (not playing)

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * canvas.height * 0.7 + canvas.height * 0.3
      const x = i * barWidth
      const y = (canvas.height - barHeight) / 2

      ctx.fillRect(x, y, barWidth - barGap, barHeight)
    }

    // Highlight progress
    if (duration > 0) {
      const progress = currentTime / duration
      const progressBars = Math.floor(barCount * progress)

  ctx.fillStyle = "#14b8a6" // Teal bars (playing/played)

      for (let i = 0; i < progressBars; i++) {
        const barHeight = Math.random() * canvas.height * 0.7 + canvas.height * 0.3
        const x = i * barWidth
        const y = (canvas.height - barHeight) / 2

        ctx.fillRect(x, y, barWidth - barGap, barHeight)
      }
    }
  }, [currentTime, duration])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current
    const canvas = canvasRef.current
    if (!audio || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = x / rect.width
    audio.currentTime = progress * duration
  }

  const handleRestart = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audio-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-teal-300 hover:text-teal-200 hover:bg-teal-900/20 flex-shrink-0"
        onClick={togglePlayPause}
        disabled={isLoading}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      {/* Waveform Canvas */}
      <div className="flex-1 relative h-12">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer rounded"
          onClick={handleSeek}
        />
      </div>

      {/* Time Display */}
      <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Restart Button */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-gray-400 hover:text-white flex-shrink-0"
        onClick={handleRestart}
        disabled={isLoading}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* Download Button */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-gray-400 hover:text-white flex-shrink-0"
        onClick={handleDownload}
        disabled={isLoading}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  )
}
