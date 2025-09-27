"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Camera, Mic, Eye, Phone } from "lucide-react"

export default function FlowTab() {
  return (
    <div className="space-y-3">
      <Card className="bg-secondary border-none">
        <div className="p-3">
          <h3 className="flex items-center text-base font-semibold text-foreground">
            <Eye className="w-4 h-4 mr-2 text-accent-primary" />
            Live Features
          </h3>
        </div>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="live-translation" className="text-muted-foreground text-sm">
              Real-time Translation
            </Label>
            <Switch id="live-translation" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="live-object-recognition" className="text-muted-foreground text-sm">
              Live Object Recognition
            </Label>
            <Switch id="live-object-recognition" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary border-none">
        <div className="p-3">
          <h3 className="flex items-center text-base font-semibold text-foreground">
            <Camera className="w-4 h-4 mr-2 text-accent-primary" />
            Media Sharing
          </h3>
        </div>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-camera" className="text-muted-foreground text-sm">
              Enable Camera
            </Label>
            <Switch id="enable-camera" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-screen-share" className="text-muted-foreground text-sm">
              Enable Screen Sharing
            </Label>
            <Switch id="enable-screen-share" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary border-none">
        <div className="p-3">
          <h3 className="flex items-center text-base font-semibold text-foreground">
            <Mic className="w-4 h-4 mr-2 text-accent-primary" />
            Voice Interaction
          </h3>
        </div>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="activate-voice" className="text-muted-foreground text-sm">
              Activate Voice
            </Label>
            <Switch id="activate-voice" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="voice-style" className="text-muted-foreground text-sm">
              Voice Style
            </Label>
            <Select>
              <SelectTrigger id="voice-style" className="w-full bg-background h-9">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nova">Nova</SelectItem>
                <SelectItem value="alloy">Alloy</SelectItem>
                <SelectItem value="echo">Echo</SelectItem>
                <SelectItem value="fable">Fable</SelectItem>
                <SelectItem value="onyx">Onyx</SelectItem>
                <SelectItem value="shimmer">Shimmer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language" className="text-muted-foreground text-sm">
              Language
            </Label>
            <Select>
              <SelectTrigger id="language" className="w-full bg-background h-9">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
                <SelectItem value="de-DE">German</SelectItem>
                <SelectItem value="ja-JP">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary border-none">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-base font-semibold text-foreground">
              <Phone className="w-4 h-4 mr-2 text-accent-primary" />
              Calls
            </h3>
            <Button size="sm" className="h-8 px-3">
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          </div>
        </div>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-calls" className="text-muted-foreground text-sm">
              Enable Voice Calls
            </Label>
            <Switch id="enable-calls" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-video-calls" className="text-muted-foreground text-sm">
              Enable Video Calls
            </Label>
            <Switch id="enable-video-calls" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
