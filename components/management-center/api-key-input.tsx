"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Copy, Save } from "lucide-react"

type ApiKeyInputProps = {
  label: string
  id: string
  initialValue?: string
  onSave?: (value: string) => void
}

export default function ApiKeyInput({ label, id, initialValue = "", onSave }: ApiKeyInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [value, setValue] = useState(initialValue || "********************************")
  const [isEditing, setIsEditing] = useState(!initialValue)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
  }

  const handleSaveClick = () => {
    if (onSave) {
      onSave(value)
    }
    setIsEditing(false)
  }

  return (
    <div className="p-3 bg-secondary rounded-lg border">
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground block mb-2">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Input
            id={id}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (!isEditing) setIsEditing(true)
            }}
            className="bg-background border font-mono text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:bg-accent"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={handleCopy}>
          <Copy className="w-3 h-3" />
        </Button>
        {onSave && (
          <Button
            size="sm"
            className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary text-xs px-2 py-1"
            onClick={handleSaveClick}
            disabled={!isEditing}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        )}
      </div>
    </div>
  )
}
