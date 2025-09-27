"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock, Link2, Paperclip, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface Task {
  id: string
  title: string
  description: string
  type: "task" | "appointment" | "reminder" | "note"
  priority: "low" | "medium" | "high"
  dueDate?: Date
  reminderDate?: Date
  urls: string[]
  files: string[]
  tags: string[]
  completed: boolean
  createdAt: Date
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Omit<Task, "id" | "createdAt">) => void
  task?: Task
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [type, setType] = useState<Task["type"]>(task?.type || "task")
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority || "medium")
  const [dueDate, setDueDate] = useState<Date | undefined>(task?.dueDate)
  const [reminderDate, setReminderDate] = useState<Date | undefined>(task?.reminderDate)
  const [urls, setUrls] = useState<string[]>(task?.urls || [])
  const [files, setFiles] = useState<string[]>(task?.files || [])
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [newUrl, setNewUrl] = useState("")
  const [newTag, setNewTag] = useState("")

  const handleSave = () => {
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      dueDate,
      reminderDate,
      urls,
      files,
      tags,
      completed: task?.completed || false,
    })

    // Reset form
    setTitle("")
    setDescription("")
    setType("task")
    setPriority("medium")
    setDueDate(undefined)
    setReminderDate(undefined)
    setUrls([])
    setFiles([])
    setTags([])
    setNewUrl("")
    setNewTag("")
    onClose()
  }

  const addUrl = () => {
    if (newUrl.trim() && !urls.includes(newUrl.trim())) {
      setUrls([...urls, newUrl.trim()])
      setNewUrl("")
    }
  }

  const removeUrl = (url: string) => {
    setUrls(urls.filter((u) => u !== url))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (uploadedFiles) {
      const fileNames = Array.from(uploadedFiles).map((file) => file.name)
      setFiles([...files, ...fileNames])
    }
  }

  const removeFile = (fileName: string) => {
    setFiles(files.filter((f) => f !== fileName))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about your task..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: Task["type"]) => setType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: Task["priority"]) => setPriority(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Reminder Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !reminderDate && "text-muted-foreground",
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {reminderDate ? format(reminderDate, "PPP") : "Set reminder"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={reminderDate} onSelect={setReminderDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* URLs */}
          <div>
            <Label>URLs</Label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Add a URL..."
                  onKeyPress={(e) => e.key === "Enter" && addUrl()}
                />
                <Button type="button" onClick={addUrl} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {urls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {urls.map((url, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeUrl(url)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Files */}
          <div>
            <Label>Files</Label>
            <div className="mt-1 space-y-2">
              <div>
                <Input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload">
                  <Button type="button" variant="outline" className="w-full cursor-pointer bg-transparent" asChild>
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attach Files
                    </div>
                  </Button>
                </label>
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((fileName, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{fileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFile(fileName)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                />
                <Button type="button" onClick={addTag} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
