"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Play,
  Trash2,
  Plus,
  Sparkles,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Download,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Note: To enable audio previews and faceless video generation locally without Docker,
// set these env vars in .env.local:
// NEXT_PUBLIC_PLAYHT_SERVICE_URL=http://localhost:8001
// FACELESS_VIDEO_SERVICE_URL=http://localhost:8005

type Voice = {
  id: string
  name: string
  sampleUrl?: string
  gender?: string
  accent?: string
  language?: string
}

// Image style options with distinct SVG thumbnail placeholders.
// Replace any of these SVGs with real artwork by adding new assets under
// /public/creative-studio/contentimages and updating the thumb path.
const IMAGE_STYLES = [
  { id: "default", name: "Default", thumb: "/creative-studio/contentimages/default.svg" },
  { id: "pixar-art", name: "Pixar Art", thumb: "/creative-studio/contentimages/pixar-art.svg" },
  { id: "anime", name: "Anime", thumb: "/creative-studio/contentimages/anime.svg" },
  { id: "comic-book", name: "Comic Book", thumb: "/creative-studio/contentimages/comic-book.svg" },
  { id: "lego", name: "Lego", thumb: "/creative-studio/contentimages/lego.svg" },
  { id: "cinematic", name: "Cinematic", thumb: "/creative-studio/contentimages/cinematic.svg" },
  { id: "watercolor", name: "Watercolor", thumb: "/creative-studio/contentimages/watercolor.svg" },
]

// Suggested prompts from screenshots
const SUGGESTED_PROMPTS = [
  "How AI will change our daily lives in the next 10 years",
  "Exploring the mysterious depths of the ocean and its creatures",
]

export default function FacelessVideoGenerator() {
  const [videoIdea, setVideoIdea] = useState("")
  const [quickPace, setQuickPace] = useState(false)
  const [outputLanguage, setOutputLanguage] = useState("English")
  const [tone, setTone] = useState("Neutral")
  const [videoScenes, setVideoScenes] = useState([10])
  const [videoTitle, setVideoTitle] = useState("")
  const [scenes, setScenes] = useState([
    { id: 1, text: "In a world of endless possibilities..." },
    { id: 2, text: "This is your 2nd scene (3-100 characters)" },
    { id: 3, text: "This is your 3rd scene (3-100 characters)" },
    { id: 4, text: "This is your 4th scene (3-100 characters)" },
  ])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("Choose a voice")
  const [selectedImageStyle, setSelectedImageStyle] = useState("default")
  const [frameSize, setFrameSize] = useState<"16:9" | "9:16" | "1:1">("16:9")
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "complete">("idle")
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  // Cache for generated preview URLs so we don't re-generate every click
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({})
  // Voices state (fetched from API)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false)
  const [voiceSearch, setVoiceSearch] = useState("")
  // FAL content generation (script drafting)
  const [scriptPrompt, setScriptPrompt] = useState("")
  const [scriptDraft, setScriptDraft] = useState<string|null>(null)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [scriptError, setScriptError] = useState<string|null>(null)

  // Load all voices once
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/voice/voices", { headers: { "x-user-id": "user_123" } })
        if (!res.ok) throw new Error("Failed to load voices")
        const data = await res.json()
        if (!cancelled) {
          setVoices(Array.isArray(data.voices) ? data.voices : [])
          setVoicesLoaded(true)
          // Preselect first voice for convenience
          const first = data.voices?.[0]
          if (first) {
            setSelectedVoiceId(first.id)
            setSelectedVoiceName(first.name || first.id)
          }
        }
      } catch (e) {
        console.error("Error loading voices:", e)
        setVoicesLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Compute absolute URL for audio served by playht-service
  const toAbsoluteAudioUrl = (audioUrl: string) => {
    // If service returned a relative "/audio/...", prefix local service URL
    if (audioUrl.startsWith("/audio/")) {
      const base = (process.env.NEXT_PUBLIC_PLAYHT_SERVICE_URL || "http://localhost:8001").replace(/\/$/, "")
      return `${base}${audioUrl}`
    }
    return audioUrl
  }

  const handleGenerate = async () => {
    if (!videoIdea.trim()) return

    setGenerationStatus("generating")

    try {
      const response = await fetch("/api/video/faceless/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoIdea,
          quickPace,
          outputLanguage,
          tone,
          videoScenes: videoScenes[0],
          videoTitle,
          scenes,
          voice: selectedVoiceName,
          voice_id: selectedVoiceId,
          imageStyle: selectedImageStyle,
          frameSize,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Poll for completion
        const jobId = data.jobId
        let pollAttempts = 0
        const maxPollAttempts = 200 // 10 minutes max (3 second intervals)
        
        const pollInterval = setInterval(async () => {
          pollAttempts++
          
          try {
            const statusResponse = await fetch(`/api/video/faceless/status?jobId=${jobId}`)
            const statusData = await statusResponse.json()

            if (statusData.status === "complete") {
              clearInterval(pollInterval)
              setGenerationStatus("complete")
              setGeneratedVideoUrl(statusData.videoUrl)
            } else if (statusData.status === "failed") {
              clearInterval(pollInterval)
              setGenerationStatus("idle")
              console.error("Generation failed:", statusData.error)
            } else if (statusData.status === "not_found" || !statusData.success) {
              // Job not found or expired - stop polling
              clearInterval(pollInterval)
              setGenerationStatus("idle")
              console.error("Job not found or expired:", jobId)
            } else if (pollAttempts >= maxPollAttempts) {
              // Timeout - stop polling
              clearInterval(pollInterval)
              setGenerationStatus("idle")
              console.error("Video generation timed out")
            }
          } catch (error) {
            console.error("Error polling status:", error)
          }
        }, 3000)
      } else {
        throw new Error(data.error || "Failed to generate video")
      }
    } catch (error) {
      console.error("Generation error:", error)
      setGenerationStatus("idle")
    }
  }

  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) return
    setGeneratingScript(true)
    setScriptError(null)
    setScriptDraft(null)
    try {
      const res = await fetch('/api/fal/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scriptPrompt })
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }
      setScriptDraft(data.draft || '')
    } catch (e:any) {
      setScriptError(e.message || 'Unknown error')
    } finally {
      setGeneratingScript(false)
    }
  }

  const playVoicePreview = async (v: Voice) => {
    const voiceId = v.id
    const audioEl = audioRef.current
    if (!audioEl) return

    // Toggle pause if same voice is playing
    if (playingVoiceId === voiceId && !audioEl.paused) {
      audioEl.pause()
      setPlayingVoiceId(null)
      return
    }

    try {
      // Prefer provided sampleUrl
      let url = v.sampleUrl || previewCache[voiceId]
      if (!url) {
        // Generate a short sample via API
        const sampleText = `Hi! This is a quick preview of the ${v.name || v.id} voice.`
        const res = await fetch("/api/voice/tts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": "user_123" },
          body: JSON.stringify({
            text: sampleText,
            voice_id: voiceId,
            voice_name: v.name || voiceId,
            language: "english",
            speed: 1.0,
            quality: "low"
          })
        })
        if (!res.ok) throw new Error("Failed to generate preview audio")
        const data = await res.json()
        url = toAbsoluteAudioUrl(data.audio_url)
        setPreviewCache((prev) => ({ ...prev, [voiceId]: url! }))
      }

      if (!url) throw new Error("No audio URL available")
      audioEl.src = url
      await audioEl.play()
      setPlayingVoiceId(voiceId)
    } catch (e) {
      console.warn("Preview play failed", e)
      setPlayingVoiceId(null)
    }
  }

  // Pause indicator reset when audio ends
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnd = () => setPlayingVoiceId(null)
    el.addEventListener("ended", onEnd)
    return () => el.removeEventListener("ended", onEnd)
  }, [])

  const addScene = () => {
    const newSceneNumber = scenes.length + 1
    setScenes([
      ...scenes,
      { id: newSceneNumber, text: `This is your ${newSceneNumber}th scene (3-100 characters)` },
    ])
  }

  const removeScene = (id: number) => {
    if (scenes.length > 1) {
      setScenes(scenes.filter((scene) => scene.id !== id))
    }
  }

  const updateScene = (id: number, text: string) => {
    setScenes(scenes.map((scene) => (scene.id === id ? { ...scene, text } : scene)))
  }

  const useSuggestedPrompt = (prompt: string) => {
    setVideoIdea(prompt)
  }

  return (
    <div className="h-screen min-h-0 bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0a0a0a] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Video className="w-6 h-6 text-teal-400" />
              <h1 className="text-xl font-bold">What is your video about?</h1>
            </div>
          </div>
          {generationStatus === "complete" && generatedVideoUrl && (
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Download className="w-4 h-4 mr-2" />
              Download Video
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-24">
        {/* Video Idea Input Section */}
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-3">Write your idea or reference content</p>
            <div className="relative">
              <Textarea
                placeholder="Type in your ideas or paste reference content."
                value={videoIdea}
                onChange={(e) => setVideoIdea(e.target.value)}
                className="min-h-[200px] bg-[#111111] border-gray-800 text-white placeholder-gray-500 text-base resize-none focus:border-teal-500 focus:ring-teal-500"
                maxLength={20000}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {videoIdea.length}/20000
              </div>
            </div>
          </div>

          {/* Generate Button and Quick Pace */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={generationStatus === "generating" || !videoIdea.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-base font-medium"
            >
              {generationStatus === "generating" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate
                </>
              )}
            </Button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={quickPace}
                onChange={(e) => setQuickPace(e.target.checked)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-gray-300">Quick pace</span>
            </label>
          </div>

          {/* Suggested Prompts */}
          <div className="space-y-2">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => useSuggestedPrompt(prompt)}
                className="flex items-center gap-2 text-sm text-teal-300 hover:text-teal-200 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* AI Script Draft Section */}
          <div className="mt-8 space-y-3 border-t border-gray-800 pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-semibold">AI Script Draft</h2>
            </div>
            <p className="text-sm text-gray-400">Generate a structured script draft from your idea. You can refine it after generation.</p>
            <Textarea
              placeholder="Enter or refine a prompt for the script draft..."
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              className="min-h-[140px] bg-[#111111] border-gray-800 text-white placeholder-gray-500 text-sm resize-none focus:border-teal-500 focus:ring-teal-500"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleGenerateScript}
                disabled={generatingScript || !scriptPrompt.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {generatingScript ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Script
                  </>
                )}
              </Button>
              {scriptDraft && (
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(scriptDraft)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Copy Draft
                </Button>
              )}
            </div>
            {scriptError && <p className="text-sm text-red-400">{scriptError}</p>}
            {generatingScript && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                Drafting...
              </div>
            )}
            {scriptDraft && !generatingScript && (
              <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 max-h-[320px] overflow-y-auto text-sm whitespace-pre-wrap">
                {scriptDraft}
              </div>
            )}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Output Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Output language</label>
            <Select value={outputLanguage} onValueChange={setOutputLanguage}>
              <SelectTrigger className="bg-[#111111] border-gray-800 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
                <SelectItem value="Chinese">Chinese</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-[#111111] border-gray-800 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Neutral">Neutral</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="Serious">Serious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Video Scenes Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Video Scenes (10)</label>
              <span className="text-xs text-gray-500">ℹ️</span>
            </div>
            <div className="pt-2">
              <Slider
                value={videoScenes}
                onValueChange={setVideoScenes}
                min={4}
                max={16}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4</span>
                <span>16</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Video Title <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500">Enter a title for your video</p>
          <Input
            placeholder="Enter video title..."
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            maxLength={100}
            className="bg-[#1a1f2e] border-gray-700 text-white placeholder-gray-500 h-11"
          />
          <div className="text-right text-xs text-gray-500">{videoTitle.length}/100</div>
        </div>

        {/* Scene Editor */}
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Write your story in up to 16 scenes. Each scene (max 100 characters) will be transformed into a unique
            image.
          </p>

          {scenes.map((scene, index) => (
            <div key={scene.id} className="relative">
              <div className="absolute left-3 top-3 z-10">
                  <Badge className="bg-teal-600 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center">
                  {index + 1}
                </Badge>
              </div>
              <div className="relative flex items-center gap-2">
                <Input
                  value={scene.text}
                  onChange={(e) => updateScene(scene.id, e.target.value)}
                  placeholder={`This is your ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} scene (3-100 characters)`}
                  maxLength={100}
                    className="bg-[#111111] border-gray-800 text-white placeholder-gray-500 pl-14 pr-24 h-12"
                />
                <div className="absolute right-12 text-xs text-gray-500">{scene.text.length}/100</div>
                {scenes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeScene(scene.id)}
                    className="absolute right-2 text-gray-400 hover:text-red-400 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {index < scenes.length - 1 && (
                <div className="flex justify-center my-2">
                  <button
                    onClick={addScene}
                    title="Add scene"
                      className="w-8 h-8 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center text-gray-500 hover:text-teal-300 hover:border-teal-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {scenes.length < 16 && (
            <div className="flex justify-center">
              <button
                onClick={addScene}
                title="Add another scene"
                  className="w-8 h-8 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center text-gray-500 hover:text-teal-300 hover:border-teal-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Voice Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center">
              <Play className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-base font-semibold">Choose a Voice</h3>
          </div>
          <p className="text-sm text-gray-400">Select the perfect voice for your content</p>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-200 hover:bg-gray-800"
              onClick={() => setIsVoicePickerOpen(true)}
            >
              {voicesLoaded ? (selectedVoiceName || "Choose a voice") : "Loading voices..."}
            </Button>
            {selectedVoiceId && (
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white"
                onClick={() => {
                  const v = voices.find(v => v.id === selectedVoiceId)
                  if (v) playVoicePreview(v)
                }}
                title="Preview selected voice"
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
            <audio ref={audioRef} className="hidden" />
          </div>

          {isVoicePickerOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
              <div className="m-auto bg-[#0b0b0b] border border-gray-800 rounded-xl w-[90vw] max-w-5xl h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                  <Input
                    placeholder="Search voices..."
                    value={voiceSearch}
                    onChange={(e) => setVoiceSearch(e.target.value)}
                    className="bg-[#111111] border-gray-800 text-white placeholder-gray-500"
                  />
                  <Button onClick={() => setIsVoicePickerOpen(false)} className="ml-auto bg-teal-600 hover:bg-teal-700">Close</Button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-900">
                  {(voices || []).filter(v => {
                    const q = voiceSearch.trim().toLowerCase()
                    if (!q) return true
                    return (v.name || v.id).toLowerCase().includes(q)
                  }).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-4 hover:bg-[#101010]">
                      <div className="flex-1">
                        <div className="text-sm text-gray-200">{v.name || v.id}</div>
                        <div className="text-xs text-gray-500">{[v.gender, v.accent, v.language].filter(Boolean).join(" · ")}</div>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-gray-300 hover:text-white"
                        onClick={() => playVoicePreview(v)}
                        title="Play sample"
                      >
                        {playingVoiceId === v.id ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => {
                          setSelectedVoiceId(v.id)
                          setSelectedVoiceName(v.name || v.id)
                          setIsVoicePickerOpen(false)
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image Style Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-base font-semibold">Choose an Image Style</h3>
          </div>
          <p className="text-sm text-gray-400">Select the style for your content's images</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {IMAGE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedImageStyle(style.id)}
                className={`relative rounded-lg overflow-hidden border transition-all text-left ${
                  selectedImageStyle === style.id
                    ? "border-teal-600 ring-2 ring-teal-600"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="relative w-full aspect-[4/5]">
                  <Image src={style.thumb} alt={style.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full border border-teal-700 flex items-center justify-center">
                  {selectedImageStyle === style.id ? (
                    <CheckCircle className="w-4 h-4 text-teal-400" />
                  ) : (
                    <span className="block w-2 h-2 rounded-full bg-gray-600" />
                  )}
                </div>
                <div className="px-2 py-2">
                  <div className="text-sm font-medium text-gray-200">{style.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Frame Size Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </div>
            <h3 className="text-base font-semibold">Choose a Frame Size</h3>
          </div>
          <p className="text-sm text-gray-400">Select the aspect ratio for your video</p>

          <div className="flex items-center gap-3">
            {["16:9","9:16","1:1"].map((opt) => (
              <button
                key={opt}
                onClick={() => setFrameSize(opt as any)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  frameSize === opt ? "bg-[#111111] border-teal-600 text-white" : "bg-[#0a0a0a] border-gray-800 text-gray-300 hover:border-gray-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Generation Progress */}
        {generationStatus === "generating" && (
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
              <h3 className="text-lg font-semibold">Generating Your Video...</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Story Generation</span>
                <span className="text-teal-400">Complete</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Image Generation</span>
                <span className="text-yellow-400">In Progress...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Audio Generation</span>
                <span className="text-gray-600">Pending</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Video Assembly</span>
                <span className="text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        )}

        {/* Video Preview */}
        {generationStatus === "complete" && generatedVideoUrl && (
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Video is Ready!</h3>
              <CheckCircle className="w-6 h-6 text-teal-500" />
            </div>
            <div className="aspect-[9/16] max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
              <video src={generatedVideoUrl} controls className="w-full h-full">
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                Generate Another
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
