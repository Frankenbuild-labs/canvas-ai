"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Zap,
  ImageIcon,
  Video,
  X,
  Bot,
  Palette,
  MessageSquare,
  Calendar,
  Send,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { usePegasusDeviceId } from "@/hooks/use-pegasus-device-id"
// Twitter direct OAuth: other platforms pending

const SOCIAL_PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-4.358-.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.057-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    connected: false,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
        {/* X (Twitter) mark */}
        <path d="M18.244 2H22l-7.243 8.268L23.5 22h-7.086l-5.08-6.236L5.5 22H2l7.76-9.242L0.5 2h7.086l4.69 6.02L18.244 2z" />
      </svg>
    ),
    color: "bg-black",
    connected: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: (
      <svg viewBox="0 0 48 48" className="w-4 h-4 fill-current" aria-hidden>
        {/* TikTok music note */}
        <path d="M30 4c1.9 2.1 4.1 3.4 6.9 3.7v4.8c-2.4-.1-4.7-.8-6.9-2.1v11c0 6.5-5.3 11.8-11.8 11.8S6.4 28 6.4 21.5 11.7 9.7 18.2 9.7c.9 0 1.7.1 2.5.3v5.3c-.8-.3-1.6-.5-2.5-.5-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8 6.8-3 6.8-6.8V4H30z" />
      </svg>
    ),
    color: "bg-black",
    connected: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "bg-blue-600",
    connected: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: "bg-blue-700",
    connected: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    color: "bg-red-600",
    connected: false,
  },
]

export default function SocialStationPage() {
  const searchParams = useSearchParams()
  const { deviceId } = usePegasusDeviceId()
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 1)) // September 2025
  const [postText, setPostText] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [contentType, setContentType] = useState("post")
  const [showCompleted, setShowCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [timeFilter, setTimeFilter] = useState("today")
  const [rightPanelTab, setRightPanelTab] = useState("social-hub")
  const [influencerName, setInfluencerName] = useState("")
  const [influencerPersonality, setInfluencerPersonality] = useState("")
  const [influencerTone, setInfluencerTone] = useState("friendly")
  const [creativityLevel, setCreativityLevel] = useState([70])
  const [postFrequency, setPostFrequency] = useState("daily")
  const [uploadedMedia, setUploadedMedia] = useState<{ type: "image" | "video"; url: string; name: string } | null>(
    null,
  )

  const [connectedAccounts, setConnectedAccounts] = useState<Set<string>>(new Set())
  const [connectingAccount, setConnectingAccount] = useState<string | null>(null)
  const [postingStatus, setPostingStatus] = useState<"idle" | "posting" | "scheduling" | "saving">("idle")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([])
  const [scheduleTime, setScheduleTime] = useState("12:00")
  const [socialFeed, setSocialFeed] = useState<any[]>([])
  const [feedLoading, setFeedLoading] = useState(false)

  useEffect(() => {
    const loadScheduledPosts = async () => {
      try {
        const response = await fetch("/api/social/schedule")
        const data = await response.json()
        if (data.success) {
          setScheduledPosts(data.posts)
        }
      } catch (error) {
        console.error("Failed to load scheduled posts:", error)
      }
    }

    loadScheduledPosts()
  }, [])

  // Initial load of connected social accounts
  useEffect(() => {
    const loadConnectedAccounts = async () => {
      try {
        const response = await fetch("/api/social/accounts")
        const data = await response.json()
        if (data.success && Array.isArray(data.accounts) && data.accounts.length > 0) {
          const platforms = data.accounts.map((a: any) => a.platform)
          setConnectedAccounts(new Set(platforms))
        } else {
          console.log('[schedule] empty accounts response retained previous connectedAccounts')
        }
      } catch (error) {
        console.error("Failed to load connected accounts:", error)
      }
    }
    loadConnectedAccounts()
  }, [])

  // Handle OAuth redirect query params (?connected=platform&success=true or ?error=oauth_failed)
  useEffect(() => {
    const connected = searchParams.get("connected")
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (connected && success === "true") {
      setConnectedAccounts((prev) => new Set([...Array.from(prev), connected]))
      setConnectingAccount(null)
      setStatusMessage(`${connected} account connected.`)
      // Clean up query params
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete("connected")
        url.searchParams.delete("success")
        window.history.replaceState(null, "", url.toString())
      } catch (e) {
        // ignore
      }
    } else if (error) {
      setStatusMessage("Connection failed. Please try again.")
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete("error")
        window.history.replaceState(null, "", url.toString())
      } catch (e) {
        // ignore
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (connectedAccounts.size > 0 && rightPanelTab === "social-hub" && activeTab === "feed") {
      loadSocialFeed()
    }
  }, [connectedAccounts, rightPanelTab, activeTab])

  const contentTypes = [
    { id: "post", label: "Post", active: true },
    { id: "story", label: "Story", active: false },
    { id: "reel", label: "Reel", active: false },
  ]

  const handleConnectAccount = async (platformId: string) => {
    if (platformId !== 'twitter') {
      setStatusMessage('Only Twitter connection supported right now.')
      return
    }
    setConnectingAccount(platformId)
    try {
      const r = await fetch(`/api/twitter/auth/start?platform=${platformId}`)
      const data = await r.json()
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer')
        setStatusMessage('Complete Twitter auth in opened window, then click Refresh.')
      } else {
        setStatusMessage(data.error || 'Failed to start Twitter auth')
      }
    } catch (e:any) {
      setStatusMessage(e?.message || 'Twitter auth error')
    } finally {
      setConnectingAccount(null)
    }
  }

  const handlePostNow = async () => {
    if (!postText.trim()) return
    if (selectedAccounts.length === 0) return

    setPostingStatus("posting")

    try {
      const response = await fetch("/api/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedAccounts,
          content: postText,
          mediaUrl: uploadedMedia?.url,
        }),
      })

      const data = await response.json()

      // 200 = all success; 207 = partial success; others = error
      if (response.status === 200 && data.success) {
        setPostText("")
        setUploadedMedia(null)
        setSelectedAccounts([])
        setStatusMessage(`Posted successfully to ${selectedAccounts.length}/${selectedAccounts.length} platforms`)
        console.log("Posted successfully:", data.results)
        return
      }

      // Partial success handling (207)
      if (response.status === 207 && Array.isArray(data.results)) {
        const ok = data.results.filter((r: any) => r.success).map((r: any) => r.platform)
        const fail = data.results.filter((r: any) => !r.success).map((r: any) => `${r.platform}${r.error ? `: ${r.error}` : ""}`)
        setStatusMessage(
          `Partial success. Succeeded: ${ok.join(", ") || "none"}. Failed: ${fail.join(", ") || "none"}.`
        )
        console.warn("Partial post results:", data.results)
        return
      }

      // Hard failure
      throw new Error(data?.error || "Failed to post")
    } catch (error) {
      console.error("Post error:", error)
      setStatusMessage(error instanceof Error ? error.message : "Failed to post")
    } finally {
      setPostingStatus("idle")
    }
  }

  const handleSchedulePost = async () => {
    if (!postText.trim()) return
    if (selectedAccounts.length === 0) return

    setPostingStatus("scheduling")

    try {
      // In a real app, you'd show a date/time picker first
      const scheduleTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow

      const response = await fetch("/api/social/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedAccounts,
          content: postText,
          mediaUrl: uploadedMedia?.url,
          scheduleTime: scheduleTime.toISOString(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Clear form and show success
        setPostText("")
        setUploadedMedia(null)
        setSelectedAccounts([])
        console.log("Scheduled successfully:", data.scheduledPost)
      } else {
        throw new Error(data.error || "Failed to schedule")
      }
    } catch (error) {
      console.error("Schedule error:", error)
    } finally {
      setPostingStatus("idle")
    }
  }

  const handleSaveDraft = async () => {
    if (!postText.trim()) return

    setPostingStatus("saving")

    try {
      // In a real app, you'd save to database
      const draft = {
        id: Math.random().toString(36).substring(7),
        content: postText,
        mediaUrl: uploadedMedia?.url,
        platforms: selectedAccounts,
        createdAt: new Date(),
      }

      console.log("Draft saved:", draft)

      // Clear form
      setPostText("")
      setUploadedMedia(null)
      setSelectedAccounts([])
    } catch (error) {
      console.error("Save draft error:", error)
    } finally {
      setPostingStatus("idle")
    }
  }

  const loadSocialFeed = async (refresh = false) => {
    if (connectedAccounts.size === 0) return

    setFeedLoading(true)
    try {
      const response = await fetch(`/api/social/feed${refresh ? "?refresh=true" : ""}`)
      const data = await response.json()

      if (data.success) {
        setSocialFeed(data.posts)
      }
    } catch (error) {
      console.error("Failed to load social feed:", error)
    } finally {
      setFeedLoading(false)
    }
  }

  const formatEngagement = (engagement: any) => {
    const { likes, comments, shares, views } = engagement || {}
    const stats = []

    if (likes) stats.push(`${likes} likes`)
    if (comments) stats.push(`${comments} comments`)
    if (shares) stats.push(`${shares} shares`)
    if (views) stats.push(`${views} views`)

    return stats.join(" • ")
  }

  const getPlatformIcon = (platform: string) => {
    const platformData = SOCIAL_PLATFORMS.find((p) => p.id === platform)
    return platformData?.icon || <div className="w-4 h-4 bg-gray-500 rounded"></div>
  }

  const getPlatformColor = (platform: string) => {
    const platformData = SOCIAL_PLATFORMS.find((p) => p.id === platform)
    return platformData?.color || "bg-gray-500"
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border border-gray-800"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPosts = getDayScheduledPosts(day)
      const hasEvent = dayPosts.length > 0
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear()

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-800 p-2 cursor-pointer hover:bg-gray-800/50 transition-colors ${
            hasEvent ? "bg-teal-900/20" : ""
          } ${isSelected ? "bg-blue-900/30 border-blue-500" : ""}`}
          onClick={() => handleDayClick(day)}
        >
          <span className="text-sm text-gray-300">{day}</span>
          {hasEvent && (
            <div className="mt-1 space-y-1">
              {dayPosts.slice(0, 2).map((post, index) => (
                <div key={index} className="w-full h-1 bg-teal-500 rounded-full"></div>
              ))}
              {dayPosts.length > 2 && <div className="text-xs text-teal-400">+{dayPosts.length - 2} more</div>}
            </div>
          )}
        </div>,
      )
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {dayNames.map((day) => (
          <div key={day} className="h-10 border border-gray-800 bg-gray-900 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-400">{day}</span>
          </div>
        ))}
        {days}
      </div>
    )
  }

  const handleFileUpload = (type: "image" | "video") => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = type === "image" ? "image/*" : "video/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setUploadedMedia({ type, url, name: file.name })
      }
    }
    input.click()
  }

  const removeMedia = () => {
    if (uploadedMedia) {
      URL.revokeObjectURL(uploadedMedia.url)
      setUploadedMedia(null)
    }
  }

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)

    setShowScheduleModal(true)
  }

  const handleScheduleFromCalendar = async () => {
    if (!selectedDate || !postText.trim() || selectedAccounts.length === 0) return

    setPostingStatus("scheduling")

    try {
      const scheduleDateTime = new Date(selectedDate)
      const [hours, minutes] = scheduleTime.split(":").map(Number)
      scheduleDateTime.setHours(hours, minutes, 0, 0)

      const response = await fetch("/api/social/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedAccounts,
          content: postText,
          mediaUrl: uploadedMedia?.url,
          scheduleTime: scheduleDateTime.toISOString(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Clear form and close modal
        setPostText("")
        setUploadedMedia(null)
        setSelectedAccounts([])
        setShowScheduleModal(false)
        setSelectedDate(null)

        // Reload scheduled posts
        const postsResponse = await fetch("/api/social/schedule")
        const postsData = await postsResponse.json()
        if (postsData.success) {
          setScheduledPosts(postsData.posts)
        }

        console.log("Scheduled successfully:", data.scheduledPost)
      } else {
        throw new Error(data.error || "Failed to schedule")
      }
    } catch (error) {
      console.error("Schedule error:", error)
    } finally {
      setPostingStatus("idle")
    }
  }

  const getDayScheduledPosts = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return scheduledPosts.filter((post) => {
      const postDate = new Date(post.schedule_time)
      return postDate.toDateString() === dayDate.toDateString()
    })
  }

  return (
    <div className="w-full h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Left Panel - Create Schedule */}
      <div className="w-80 bg-[#1a1a1a] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white h-7 w-7">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h2 className="text-lg font-semibold text-white">Create Schedule</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Create Schedule</span>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="mb-3">
            <p className="text-sm text-gray-400 mb-2">Connected Accounts</p>
            <div className="flex gap-2 flex-wrap items-center">
              {SOCIAL_PLATFORMS.map((platform) => {
                const isConnected = connectedAccounts.has(platform.id)
                const isConnecting = connectingAccount === platform.id
                const isSelected = selectedAccounts.includes(platform.id)

                return (
                  <button
                    key={platform.id}
                    onClick={() => {
                      if (isConnected) {
                        // Toggle selection for posting
                        setSelectedAccounts((prev) =>
                          prev.includes(platform.id) ? prev.filter((id) => id !== platform.id) : [...prev, platform.id],
                        )
                      } else {
                        // Connect account
                        handleConnectAccount(platform.id)
                      }
                    }}
                    disabled={isConnecting}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all ${
                      isConnected
                        ? `bg-green-600 ${isSelected ? "ring-2 ring-teal-400" : "hover:bg-green-700"}`
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                    title={`${platform.name} ${isConnected ? (isSelected ? "(Selected)" : "(Connected)") : "(Click to connect)"}`}
                  >
                    {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : platform.icon}
                    {isConnected && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-800" />
                    )}
                  </button>
                )
              })}
            </div>
            {selectedAccounts.length > 0 && (
              <p className="text-xs text-teal-400 mt-1">
                {selectedAccounts.length} platform{selectedAccounts.length > 1 ? "s" : ""} selected for posting
              </p>
            )}
            {statusMessage && (
              <p className="text-xs text-gray-300 mt-1">{statusMessage}</p>
            )}
          </div>

          {/* Content Type Selection */}
          <div className="flex gap-1">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`px-2 py-1 rounded text-xs ${
                  contentType === type.id ? "bg-red-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                • {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Upload Section */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <p className="text-sm text-gray-400 mb-2">Media</p>
          {uploadedMedia ? (
            <div className="relative border border-gray-700 rounded-lg overflow-hidden">
              {uploadedMedia.type === "image" ? (
                <img
                  src={uploadedMedia.url || "/placeholder.svg"}
                  alt="Uploaded"
                  className="w-full h-32 object-cover"
                />
              ) : (
                <video src={uploadedMedia.url} className="w-full h-32 object-cover" controls />
              )}
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                aria-label="Remove media"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {uploadedMedia.name}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
              <div className="flex justify-center gap-2 mb-2">
                <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-white" />
                </div>
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <Video className="w-3 h-3 text-white" />
                </div>
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">Add Image or Video</p>
              <p className="text-xs text-gray-500 mb-3">Drag and drop files here, or click to browse</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleFileUpload("image")}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-1.5 py-1 h-6 min-w-0 flex-shrink-0"
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Image
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleFileUpload("video")}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-1.5 py-1 h-6 min-w-0 flex-shrink-0"
                >
                  <Video className="w-3 h-3 mr-1" />
                  Video
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="flex-1 p-4 min-h-0 flex flex-col">
          <div className="relative flex-1 mb-3">
            <Textarea
              placeholder="Write your post..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 flex-1 mb-2 resize-none text-sm focus:border-teal-500 focus:ring-teal-500 pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-gray-400 hover:text-teal-400 h-6 w-6"
            >
              <Zap className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-right text-xs text-gray-500 mb-4">{postText.length}/2200</div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSchedulePost}
                disabled={postingStatus !== "idle" || !postText.trim() || selectedAccounts.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white flex-1 text-xs"
              >
                {postingStatus === "scheduling" ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Calendar className="w-3 h-3 mr-1" />
                )}
                Schedule
              </Button>
              <Button
                size="sm"
                onClick={handlePostNow}
                disabled={postingStatus !== "idle" || !postText.trim() || selectedAccounts.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
              >
                {postingStatus === "posting" ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 mr-1" />
                )}
                Post Now
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={postingStatus !== "idle" || !postText.trim()}
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 text-xs bg-transparent"
            >
              {postingStatus === "saving" ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Center Panel - Calendar */}
      <div className="flex-1 bg-[#0a0a0a] flex flex-col min-w-0">
        {/* Calendar Header */}
        <div className="p-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("prev")}
                className="text-gray-400 hover:text-white h-8 w-8"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-white min-w-48 text-center">{formatMonth(currentDate)}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("next")}
                className="text-gray-400 hover:text-white h-8 w-8"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                aria-label="Search events"
                placeholder="Search events..."
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 pl-10 w-48 h-8 text-sm"
              />
            </div>
            <Select defaultValue="all-events">
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-events">All Events</SelectItem>
                <SelectItem value="posts">Posts</SelectItem>
                <SelectItem value="stories">Stories</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-gray-800 hover:bg-gray-700 text-white h-8 text-sm">
              Today
            </Button>
            <Button size="icon" className="bg-teal-600 hover:bg-teal-700 text-white h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-3 min-h-0">{renderCalendar()}</div>
      </div>

      {/* Right Panel - Social Hub & Influencer */}
      <div className="w-80 bg-[#1a1a1a] border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setRightPanelTab("social-hub")}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                rightPanelTab === "social-hub" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Social Hub
            </button>
            <button
              onClick={() => setRightPanelTab("influencer")}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                rightPanelTab === "influencer" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Bot className="w-4 h-4" />
              Influencer
            </button>
          </div>

          {rightPanelTab === "social-hub" && (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === "upcoming" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === "feed" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Feed
                </button>
              </div>

              {/* Time Filters */}
              <div className="flex gap-1 mb-3">
                {["Today", "Week", "Month", "All"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter.toLowerCase())}
                    className={`px-2 py-1 rounded text-xs ${
                      timeFilter === filter.toLowerCase() ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Show Completed Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={checked => setShowCompleted(checked === true)} />
                <label htmlFor="show-completed" className="text-sm text-gray-400">
                  Show completed
                </label>
              </div>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {rightPanelTab === "social-hub" ? (
            <div className="flex-1 flex flex-col">
              {activeTab === "upcoming" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm">No upcoming posts</p>
                  <p className="text-gray-500 text-xs mt-1">Scheduled posts will appear here</p>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Feed Header */}
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Social Feed</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadSocialFeed(true)}
                      disabled={feedLoading || connectedAccounts.size === 0}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent text-xs"
                    >
                      {feedLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3 mr-1" />
                      )}
                      Refresh
                    </Button>
                  </div>

                  {/* Feed Content */}
                  <div className="flex-1 overflow-y-auto">
                    {connectedAccounts.size === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-sm">Connect your accounts</p>
                        <p className="text-gray-500 text-xs mt-1">Your social media posts will appear here</p>
                      </div>
                    ) : feedLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                      </div>
                    ) : socialFeed.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-sm">No posts found</p>
                        <p className="text-gray-500 text-xs mt-1">Your recent posts will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4">
                        {socialFeed.map((post, index) => (
                          <div
                            key={`${post.platform}_${post.id}_${index}`}
                            className="bg-gray-900 rounded-lg p-3 border border-gray-800"
                          >
                            {/* Post Header */}
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${getPlatformColor(post.platform)}`}
                              >
                                {getPlatformIcon(post.platform)}
                              </div>
                              <span className="text-xs text-gray-400 capitalize">{post.platform}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                {new Date(post.posted_at).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Post Content */}
                            {post.content && <p className="text-sm text-gray-300 mb-2 line-clamp-3">{post.content}</p>}

                            {/* Post Media */}
                            {post.media_url && (
                              <div className="mb-2">
                                <img
                                  src={post.media_url || "/placeholder.svg"}
                                  alt="Post media"
                                  className="w-full h-32 object-cover rounded border border-gray-700"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).style.display = "none"
                                  }}
                                />
                              </div>
                            )}

                            {/* Engagement Stats */}
                            {post.engagement && Object.keys(post.engagement).length > 0 && (
                              <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                                {formatEngagement(post.engagement)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">AI Influencer Name</label>
                  <Input
                    placeholder="Enter influencer name..."
                    value={influencerName}
                    onChange={(e) => setInfluencerName(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Personality</label>
                  <Textarea
                    placeholder="Describe the AI influencer's personality, interests, and style..."
                    value={influencerPersonality}
                    onChange={(e) => setInfluencerPersonality(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 text-sm h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Tone</label>
                  <Select value={influencerTone} onValueChange={setInfluencerTone}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Creativity Level: {creativityLevel[0]}%
                  </label>
                  <Slider
                    value={creativityLevel}
                    onValueChange={setCreativityLevel}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Post Frequency</label>
                  <Select value={postFrequency} onValueChange={setPostFrequency}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
                    <Bot className="w-4 h-4 mr-2" />
                    Save AI Influencer
                  </Button>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 text-sm bg-transparent"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 text-sm bg-transparent"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Preview Style
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats - Only show for Social Hub */}
        {rightPanelTab === "social-hub" && (
          <div className="p-4 border-t border-gray-800 flex-shrink-0">
            <div className="flex justify-between text-center">
              <div>
                <div className="text-xl font-bold text-white">
                  {scheduledPosts.filter((p) => p.status === "scheduled").length}
                </div>
                <div className="text-xs text-gray-400">Scheduled</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-500">
                  {scheduledPosts.filter((p) => p.status === "posted").length}
                </div>
                <div className="text-xs text-gray-400">Published</div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold text-white mb-4">
                Schedule Post for {selectedDate?.toLocaleDateString()}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    aria-label="Schedule time"
                    title="Schedule time"
                    placeholder="Select time"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">Content Preview</label>
                  <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm text-gray-300 max-h-20 overflow-y-auto">
                    {postText}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">Platforms</label>
                  <div className="flex gap-2">
                    {selectedAccounts.map((platformId) => {
                      const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId)
                      return platform ? (
                        <div
                          key={platformId}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${platform.color}`}
                        >
                          {platform.icon}
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleFromCalendar}
                  disabled={postingStatus !== "idle"}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {postingStatus === "scheduling" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  Schedule
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
