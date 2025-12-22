"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus } from "lucide-react"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatuses: string[]
  customStatuses: string[]
  onAddStatus: (s: string) => void
  onRemoveStatus: (s: string) => void
  defaultSources: string[]
  customSources: string[]
  onAddSource: (s: string) => void
  onRemoveSource: (s: string) => void
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
}

export default function SettingsDialog(props: SettingsDialogProps) {
  const {
    open,
    onOpenChange,
    defaultStatuses,
    customStatuses,
    onAddStatus,
    onRemoveStatus,
    defaultSources,
    customSources,
    onAddSource,
    onRemoveSource,
  } = props

  const [newStatus, setNewStatus] = useState("")
  const [newSource, setNewSource] = useState("")

  const addStatus = () => {
    onAddStatus(newStatus)
    setNewStatus("")
  }
  const addSource = () => {
    onAddSource(newSource)
    setNewSource("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage CRM Options</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Statuses */}
          <div className="space-y-3">
            <SectionHeader title="Lead Statuses" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Defaults (cannot remove)</div>
              <div className="flex flex-wrap gap-2">
                {defaultStatuses.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Custom</div>
              <div className="flex flex-wrap gap-2">
                {customStatuses.map((s) => (
                  <div key={s} className="flex items-center gap-1 border rounded-full px-2 py-1 text-sm">
                    <span>{s}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveStatus(s)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Add status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
                <Button onClick={addStatus} disabled={!newStatus.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-3">
            <SectionHeader title="Lead Sources" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Defaults (cannot remove)</div>
              <div className="flex flex-wrap gap-2">
                {defaultSources.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Custom</div>
              <div className="flex flex-wrap gap-2">
                {customSources.map((s) => (
                  <div key={s} className="flex items-center gap-1 border rounded-full px-2 py-1 text-sm">
                    <span>{s}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveSource(s)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Add source" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
                <Button onClick={addSource} disabled={!newSource.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
