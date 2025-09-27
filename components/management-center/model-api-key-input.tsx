"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Copy, Save } from "lucide-react"

type ModelApiKeyInputProps = {
  id: string
  label: string
  models: { value: string; label: string }[]
}

export default function ModelApiKeyInput({ id, label, models }: ModelApiKeyInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [value, setValue] = useState("********************************")
  const [isEditing, setIsEditing] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
  }

  const handleSaveClick = () => {
    console.log(`Saving ${label}:`, value)
    setIsEditing(false)
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="p-3 bg-secondary rounded-lg border space-y-2">
        <div>
          <Label htmlFor={`${id}-model`} className="text-xs text-muted-foreground">
            Model
          </Label>
          <Select defaultValue={models[0]?.value}>
            <SelectTrigger id={`${id}-model`} className="w-full bg-background h-8 text-sm">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value} className="text-sm">
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={id} className="text-xs text-muted-foreground">
            API Key
          </Label>
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
            <Button
              size="sm"
              className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary text-xs px-2 py-1"
              onClick={handleSaveClick}
              disabled={!isEditing}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
