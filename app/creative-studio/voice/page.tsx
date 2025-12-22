"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Trash2,
  Copy,
  RefreshCw,
  Settings,
  Upload,
  Check,
  Volume2,
  Sparkles,
  Loader2,
  Mic,
} from "lucide-react"
import Link from "next/link"
import { AudioPlayer } from "@/components/voice/audio-player"
import { VoiceCloningModal } from "@/components/voice/voice-cloning-modal"
import { useToast } from "@/hooks/use-toast"

// Voice data structure
interface VoiceParagraph {
  id: string
  text: string
  voice: Voice
  language: string
  speed: number
  temperature?: number
  emotion?: string
  voice_guidance?: number
  style_guidance?: number
  text_guidance?: number
  audioUrl?: string
  isGenerating?: boolean
  isPlaying?: boolean
}

interface Voice {
  id: string
  name: string
  gender?: string
  accent?: string
  language?: string
  hasEmotions?: boolean
  isCloned?: boolean
  sampleUrl?: string | null
}

const LANGUAGES = [
  "Auto-Detect",
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Russian",
]

const SAMPLE_SCRIPTS = [
  { name: "Customer Support", text: "Thank you for contacting our support team. I'm here to help you resolve this issue quickly." },
  { name: "Children's Story", text: "Once upon a time, in a magical forest, there lived a brave little rabbit named Fluffy." },
  { name: "Podcast", text: "Welcome back to another episode. Today we're diving deep into the world of artificial intelligence." },
]

export default function VoiceStudioPage() {
  const { toast } = useToast()
  
  const [paragraphs, setParagraphs] = useState<VoiceParagraph[]>([
    {
      id: "1",
      text: "",
      voice: { id: "", name: "Select a voice..." },
      language: "Auto-Detect",
      speed: 1.0,
    },
  ])
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null)
  const [selectedVoiceInModal, setSelectedVoiceInModal] = useState<Voice | null>(null)
  const [showCloningModal, setShowCloningModal] = useState(false)
  const [premadeVoices, setPremadeVoices] = useState<Voice[]>([])
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [voicesError, setVoicesError] = useState<string | null>(null)
  const [voiceSearch, setVoiceSearch] = useState("")
  const [voiceGender, setVoiceGender] = useState<string | undefined>(undefined)
  const [voiceStyle, setVoiceStyle] = useState<string | undefined>(undefined)
  const [voiceAccent, setVoiceAccent] = useState<string | undefined>(undefined)
  // Token constants for select components (avoid empty string values which Radix forbids)
  const EMOTION_NONE = "__none";
  const GENDER_ANY = "__any";
  const [voiceLang, setVoiceLang] = useState<string | undefined>(undefined)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [usage, setUsage] = useState({ used: 0, limit: 2500, remaining: 2500 })
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<Set<string>>(new Set())
  const [recentVoices, setRecentVoices] = useState<Voice[]>([])
  const [activeTab, setActiveTab] = useState<string>("premade")
  const [renamingVoiceId, setRenamingVoiceId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>("")

  // Load voices from API on mount
  useEffect(() => {
    loadVoices()
    // Load favorites and recent lists when modal opens
  }, [])

  useEffect(() => {
    if (showVoiceSelector) {
      void loadFavorites()
      void loadRecent()
    }
  }, [showVoiceSelector])

  const loadVoices = async () => {
    try {
      setVoicesLoading(true)
      setVoicesError(null)
      const qs = new URLSearchParams()
      if (voiceSearch) qs.set("q", voiceSearch)
      if (voiceGender) qs.set("gender", voiceGender)
      if (voiceLang) qs.set("language", voiceLang)
      if (voiceStyle) qs.set("style", voiceStyle)
      if (voiceAccent) qs.set("accent", voiceAccent)
      const response = await fetch(`/api/voice/voices${qs.toString() ? `?${qs.toString()}` : ""}` , {
        headers: { "x-user-id": "user_123" }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to load voices")
      }
      
      const data = await response.json()

      const premade = (data.voices as Voice[]).filter((v) => !v.isCloned)
      const cloned = (data.voices as Voice[]).filter((v) => v.isCloned)
      
      setPremadeVoices(premade)
      setClonedVoices(cloned)
      
      console.log(`[voices] Loaded ${premade.length} premade and ${cloned.length} cloned voices`)
    } catch (error) {
      console.error("Error loading voices:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load voices"
      setVoicesError(errorMessage)
      toast({
        title: "Error loading voices",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setVoicesLoading(false)
    }
  }

  const deleteClonedVoice = async (voiceId: string) => {
    try {
      const res = await fetch(`/api/voice/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": "user_123"
        }
      })
      if (!res.ok) {
        let detail: any = null
        try { detail = await res.json() } catch {}
        throw new Error(detail?.error || `Failed to delete voice (${res.status})`)
      }
      setClonedVoices(clonedVoices.filter(v => v.id !== voiceId))
      toast({
        title: "Voice deleted",
        description: `Removed cloned voice ${voiceId}.`
      })
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive"
      })
    }
  }

  const startRename = (voiceId: string, currentName: string) => {
    setRenamingVoiceId(voiceId)
    setRenameValue(currentName)
  }

  const submitRename = async () => {
    if (!renamingVoiceId) return
    const newName = renameValue.trim()
    if (newName.length < 2) {
      toast({ title: "Invalid name", description: "Name must be at least 2 characters.", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/voice/voices/${renamingVoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": "user_123" },
        body: JSON.stringify({ name: newName })
      })
      if (!res.ok) {
        let detail: any = null
        try { detail = await res.json() } catch {}
        throw new Error(detail?.error || `Rename failed (${res.status})`)
      }
      setClonedVoices(clonedVoices.map(v => v.id === renamingVoiceId ? { ...v, name: newName } : v))
      toast({ title: "Voice renamed", description: `Updated to '${newName}'.` })
    } catch (e) {
      toast({ title: "Rename error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setRenamingVoiceId(null)
      setRenameValue("")
    }
  }

  const addParagraph = () => {
    setParagraphs([
      ...paragraphs,
      {
        id: Date.now().toString(),
        text: "",
        voice: premadeVoices.length > 0 ? premadeVoices[0] : { id: "", name: "Select a voice..." },
        language: "Auto-Detect",
        speed: 1.0,
        temperature: 0.7,
        emotion: undefined,
        voice_guidance: 3.0,
        style_guidance: 20.0,
        text_guidance: 2.0,
      },
    ])
  }

  const updateParagraph = (id: string, updates: Partial<VoiceParagraph>) => {
    setParagraphs(paragraphs.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteParagraph = (id: string) => {
    if (paragraphs.length > 1) {
      setParagraphs(paragraphs.filter((p) => p.id !== id))
    }
  }

  const openVoiceSelector = (paragraphId: string) => {
    setSelectedParagraphId(paragraphId)
    const currentVoice = paragraphs.find((p) => p.id === paragraphId)?.voice
    setSelectedVoiceInModal(currentVoice || null)
    setShowVoiceSelector(true)
  }

  const togglePreview = (voice: Voice) => {
    if (!voice.sampleUrl) return
    // Stop if currently playing same voice
    if (playingId === voice.id) {
      audio?.pause()
      setPlayingId(null)
      return
    }
    // Stop previous
    if (audio) {
      audio.pause()
    }
    const el = new Audio(voice.sampleUrl)
    el.onended = () => setPlayingId(null)
    setAudio(el)
    setPlayingId(voice.id)
    void el.play()
  }

  // Favorites API helpers
  const loadFavorites = async () => {
    try {
      const res = await fetch("/api/voice/favorites", { headers: { "x-user-id": "user_123" } })
      if (!res.ok) return
      const data = await res.json()
      setFavoriteVoiceIds(new Set((data.favorites as any[]).map(f => f.voice_id)))
    } catch {}
  }

  const toggleFavorite = async (voice: Voice) => {
    try {
      const isFav = favoriteVoiceIds.has(voice.id)
      if (isFav) {
        await fetch("/api/voice/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-user-id": "user_123" },
          body: JSON.stringify({ voice_id: voice.id })
        })
        const next = new Set(favoriteVoiceIds)
        next.delete(voice.id)
        setFavoriteVoiceIds(next)
      } else {
        await fetch("/api/voice/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": "user_123" },
          body: JSON.stringify({ voice_id: voice.id, voice_name: voice.name })
        })
        const next = new Set(favoriteVoiceIds)
        next.add(voice.id)
        setFavoriteVoiceIds(next)
      }
    } catch (e) {
      console.error("toggleFavorite error", e)
    }
  }

  const loadRecent = async () => {
    try {
      const res = await fetch("/api/voice/recent", { headers: { "x-user-id": "user_123" } })
      if (!res.ok) return
      const data = await res.json()
      // Map to Voice minimal objects if possible (name from API), otherwise just id/name
      const minimal: Voice[] = (data.recent as any[]).map(r => ({ id: r.voice_id, name: r.voice_name || r.voice_id }))
      setRecentVoices(minimal)
    } catch {}
  }

  const confirmVoiceSelection = () => {
    if (selectedParagraphId && selectedVoiceInModal) {
      updateParagraph(selectedParagraphId, { voice: selectedVoiceInModal })
      setShowVoiceSelector(false)
    }
  }

  const generateSpeech = async (id: string) => {
    const para = paragraphs.find((p) => p.id === id)
    if (!para || !para.text.trim()) {
      toast({
        title: "Cannot generate",
        description: "Please enter some text first.",
        variant: "destructive"
      })
      return
    }

    updateParagraph(id, { isGenerating: true })

    try {
      const fetchWithRetry = async (url: string, init: RequestInit, retries = 1, timeoutMs = 240000): Promise<Response> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), timeoutMs)
          try {
            const res = await fetch(url, { ...init, signal: controller.signal })
            clearTimeout(timer)
            if (res.ok) return res
            // Retry on 5xx or network-style failures
            if (attempt < retries && (res.status >= 500 || res.status === 429)) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
              continue
            }
            return res
          } catch (err) {
            clearTimeout(timer)
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
              continue
            }
            throw err
          }
        }
        throw new Error("Retries exhausted")
      }

      const response = await fetchWithRetry("/api/voice/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user_123"
        },
        body: JSON.stringify({
          text: para.text,
          voice_id: para.voice.id,
          voice_name: para.voice.name,
          language: para.language.toLowerCase(),
          speed: para.speed,
          quality: "medium",
          temperature: para.temperature ?? 0.7,
          emotion: para.emotion,
          voice_guidance: para.voice_guidance ?? 3.0,
          style_guidance: para.style_guidance ?? 20.0,
          text_guidance: para.text_guidance ?? 2.0,
        })
      })

      if (!response.ok) {
        let detail: any = null
        try { detail = await response.json() } catch {}
        throw new Error(detail?.error || `Failed to generate speech (status ${response.status})`)
      }

      const data = await response.json()
      
      updateParagraph(id, {
        isGenerating: false,
        audioUrl: data.audio_url,
      })

      // Update usage statistics
      if (data.usage) {
        setUsage({
          used: data.usage.characters_used,
          limit: data.usage.limit,
          remaining: data.usage.remaining
        })
      }

      toast({
        title: "Speech generated!",
        description: `${data.character_count} characters used. ${usage.remaining} remaining this month.`,
      })

    } catch (error) {
      updateParagraph(id, { isGenerating: false })
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    }
  }

  const generateAllSpeech = async () => {
    const validParagraphs = paragraphs.filter(p => p.text.trim())
    
    if (validParagraphs.length === 0) {
      toast({
        title: "Cannot generate",
        description: "Please add some text to generate speech.",
        variant: "destructive"
      })
      return
    }

    // Mark all as generating
    validParagraphs.forEach(p => updateParagraph(p.id, { isGenerating: true }))

    try {
      const fetchWithRetry = async (url: string, init: RequestInit, retries = 1, timeoutMs = 240000): Promise<Response> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), timeoutMs)
          try {
            const res = await fetch(url, { ...init, signal: controller.signal })
            clearTimeout(timer)
            if (res.ok) return res
            if (attempt < retries && (res.status >= 500 || res.status === 429)) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
              continue
            }
            return res
          } catch (err) {
            clearTimeout(timer)
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
              continue
            }
            throw err
          }
        }
        throw new Error("Retries exhausted")
      }

      const response = await fetchWithRetry("/api/voice/tts/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user_123"
        },
        body: JSON.stringify({
          paragraphs: validParagraphs.map(p => ({
            text: p.text,
            voice_id: p.voice.id,
            voice_name: p.voice.name,
            language: p.language.toLowerCase(),
            speed: p.speed,
            quality: "medium",
            temperature: p.temperature ?? 0.7,
            emotion: p.emotion,
          }))
        })
      })

      if (!response.ok) {
        let detail: any = null
        try { detail = await response.json() } catch {}
        throw new Error(detail?.error || `Failed to generate batch (status ${response.status})`)
      }

      const data = await response.json()
      
      // Update each paragraph with its audio URL
      data.items.forEach((item: any, index: number) => {
        if (item.audio_url) {
          updateParagraph(validParagraphs[index].id, {
            isGenerating: false,
            audioUrl: item.audio_url
          })
        } else {
          updateParagraph(validParagraphs[index].id, { isGenerating: false })
        }
      })

      // Update usage
      if (data.usage) {
        setUsage({
          used: data.usage.characters_used,
          limit: data.usage.limit,
          remaining: data.usage.remaining
        })
      }

      toast({
        title: "Batch generation complete!",
        description: `Generated ${data.items.length} audio files. ${data.total_characters} characters used.`,
      })

    } catch (error) {
      // Reset all generating states
      validParagraphs.forEach(p => updateParagraph(p.id, { isGenerating: false }))
      
      toast({
        title: "Batch generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    }
  }

  const handleVoiceCloned = (voice: any) => {
    const newVoice: Voice = {
      id: voice.playht_voice_id || voice.id,
      name: voice.name,
      gender: "N/A",
      accent: "Custom",
      language: "English",
      hasEmotions: false,
      isCloned: true
    }
    
    setClonedVoices([...clonedVoices, newVoice])
    // Refresh full voices list so new clone appears everywhere consistently
    void loadVoices()
    
    toast({
      title: "Voice cloned successfully!",
      description: `"${voice.name}" is now available in your voice library.`,
    })
  }

  const characterCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0)

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Voice & TTS Studio</h1>
            <p className="text-sm text-gray-500">
              {characterCount} characters | {usage.used} / {usage.limit} used this month
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            onClick={() => setShowCloningModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Clone Voice
          </Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700"
            onClick={generateAllSpeech}
            disabled={paragraphs.some(p => p.isGenerating)}
          >
            {paragraphs.some(p => p.isGenerating) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 text-teal-300" />
                Generate All
              </>
            )}
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Paragraphs */}
        <div className="space-y-4 mb-6">
          {paragraphs.map((para) => (
            <div key={para.id} className="border border-gray-800 rounded-lg bg-[#0f0f0f] p-4">
              {/* Controls */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => openVoiceSelector(para.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 rounded-md text-teal-400 text-sm transition-colors border border-teal-600/30"
                >
                  <Volume2 className="w-4 h-4" />
                  <span className="font-medium">{para.voice.name}</span>
                </button>

                <Select value={para.language} onValueChange={(val) => updateParagraph(para.id, { language: val })}>
                  <SelectTrigger className="w-36 bg-[#1a1a1a] border-gray-700 text-gray-300 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Emotion selector */}
                <Select value={para.emotion ?? EMOTION_NONE} onValueChange={(val) => updateParagraph(para.id, { emotion: val === EMOTION_NONE ? undefined : val })}>
                  <SelectTrigger className="w-36 bg-[#1a1a1a] border-gray-700 text-gray-300 h-8 text-sm">
                    <SelectValue placeholder="Emotion (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMOTION_NONE}>None</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="happy">Happy</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="excited">Excited</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                  </SelectContent>
                </Select>

                {/* Style controls popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 border-gray-700 text-gray-300 bg-transparent">
                      <Settings className="w-4 h-4 mr-2" /> Style
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-[#0f0f0f] border border-gray-800 text-white">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Speed</span>
                          <span>{para.speed.toFixed(2)}x</span>
                        </div>
                        <Slider value={[para.speed]} min={0.5} max={1.5} step={0.01} onValueChange={(v) => updateParagraph(para.id, { speed: v[0] })} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Temperature</span>
                          <span>{(para.temperature ?? 0.7).toFixed(2)}</span>
                        </div>
                        <Slider value={[para.temperature ?? 0.7]} min={0} max={1} step={0.01} onValueChange={(v) => updateParagraph(para.id, { temperature: v[0] })} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Voice guidance</span>
                          <span>{(para.voice_guidance ?? 3).toFixed(1)}</span>
                        </div>
                        <Slider value={[para.voice_guidance ?? 3]} min={0} max={10} step={0.1} onValueChange={(v) => updateParagraph(para.id, { voice_guidance: v[0] })} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Style guidance</span>
                          <span>{(para.style_guidance ?? 20).toFixed(1)}</span>
                        </div>
                        <Slider value={[para.style_guidance ?? 20]} min={0} max={40} step={0.5} onValueChange={(v) => updateParagraph(para.id, { style_guidance: v[0] })} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Text guidance</span>
                          <span>{(para.text_guidance ?? 2).toFixed(1)}</span>
                        </div>
                        <Slider value={[para.text_guidance ?? 2]} min={0} max={10} step={0.1} onValueChange={(v) => updateParagraph(para.id, { text_guidance: v[0] })} />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="ml-auto flex items-center gap-2">
                  {para.audioUrl && (
                    <Button size="sm" variant="ghost" className="h-8 text-gray-400 hover:text-white">
                      {para.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-gray-400 hover:text-red-400"
                    onClick={() => deleteParagraph(para.id)}
                    disabled={paragraphs.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Text Input */}
              <Textarea
                placeholder="Type here..."
                value={para.text}
                onChange={(e) => updateParagraph(para.id, { text: e.target.value })}
                className="min-h-[100px] bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500 resize-none focus:border-teal-500"
              />

              {/* Generate Button */}
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={() => generateSpeech(para.id)}
                  disabled={!para.text.trim() || para.isGenerating}
                  className="bg-teal-600 hover:bg-teal-700"
                  size="sm"
                >
                  {para.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : para.audioUrl ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-teal-300" />
                      Generate Speech
                    </>
                  )}
                </Button>
              </div>

              {/* Audio Player */}
              {para.audioUrl && !para.isGenerating && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <AudioPlayer audioUrl={para.audioUrl} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Paragraph Button */}
        <Button
          onClick={addParagraph}
          variant="outline"
          className="w-full border-gray-800 border-dashed text-gray-400 hover:text-white hover:border-teal-500 bg-transparent"
        >
          + Add Paragraph
        </Button>

        {/* Sample Scripts */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-teal-300" />
            <h3 className="text-lg font-semibold">Try a Sample Script</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SAMPLE_SCRIPTS.map((script) => (
              <button
                key={script.name}
                onClick={() => updateParagraph(paragraphs[0].id, { text: script.text })}
                className="p-4 bg-[#1a1a1a] hover:bg-[#222] rounded-lg border border-gray-800 text-left transition-colors"
              >
                <div className="text-sm font-medium text-white">{script.name}</div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Voice Selector Modal */}
      <Dialog open={showVoiceSelector} onOpenChange={setShowVoiceSelector}>
        <DialogContent className="max-w-3xl bg-[#0a0a0a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Your Voice</DialogTitle>
          </DialogHeader>

          {/* Quick Recently used row */}
          {recentVoices.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-2">Recently used</div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {recentVoices.slice(0, 8).map(v => (
                  <button key={v.id} className={`px-3 py-1.5 rounded-md text-xs border ${selectedVoiceInModal?.id === v.id ? 'border-teal-600 text-teal-300 bg-teal-900/20' : 'border-gray-800 bg-[#1a1a1a] text-gray-300'}`} onClick={() => setSelectedVoiceInModal(v)}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="premade">
            <TabsList className="bg-[#1a1a1a] border-gray-800 w-fit">
              <TabsTrigger value="premade" onClick={() => setActiveTab("premade")}>Pre-made</TabsTrigger>
              <TabsTrigger value="favorites" onClick={() => setActiveTab("favorites")}>Favorites</TabsTrigger>
              <TabsTrigger value="recent" onClick={() => setActiveTab("recent")}>Recent</TabsTrigger>
              <TabsTrigger value="cloned" onClick={() => setActiveTab("cloned")}>Cloned</TabsTrigger>
            </TabsList>

            <TabsContent value="premade" className="mt-4">
              {/* Filters */}
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Search voices"
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                  className="bg-[#1a1a1a] border-gray-800 text-sm"
                />
                <Select value={voiceGender ?? GENDER_ANY} onValueChange={(v) => setVoiceGender(v === GENDER_ANY ? undefined : v)}>
                  <SelectTrigger className="w-32 bg-[#1a1a1a] border-gray-700 text-gray-300 h-9 text-sm">
                    <SelectValue placeholder="Any gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENDER_ANY}>Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {/* Accent filter */}
                <Select value={voiceAccent} onValueChange={(v) => setVoiceAccent(v === "__any" ? undefined : v)}>
                  <SelectTrigger className="w-36 bg-[#1a1a1a] border-gray-700 text-gray-300 h-9 text-sm">
                    <SelectValue placeholder="Any accent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any</SelectItem>
                    {[...new Set(premadeVoices.map(v => v.accent).filter(Boolean))]
                      .sort()
                      .map((a) => (
                        <SelectItem key={String(a)} value={String(a)}>{String(a)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={voiceLang} onValueChange={(v) => setVoiceLang(v)}>
                  <SelectTrigger className="w-36 bg-[#1a1a1a] border-gray-700 text-gray-300 h-9 text-sm">
                    <SelectValue placeholder="Any language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l.toLowerCase()}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Style/category filter */}
                <Select value={voiceStyle} onValueChange={(v) => setVoiceStyle(v === "__any" ? undefined : v)}>
                  <SelectTrigger className="w-40 bg-[#1a1a1a] border-gray-700 text-gray-300 h-9 text-sm">
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any</SelectItem>
                    {[...new Set((premadeVoices as any[]).map((v: any) => (v as any).style || (v as any)._meta?.style).filter(Boolean))]
                      .sort()
                      .map((s) => (
                        <SelectItem key={String(s)} value={String(s)}>{String(s)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={loadVoices}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              </div>
              {voicesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-teal-300" />
                  <p className="text-gray-400">Loading voices...</p>
                </div>
              ) : voicesError ? (
                <div className="text-center text-red-400 py-8">
                  <p className="font-medium mb-2">Failed to load voices</p>
                  <p className="text-sm text-gray-400 mb-4">{voicesError}</p>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={loadVoices}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : premadeVoices.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No voices available</p>
                  <p className="text-sm mt-2">Check your PlayHT API credentials</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {premadeVoices.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoiceInModal(voice)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVoiceInModal?.id === voice.id ? "bg-teal-900/20 border border-teal-600" : "bg-[#1a1a1a] hover:bg-[#222] border border-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 w-6 p-0 ${playingId === voice.id ? "text-teal-400" : "text-teal-300"}`}
                          onClick={(e) => { e.stopPropagation(); togglePreview(voice) }}
                          disabled={!voice.sampleUrl}
                          title={voice.sampleUrl ? "Preview" : "No sample"}
                        >
                          {playingId === voice.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                        <div>
                          <div className="text-sm font-medium">{voice.name}</div>
                          <div className="text-xs text-gray-400">
                            {[voice.gender, voice.accent, voice.language].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                        <button
                          className={`ml-auto text-sm ${favoriteVoiceIds.has(voice.id) ? "text-teal-400" : "text-gray-500"}`}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(voice) }}
                          title={favoriteVoiceIds.has(voice.id) ? "Unfavorite" : "Favorite"}
                        >
                          ★
                        </button>
                        {voice.hasEmotions && (
                          <Badge variant="outline" className="ml-auto text-xs border-teal-600 text-teal-300">
                            Emotions
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Favorites */}
            <TabsContent value="favorites" className="mt-4">
              {premadeVoices.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No voices available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {premadeVoices.filter(v => favoriteVoiceIds.has(v.id)).map((voice) => (
                    <div key={voice.id} onClick={() => setSelectedVoiceInModal(voice)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedVoiceInModal?.id === voice.id ? "bg-teal-900/20 border border-teal-600" : "bg-[#1a1a1a] hover:bg-[#222] border border-gray-800"}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-teal-400">★</div>
                        <div>
                          <div className="text-sm font-medium">{voice.name}</div>
                          <div className="text-xs text-gray-400">{[voice.gender, voice.accent, voice.language].filter(Boolean).join(" • ")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Recent */}
            <TabsContent value="recent" className="mt-4">
              {recentVoices.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No recent voices</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentVoices.map((voice) => (
                    <div key={voice.id} onClick={() => setSelectedVoiceInModal(voice)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedVoiceInModal?.id === voice.id ? "bg-teal-900/20 border border-teal-600" : "bg-[#1a1a1a] hover:bg-[#222] border border-gray-800"}`}>
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-600/20 p-2 rounded"><Volume2 className="w-4 h-4 text-teal-300" /></div>
                        <div>
                          <div className="text-sm font-medium">{voice.name}</div>
                          <div className="text-xs text-gray-400">Recently used</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cloned" className="mt-4">
              {voicesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-teal-300" />
                  <p className="text-gray-400">Loading voices...</p>
                </div>
              ) : clonedVoices.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No cloned voices yet</p>
                  <p className="text-sm mt-1">Click "Clone Voice" to upload a 30-second audio sample</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {clonedVoices.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoiceInModal(voice)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVoiceInModal?.id === voice.id ? "bg-teal-900/20 border border-teal-600" : "bg-[#1a1a1a] hover:bg-[#222] border border-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-600/20 p-2 rounded">
                          <Mic className="w-4 h-4 text-teal-300" />
                        </div>
                        <div>
                          {renamingVoiceId === voice.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                className="bg-black/40 border border-teal-700 rounded px-2 py-1 text-sm w-44"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                placeholder="New name"
                                title="Enter new voice name"
                                autoFocus
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); submitRename() }}
                                className="text-xs text-teal-400 hover:text-teal-300"
                              >Save</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setRenamingVoiceId(null); setRenameValue("") }}
                                className="text-xs text-gray-400 hover:text-gray-300"
                              >Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium">{voice.name}</div>
                              <button
                                onClick={(e) => { e.stopPropagation(); startRename(voice.id, voice.name) }}
                                className="text-xs text-teal-400 hover:text-teal-300"
                                title="Rename"
                              >Rename</button>
                            </div>
                          )}
                          <div className="text-xs text-gray-400">Cloned Voice • {voice.language}</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); void deleteClonedVoice(voice.id) }}
                          className="ml-auto text-xs text-red-400 hover:text-red-300"
                          title="Delete cloned voice"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setShowVoiceSelector(false)} className="text-gray-400">
              Cancel
            </Button>
            <Button onClick={confirmVoiceSelection} className="bg-teal-600 hover:bg-teal-700">
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Cloning Modal */}
      <VoiceCloningModal
        open={showCloningModal}
        onOpenChange={setShowCloningModal}
        onSuccess={handleVoiceCloned}
      />
    </div>
  )
}
