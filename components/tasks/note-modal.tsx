"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"

export interface Note {
  id: string
  title: string
  content: string
  type: "note"
  completed: false
  createdAt: Date
  priority: "low"
  urls: string[]
  files: string[]
  tags: string[]
  description: string
}

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (noteData: Omit<Note, "id" | "createdAt">) => void
  note?: Note
}

export default function NoteModal({ isOpen, onClose, onSave, note }: NoteModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
    } else {
      setTitle("")
      setContent("")
    }
  }, [note, isOpen])

  const handleSave = () => {
    if (!title.trim()) return

    const noteData: Omit<Note, "id" | "createdAt"> = {
      title: title.trim(),
      content: content.trim(),
      type: "note",
      completed: false,
      priority: "low",
      urls: [],
      files: [],
      tags: [],
      description: content.trim(),
    }

    onSave(noteData)
    onClose()
  }

  const handleClose = () => {
    setTitle("")
    setContent("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {note ? "Edit Note" : "Add Note"}
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="text-sm font-medium mb-2 block">
              Title
            </label>
            <Input
              id="title"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="content" className="text-sm font-medium mb-2 block">
              Note
            </label>
            <Textarea
              id="content"
              placeholder="Type or paste your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary"
            >
              {note ? "Update Note" : "Save Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
