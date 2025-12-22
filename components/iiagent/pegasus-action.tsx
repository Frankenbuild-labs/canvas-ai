"use client"

import { ActionStep } from "@/lib/agent-types"
import { Button } from "@/components/ui/button"
import { Code, Terminal, Globe, FileText } from "lucide-react"

interface ActionProps {
  action: ActionStep
  onClick?: () => void
  showTabOnly?: boolean
}

export default function Action({ action, onClick, showTabOnly = false }: ActionProps) {
  const { tool, parameters } = action

  // Get icon based on tool type
  const getIcon = () => {
    if (tool.includes("REPLACE") || tool.includes("EDIT")) return <Code className="w-4 h-4" />
    if (tool.includes("SHELL") || tool.includes("TERMINAL")) return <Terminal className="w-4 h-4" />
    if (tool.includes("BROWSER") || tool.includes("WEB")) return <Globe className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  // Get display title
  const getTitle = () => {
    if (tool.includes("REPLACE")) return "Edit File"
    if (tool.includes("SHELL")) return "Run Command"
    if (tool.includes("BROWSER")) return "Browser Action"
    if (tool.includes("WEB_SEARCH")) return "Web Search"
    return tool.replace(/_/g, " ")
  }

  // Get parameter display
  const getParamDisplay = () => {
    if (!parameters) return null
    
    if (parameters.path) return parameters.path as string
    if (parameters.command) return parameters.command as string
    if (parameters.query) return parameters.query as string
    if (parameters.url) return parameters.url as string
    
    return null
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start gap-2 h-auto py-2 px-3 text-left"
      onClick={onClick}
    >
      <div className="flex items-start gap-2 w-full">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{getTitle()}</div>
          {getParamDisplay() && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {getParamDisplay()}
            </div>
          )}
        </div>
      </div>
    </Button>
  )
}
