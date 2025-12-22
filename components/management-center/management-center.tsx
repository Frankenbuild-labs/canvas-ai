"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Settings, Save, Download, Bot, KeyRound, ArrowLeft, FileArchive } from "lucide-react"
import OrchestratorTab from "@/components/management-center/orchestrator-tab"
import ApiKeysTab from "@/components/management-center/api-keys-tab"
import FilesTab from "@/components/management-center/files-tab"
import MemoryTab from "@/components/management-center/memory-tab"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

const managementTabs = [
  { value: "orchestrator", label: "Orchestrator", icon: <Bot /> },
  { value: "files", label: "Files", icon: <FileArchive /> },
  { value: "api-keys", label: "API Keys", icon: <KeyRound /> },
  { value: "memory", label: "Memory", icon: <Bot /> },
]

export default function ManagementCenter() {
  const [activeTab, setActiveTab] = useState("files")

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <a href="/" aria-label="Back to Chat">
                <ArrowLeft className="w-4 h-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <Settings className="w-7 h-7 mr-3 text-accent-primary" />
                Management Center
              </h1>
              <p className="text-muted-foreground mt-1">Manage your platform settings, integrations, and files.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary">
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Config
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-background border-b h-auto justify-start px-6 rounded-none">
          {managementTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-muted-foreground data-[state=active]:text-accent-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--accent-primary))] rounded-none py-3 text-sm"
            >
              <div className="flex items-center">
                {React.cloneElement(tab.icon, { className: "w-4 h-4 mr-2" })}
                {tab.label}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="orchestrator">
            <OrchestratorTab />
          </TabsContent>
          <TabsContent value="files" className="h-full">
            <FilesTab />
          </TabsContent>
          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>
          <TabsContent value="memory" className="h-full">
            <MemoryTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
