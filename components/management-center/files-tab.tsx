"use client"

import { Card } from "@/components/ui/card"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileImage, FileVideo, FileAudio, FileText, Search, LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"

type FileType = "image" | "video" | "audio" | "document"

type MockFile = {
  id: string
  name: string
  type: FileType
  size: string
  date: string
  url: string
  thumbnail?: string
}

const mockFiles: MockFile[] = [
  {
    id: "1",
    name: "Project_Brief.pdf",
    type: "document",
    size: "1.2 MB",
    date: "2023-08-04",
    url: "#",
  },
  {
    id: "2",
    name: "Dashboard_Preview.png",
    type: "image",
    size: "856 KB",
    date: "2023-08-03",
    url: "/placeholder.svg?width=400&height=300",
    thumbnail: "/placeholder.svg?width=400&height=300",
  },
  {
    id: "3",
    name: "Demo_Walkthrough.mp4",
    type: "video",
    size: "24.5 MB",
    date: "2023-08-02",
    url: "#",
  },
  {
    id: "4",
    name: "Podcast_Intro.mp3",
    type: "audio",
    size: "3.1 MB",
    date: "2023-08-01",
    url: "#",
  },
  {
    id: "5",
    name: "User_Feedback.docx",
    type: "document",
    size: "45 KB",
    date: "2023-07-31",
    url: "#",
  },
  {
    id: "6",
    name: "Logo_Concept.jpg",
    type: "image",
    size: "1.5 MB",
    date: "2023-07-30",
    url: "/placeholder.svg?width=400&height=300",
    thumbnail: "/placeholder.svg?width=400&height=300",
  },
]

const fileTypeIcons: Record<FileType, React.ReactElement> = {
  image: <FileImage className="w-8 h-8 text-blue-500" />,
  video: <FileVideo className="w-8 h-8 text-red-500" />,
  audio: <FileAudio className="w-8 h-8 text-purple-500" />,
  document: <FileText className="w-8 h-8 text-green-500" />,
}

const categories = [
  { name: "All Files", filter: "all" },
  { name: "Images", filter: "image" },
  { name: "Videos", filter: "video" },
  { name: "Audio", filter: "audio" },
  { name: "Documents", filter: "document" },
]

export default function FilesTab() {
  const [filter, setFilter] = useState("all")
  const [view, setView] = useState("grid")

  const filteredFiles = filter === "all" ? mockFiles : mockFiles.filter((file) => file.type === filter)

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 pr-6 border-r">
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.filter}>
              <Button
                variant="ghost"
                className={cn("w-full justify-start", filter === cat.filter && "bg-accent text-accent-foreground")}
                onClick={() => setFilter(cat.filter)}
              >
                {cat.name}
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-6 flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search files..." className="pl-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}>
              <List className="w-5 h-5" />
            </Button>
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}>
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div
            className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}
          >
            {filteredFiles.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <div className="h-32 bg-secondary flex items-center justify-center">
                  {file.type === "image" && file.thumbnail ? (
                    <img
                      src={file.thumbnail || "/placeholder.svg"}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    fileTypeIcons[file.type]
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size} &middot; {file.date}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
