"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react"

interface VoiceCloningModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (clonedVoice: any) => void
}

export function VoiceCloningModal({ open, onOpenChange, onSuccess }: VoiceCloningModalProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [voiceName, setVoiceName] = useState("")
  const [transcript, setTranscript] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      setError("Please select an audio file (MP3, WAV, etc.)")
      return
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError("File too large. Maximum size is 50MB.")
      return
    }

    setAudioFile(file)
    setError(null)

    // Auto-generate voice name from filename if empty
    if (!voiceName) {
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      setVoiceName(name)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file)
      setError(null)

      if (!voiceName) {
        const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        setVoiceName(name)
      }
    } else {
      setError("Please drop an audio file")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleSubmit = async () => {
    if (!audioFile || !voiceName.trim()) {
      setError("Please provide both an audio file and a voice name")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("audio_file", audioFile)
      formData.append("voice_name", voiceName.trim())
      if (transcript.trim()) {
        formData.append("transcript", transcript.trim())
      }

      // Simulate progress (actual progress tracking would need server-sent events or polling)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch("/api/voice/cloning/create", {
        method: "POST",
        headers: {
          "x-user-id": "user_123", // Replace with actual user ID from auth
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || error.error || "Voice cloning failed")
      }

      const result = await response.json()

      setSuccess(true)

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

      // Reset form after 2 seconds and close
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 2000)
    } catch (err) {
      console.error("Voice cloning error:", err)
      setError(err instanceof Error ? err.message : "Failed to clone voice")
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setAudioFile(null)
    setVoiceName("")
    setTranscript("")
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#0a0a0a] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Clone Your Voice</DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload a 30-second audio sample to create a custom voice clone. For best results, use clear audio without
            background noise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* File Upload Area */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Audio Sample *</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                audioFile
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-gray-700 bg-[#1a1a1a] hover:border-teal-500/50 hover:bg-teal-500/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />

              {audioFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-300" />
                  <div className="text-left">
                    <p className="text-white font-medium">{audioFile.name}</p>
                    <p className="text-sm text-gray-400">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAudioFile(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-white font-medium mb-1">Click or drag audio file here</p>
                  <p className="text-sm text-gray-500">MP3, WAV, or other audio formats (max 50MB)</p>
                  <p className="text-xs text-teal-300 mt-2">Recommended: 30 seconds of clear speech</p>
                </div>
              )}
            </div>
          </div>

          {/* Voice Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Voice Name *</label>
            <Input
              placeholder="e.g., My Professional Voice"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="bg-[#1a1a1a] border-gray-700 text-white"
              maxLength={100}
              disabled={isUploading}
            />
          </div>

          {/* Transcript (Optional) */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Transcript <span className="text-gray-500 font-normal">(Optional - improves quality)</span>
            </label>
            <Textarea
              placeholder="Type what is being said in the audio sample..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="bg-[#1a1a1a] border-gray-700 text-white min-h-[100px]"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">Providing a transcript helps improve voice cloning accuracy</p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Cloning voice...</span>
                <span className="text-sm text-teal-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-300">Voice cloned successfully! Your voice is ready to use.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={handleClose} disabled={isUploading} className="text-gray-400">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!audioFile || !voiceName.trim() || isUploading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Clone Voice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
