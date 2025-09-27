"use client"

import { useState } from "react"
import EmbeddedVSCode from "@/components/vscode/embedded-vscode"
const VSCODE_URL = process.env.NEXT_PUBLIC_VSCODE_URL || "http://127.0.0.1:3100/"
import LeftPanel from "@/components/chat/left-panel"
import ChatArea from "@/components/chat/chat-area"
import RightPanel from "@/components/chat/right-panel"
import DocumentsPanel from "@/components/documents/documents-panel"
import SecondaryPanel from "@/components/secondary/secondary-panel"
import ArchagentSandbox from "@/components/iiagent/archagent-sandbox"



const BlankContainer = ({ togglePanel }: { togglePanel: () => void }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'sandbox'>('editor')

  return (
    <div className="w-[65%] bg-card border-l flex flex-col">
      {/* Header with tabs and close button */}
      <div className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'editor' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sandbox' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            Sandbox
          </button>
        </div>
        <button onClick={togglePanel} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          ×
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-background">
        {activeTab === 'editor' && (
          <EmbeddedVSCode url={VSCODE_URL} />
        )}
        {activeTab === 'sandbox' && (
          <ArchagentSandbox />
        )}
      </div>
    </div>
  )
}

const Home = () => {
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [isSecondaryPanelOpen, setIsSecondaryPanelOpen] = useState(false)
  const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false)
  const [isSandboxContainerOpen, setIsSandboxContainerOpen] = useState(false)

  const toggleLeftPanel = () => setIsLeftPanelOpen(!isLeftPanelOpen)
  const toggleRightPanel = () => setIsRightPanelOpen(!isRightPanelOpen)

  const toggleSecondaryPanel = () => {
    setIsSecondaryPanelOpen(!isSecondaryPanelOpen)
    if (!isSecondaryPanelOpen) {
      setIsRightPanelOpen(true)
      setIsDocumentsPanelOpen(false)
      setIsSandboxContainerOpen(false)
    }
  }

  const toggleDocumentsPanel = () => {
    setIsDocumentsPanelOpen(!isDocumentsPanelOpen)
    if (!isDocumentsPanelOpen) {
      setIsRightPanelOpen(true)
      setIsSecondaryPanelOpen(false)
      setIsSandboxContainerOpen(false)
    }
  }

  const toggleSandboxContainer = () => {
    setIsSandboxContainerOpen(!isSandboxContainerOpen)
    if (!isSandboxContainerOpen) {
      setIsLeftPanelOpen(false)
      setIsRightPanelOpen(true)
      setIsSecondaryPanelOpen(false)
      setIsDocumentsPanelOpen(false)
    } else {
      setIsLeftPanelOpen(true)
    }
  }

  const renderRightContent = () => {
    if (isSecondaryPanelOpen) {
      return <SecondaryPanel isOpen={isSecondaryPanelOpen} onClose={toggleRightPanel} />
    }
    if (isDocumentsPanelOpen) {
      return <DocumentsPanel togglePanel={toggleRightPanel} />
    }
    if (isSandboxContainerOpen) {
      return <BlankContainer togglePanel={toggleSandboxContainer} />
    }
    return <RightPanel togglePanel={toggleRightPanel} />
  }

  return (
    <main className="flex h-screen bg-background text-foreground">
      {isLeftPanelOpen && <LeftPanel togglePanel={toggleLeftPanel} />}
      <ChatArea
        isLeftPanelOpen={isLeftPanelOpen}
        toggleLeftPanelAction={toggleLeftPanel}
        isRightPanelOpen={isRightPanelOpen}
        toggleRightPanelAction={toggleRightPanel}
        isSecondaryPanelOpen={isSecondaryPanelOpen}
        toggleSecondaryPanelAction={toggleSecondaryPanel}
        isDocumentsPanelOpen={isDocumentsPanelOpen}
        toggleDocumentsPanelAction={toggleDocumentsPanel}
        isSandboxContainerOpen={isSandboxContainerOpen}
        toggleSandboxContainerAction={toggleSandboxContainer}
      />
      {isRightPanelOpen && renderRightContent()}
    </main>
  )
}

export default Home
