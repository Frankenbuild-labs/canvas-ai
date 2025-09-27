"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Calendar, HardDrive, MessageSquare, Settings, LinkIcon, Unlink } from "lucide-react"

interface AuthService {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  connected: boolean
  scopes: string[]
}

export default function McpTab() {
  const [services, setServices] = useState<AuthService[]>([
    {
      id: "gmail",
      name: "Gmail",
      icon: <Mail className="w-5 h-5" />,
      description: "Professional email management and communication",
      connected: false,
      scopes: ["gmail.readonly", "gmail.send", "gmail.compose"],
    },
    {
      id: "calendar",
      name: "Google Calendar",
      icon: <Calendar className="w-5 h-5" />,
      description: "Schedule meetings and manage executive time",
      connected: false,
      scopes: ["calendar.readonly", "calendar.events"],
    },
    {
      id: "drive",
      name: "Google Drive",
      icon: <HardDrive className="w-5 h-5" />,
      description: "Document storage and collaboration",
      connected: false,
      scopes: ["drive.file", "drive.readonly"],
    },
    {
      id: "slack",
      name: "Slack",
      icon: <MessageSquare className="w-5 h-5" />,
      description: "Team communication and collaboration",
      connected: false,
      scopes: ["channels:read", "chat:write", "users:read"],
    },
  ])

  const handleConnect = (serviceId: string) => {
    // TODO: Implement OAuth flow
    setServices((prev) => prev.map((service) => (service.id === serviceId ? { ...service, connected: true } : service)))
  }

  const handleDisconnect = (serviceId: string) => {
    setServices((prev) =>
      prev.map((service) => (service.id === serviceId ? { ...service, connected: false } : service)),
    )
  }

  const connectedCount = services.filter((s) => s.connected).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Metatron Connection Panel (MCP)</h2>
        <p className="text-muted-foreground">
          Centralized authentication for all agent tools and services. Connect your accounts to enable advanced
          capabilities across all agent modes.
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Connection Status
          </CardTitle>
          <CardDescription>
            {connectedCount} of {services.length} services connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage your connected services and add custom MCP tools</p>
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <LinkIcon className="w-4 h-4" />
              Add MCP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Connections */}
      <div className="grid grid-cols-4 gap-1">
        {services.map((service) => (
          <Card key={service.id} className="h-38 w-38">
            <CardHeader className="p-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">{service.icon}</div>
                <CardTitle className="text-sm leading-tight">{service.name}</CardTitle>
                <Badge variant={service.connected ? "default" : "secondary"} className="text-xs mt-2">
                  {service.connected ? "On" : "Off"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {service.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(service.id)}
                  className="w-full text-destructive hover:text-destructive text-xs h-7"
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleConnect(service.id)}
                  className="w-full bg-accent-primary hover:bg-accent-secondary text-xs h-7"
                >
                  <LinkIcon className="w-3 h-3" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
