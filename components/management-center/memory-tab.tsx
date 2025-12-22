"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Upload, PlusCircle, Search } from "lucide-react"

type MemoryItem = any

export default function MemoryTab() {
  const [items, setItems] = useState<MemoryItem[]>([])
  const [kindFilter, setKindFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteTitle, setNoteTitle] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const url = "/api/memory/list" + (kindFilter && kindFilter !== "all" ? `?kind=${encodeURIComponent(kindFilter)}` : "")
      const r = await fetch(url, { cache: "no-store" })
      if (!r.ok) {
        const txt = await r.text().catch(() => "")
        throw new Error(`Failed to load memory list (${r.status}). ${txt}`)
      }
      const j = await r.json()
      setItems(j.items || [])
    } catch (e: any) {
      setError(e?.message || "Failed to load memory")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [kindFilter])

  async function addNote() {
    if (!noteText.trim()) return
    await fetch("/api/memory/remember", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "note", title: noteTitle || undefined, text: noteText.trim() })
    })
    setNoteTitle("")
    setNoteText("")
    await refresh()
  }

  async function uploadFile(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    setUploading(true)
    try {
      await fetch("/api/memory/upload", { method: "POST", body: fd })
      await refresh()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove(id: string) {
    await fetch(`/api/memory/delete?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    await refresh()
  }

  const kinds = [
    { value: "all", label: "All" },
    { value: "note", label: "Notes" },
    { value: "research", label: "Research" },
    { value: "document", label: "Documents" },
    { value: "edit", label: "Edits" },
    { value: "image", label: "Images" },
    { value: "file", label: "Files" },
    { value: "open", label: "Open Events" },
  ]

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add a Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title (optional)" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <Textarea placeholder="Type a memory to remember…" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={addNote} disabled={!noteText.trim()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Save Note
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload to Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input ref={fileRef} type="file" aria-label="Upload file to memory" onChange={(e) => e.target.files && e.target.files[0] && uploadFile(e.target.files[0])} />
            <div className="text-sm text-muted-foreground">Accepted files are stored under Memory and can be referenced by agents.</div>
            <div className="flex justify-end">
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            {kinds.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={refresh} disabled={loading}>Refresh</Button>
      </div>

      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="capitalize">{it.kind}</span>
                <Button variant="ghost" size="icon" onClick={() => remove(it.id)} aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {it.kind === 'note' && (
                <div>
                  {it.title && <div className="font-medium mb-1">{it.title}</div>}
                  <div className="whitespace-pre-wrap text-sm">{it.text}</div>
                </div>
              )}
              {it.kind === 'file' && (
                <div className="text-sm">
                  <div className="font-medium mb-1">{it.filename}</div>
                  {it.url && <a className="text-accent-primary underline" href={it.url} target="_blank" rel="noreferrer">Open</a>}
                </div>
              )}
              {it.kind === 'image' && (
                <div className="space-y-2">
                  {it.caption && <div className="font-medium text-sm">{it.caption}</div>}
                  {it.url && <img src={it.url} alt={it.caption || 'image'} className="max-h-40 rounded border" />}
                </div>
              )}
              {it.kind !== 'note' && it.kind !== 'file' && it.kind !== 'image' && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(it, null, 2)}</pre>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(it.timestamp).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
