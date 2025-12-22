"use client"

import { useState } from "react"
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

// Voice options matching the screenshots
const VOICE_OPTIONS = [
  { id: "radiant-girl", name: "Radiant Girl", selected: true },
  { id: "magnetic-voiced-man", name: "Magnetic Voiced Man" },
  { id: "compelling-lady", name: "Compelling Lady1" },
  { id: "expressive-narrator", name: "Expressive Narrator" },
  { id: "trustworthy-man", name: "Trustworthy Man" },
  { id: "graceful-lady", name: "Graceful Lady" },
  { id: "aussie-bloke", name: "Aussie Bloke" },
  { id: "whispering-girl", name: "Whispering Girl" },
  { id: "diligent-man", name: "Diligent Man" },
  { id: "gentle-voiced-man", name: "Gentle-voiced Man" },
]

// Image style options from screenshots
const IMAGE_STYLES = [
  { id: "default", name: "Default", selected: true, gradient: "from-blue-400 to-blue-600" },
  { id: "pixar-art", name: "Pixar Art", gradient: "from-purple-400 to-pink-500" },
  { id: "anime", name: "Anime", gradient: "from-pink-400 to-red-500" },
  { id: "comic", name: "Comic", gradient: "from-orange-400 to-yellow-500" },
  { id: "lego", name: "Lego", gradient: "from-red-500 to-orange-500" },
  { id: "cinematic", name: "Cinematic", gradient: "from-gray-600 to-gray-800" },
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
  const [selectedVoice, setSelectedVoice] = useState("radiant-girl")
  const [selectedImageStyle, setSelectedImageStyle] = useState("default")
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "complete">("idle")
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

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
          voice: selectedVoice,
          imageStyle: selectedImageStyle,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Poll for completion
        const jobId = data.jobId
        const pollInterval = setInterval(async () => {
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
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1f2e] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
              <Link href="/social-station">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Video className="w-6 h-6 text-purple-500" />
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Video Idea Input Section */}
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-3">Write your idea or reference content</p>
            <div className="relative">
              <Textarea
                placeholder="Type in your ideas or paste reference content."
                value={videoIdea}
                onChange={(e) => setVideoIdea(e.target.value)}
                className="min-h-[200px] bg-[#1a1f2e] border-gray-700 text-white placeholder-gray-500 text-base resize-none focus:border-purple-500 focus:ring-purple-500"
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
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-base font-medium"
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
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
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
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Output Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Output language</label>
            <Select value={outputLanguage} onValueChange={setOutputLanguage}>
              <SelectTrigger className="bg-[#1a1f2e] border-gray-700 text-white h-11">
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
              <SelectTrigger className="bg-[#1a1f2e] border-gray-700 text-white h-11">
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
                <Badge className="bg-purple-600 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center">
                  {index + 1}
                </Badge>
              </div>
              <div className="relative flex items-center gap-2">
                <Input
                  value={scene.text}
                  onChange={(e) => updateScene(scene.id, e.target.value)}
                  placeholder={`This is your ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} scene (3-100 characters)`}
                  maxLength={100}
                  className="bg-[#1a1f2e] border-gray-700 text-white placeholder-gray-500 pl-14 pr-24 h-12"
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
                    className="w-8 h-8 rounded-full bg-[#1a1f2e] border border-gray-700 flex items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-400 transition-colors"
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
                className="w-8 h-8 rounded-full bg-[#1a1f2e] border border-gray-700 flex items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Voice Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
              <Play className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-base font-semibold">Choose a Voice</h3>
          </div>
          <p className="text-sm text-gray-400">Select the perfect voice for your content</p>

          <div className="grid grid-cols-3 gap-3">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                  selectedVoice === voice.id
                    ? "bg-purple-600/20 border-purple-500"
                    : "bg-[#1a1f2e] border-gray-700 hover:border-gray-600"
                }`}
              >
                <span className="text-sm text-gray-200">{voice.name}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedVoice === voice.id ? "bg-purple-600" : "bg-gray-700"
                  }`}
                >
                  <Play className="w-3 h-3 text-white" />
                </div>
                {voice.selected && selectedVoice === voice.id && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Image Style Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-base font-semibold">Choose an Image Style</h3>
          </div>
          <p className="text-sm text-gray-400">Select the style for your content's images</p>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {IMAGE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedImageStyle(style.id)}
                className={`relative flex-shrink-0 w-32 h-40 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImageStyle === style.id ? "border-purple-500 ring-2 ring-purple-500" : "border-gray-700"
                }`}
              >
                <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                  <span className="text-white font-medium text-sm">{style.name}</span>
                </div>
                {selectedImageStyle === style.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Generation Progress */}
        {generationStatus === "generating" && (
          <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
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
          <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-6 space-y-4">
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
  )
}
