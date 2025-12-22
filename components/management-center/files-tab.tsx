"use client"

import { Card } from "@/components/ui/card"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileImage, FileVideo, FileAudio, FileText, Search, LayoutGrid, List, Trash2, Download } from "lucide-react"
import { cn } from "@/lib/utils"

type FileType = "images" | "videos" | "audio" | "documents" | "other"

type ManagementFile = {
  id: string
  userId: string
  fileName: string
  fileType: string
  fileCategory: FileType
  fileSize: number
  storagePath: string
  storageUrl: string
  tags: string[]
  metadata?: any
  createdAt: string
  updatedAt: string
}

const fileTypeIcons: Record<FileType, React.ReactElement> = {
  images: <FileImage className="w-8 h-8 text-blue-500" />,
  videos: <FileVideo className="w-8 h-8 text-red-500" />,
  audio: <FileAudio className="w-8 h-8 text-purple-500" />,
  documents: <FileText className="w-8 h-8 text-green-500" />,
  other: <FileText className="w-8 h-8 text-gray-500" />,
}

const categories = [
  { name: "All Files", filter: "all" },
  { name: "Images", filter: "images" },
  { name: "Videos", filter: "videos" },
  { name: "Audio", filter: "audio" },
  { name: "Documents", filter: "documents" },
]

export default function FilesTab() {
  const [filter, setFilter] = useState("all")
  const [view, setView] = useState("grid")
  const [files, setFiles] = useState<ManagementFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [filter])

  async function loadFiles() {
    try {
      setLoading(true)
      const url = `/api/management/files?category=${filter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load files")
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Failed to load files:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", filter === "all" ? "other" : filter)

      const res = await fetch("/api/management/files", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      await loadFiles()
      e.target.value = "" // Reset input
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const res = await fetch(`/api/management/files/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Delete failed")

      await loadFiles()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete file")
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B"
    const kb = bytes / 1024
    if (kb < 1024) return kb.toFixed(1) + " KB"
    const mb = kb / 1024
    return mb.toFixed(1) + " MB"
  }

  const filteredFiles = filter === "all" ? files : files.filter((file) => file.fileCategory === filter)

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
            <Button className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary" disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? "Uploading..." : "Upload File"}
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading files...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">No files yet</p>
                <p className="text-muted-foreground">Upload your first file to get started</p>
              </div>
            ) : (
              <div
                className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}
              >
                {filteredFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden">
                    <div className="h-32 bg-secondary flex items-center justify-center">
                      {file.fileCategory === "images" && file.storageUrl ? (
                        <img
                          src={file.storageUrl}
                          alt={file.fileName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        fileTypeIcons[file.fileCategory]
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)} &middot; {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => window.open(file.storageUrl, '_blank')}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
