"use client"

import { Button } from "@/components/ui/button"
import { X, FileText } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TemplatesGallery } from "./templates-gallery"

interface DocumentsPanelProps {
  togglePanel: () => void
}

type DocumentType = "word" | "cell" | "slide"

declare global {
  interface Window {
    DocsAPI?: any
  }
}

export default function DocumentsPanel({ togglePanel }: DocumentsPanelProps) {
  type PanelTab = "docs" | "sheets" | "pdf" | "slides" | "templates" | "saved"
  const [activeTab, setActiveTab] = useState<PanelTab>("docs")

  const defaultDocUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DEFAULT_DOC_URL || "https://filesamples.com/samples/document/docx/sample3.docx"
  const defaultSheetUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DEFAULT_SHEET_URL || "https://filesamples.com/samples/document/xlsx/sample3.xlsx"
  const defaultPdfUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DEFAULT_PDF_URL || "https://filesamples.com/samples/document/pdf/sample3.pdf"
  const defaultPptUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DEFAULT_PPT_URL || "/templates/pptx/sample.pptx"

  const [onlyOfficeBase, setOnlyOfficeBase] = useState(() => {
    const raw = process.env.NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL?.trim() || ""
    return raw
  })
  const [docUrl, setDocUrl] = useState<string>(defaultDocUrl)
  const [sheetUrl, setSheetUrl] = useState<string>(defaultSheetUrl)
  const [pdfUrl, setPdfUrl] = useState<string>(defaultPdfUrl)
  const [pptUrl, setPptUrl] = useState<string>(defaultPptUrl)

  // Saved entries state
  const [savedItems, setSavedItems] = useState<Array<{ id: string; url: string; kind: "docx" | "xlsx" | "pdf" | "pptx"; title?: string; createdAt: string }>>([])

  // Load registry (saved items)
  const refreshSaved = async () => {
    try {
      const resp = await fetch('/api/documents/registry', { cache: 'no-store' })
      if (!resp.ok) return
      const data = await resp.json()
      if (Array.isArray(data?.items)) setSavedItems(data.items)
    } catch {}
  }

  // Extract a clean lowercase file extension from a URL, ignoring query/hash
  function getFileTypeFromUrl(u: string, fallback: string): string {
    try {
      const p = new URL(u).pathname
      const m = p.match(/\.([a-zA-Z0-9]+)$/)
      return (m?.[1] || fallback).toLowerCase()
    } catch {
      const cleaned = (u || "").split("?#")[0].split("?")[0]
      const parts = cleaned.split(".")
      return (parts[parts.length - 1] || fallback).toLowerCase()
    }
  }


  useEffect(() => {
    if (onlyOfficeBase) return
    if (typeof window === "undefined") return
    const { protocol, hostname } = window.location
    const fallback = `${protocol}//${hostname}:8082`
    setOnlyOfficeBase(fallback)
  }, [onlyOfficeBase])

  const hasOnlyOffice = !!onlyOfficeBase
  const hasAnyDocument = !!(docUrl || sheetUrl || pdfUrl || pptUrl)

  // Persist and restore last-opened URLs per tab so users don't lose context on refresh/close
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('documents:last-opened')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.docs) setDocUrl(parsed.docs)
        if (parsed?.sheets) setSheetUrl(parsed.sheets)
        if (parsed?.pdf) setPdfUrl(parsed.pdf)
        if (parsed?.slides) setPptUrl(parsed.slides)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = { docs: docUrl, sheets: sheetUrl, pdf: pdfUrl, slides: pptUrl, ts: Date.now() }
      localStorage.setItem('documents:last-opened', JSON.stringify(payload))
    } catch {}
  }, [docUrl, sheetUrl, pdfUrl, pptUrl])

  // Bridge: notify others about active tab changes and accept load URL requests
  useEffect(() => {
    // Emit current active tab on mount and whenever it changes
    const emit = () => {
      window.dispatchEvent(new CustomEvent("documentsActiveTabChanged", { detail: { tab: activeTab } }))
    }
    emit()
    return () => {}
  }, [activeTab])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ tab: "docs" | "sheets" | "pdf" | "slides"; url: string }>
      const { tab, url } = ce.detail || ({} as any)
      if (!tab || !url) return
      if (tab === "docs") setDocUrl(url)
      if (tab === "sheets") setSheetUrl(url)
      if (tab === "pdf") setPdfUrl(url)
      if (tab === "slides") setPptUrl(url)
    }
    window.addEventListener("documentsLoadUrl", handler as EventListener)
    return () => window.removeEventListener("documentsLoadUrl", handler as EventListener)
  }, [])

  // Allow external code (e.g., chat) to switch tabs programmatically
  useEffect(() => {
    const onSetTab = (e: Event) => {
      const { tab } = (e as CustomEvent<{ tab: PanelTab }>).detail || ({} as any)
      if (!tab) return
      setActiveTab(tab)
    }
    window.addEventListener("documentsSetActiveTab", onSetTab as EventListener)
    return () => window.removeEventListener("documentsSetActiveTab", onSetTab as EventListener)
  }, [])

  // Handle document creation from executive agent
  useEffect(() => {
    const handleDocumentCreated = (e: Event) => {
      const ce = e as CustomEvent<{ tab: "docs" | "sheets" | "pdf" | "slides"; url: string; type: string }>
      const { tab, url, type } = ce.detail || ({} as any)
      console.log("[DocumentsPanel] documentCreated event received:", { tab, url, type })
      console.log("[DocumentsPanel] Current activeTab:", activeTab)
      
      if (!tab || !url) {
        console.warn("[DocumentsPanel] Missing tab or url:", { tab, url })
        return
      }
      
      // Set the URL for the appropriate tab
      if (tab === "docs") {
        console.log("[DocumentsPanel] Setting docUrl to:", url)
        setDocUrl(url)
      }
      if (tab === "sheets") {
        console.log("[DocumentsPanel] Setting sheetUrl to:", url)
        setSheetUrl(url)
      }
      if (tab === "pdf") {
        console.log("[DocumentsPanel] Setting pdfUrl to:", url)
        setPdfUrl(url)
      }
      if (tab === "slides") {
        console.log("[DocumentsPanel] Setting pptUrl to:", url)
        setPptUrl(url)
      }
      
      // Switch to that tab AFTER the URL state has been set and DOM updated
      // This prevents React from trying to render the editor before the URL is ready
      console.log("[DocumentsPanel] About to call setActiveTab with:", tab)
      requestAnimationFrame(() => {
        setActiveTab(tab)
        console.log("[DocumentsPanel] setActiveTab called via requestAnimationFrame")
      })

      // Refresh saved registry list when new document is created
      refreshSaved()
    }
    window.addEventListener("documentCreated", handleDocumentCreated as EventListener)
    return () => window.removeEventListener("documentCreated", handleDocumentCreated as EventListener)
  }, [activeTab])

  // Initial load of saved items
  useEffect(() => {
    refreshSaved()
  }, [])

  return (
    <div className="w-[60%] bg-card border-l flex flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <div className="h-9 border-b flex items-center justify-between px-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-medium leading-none">Documents</h2>
          </div>
          <div className="flex items-center flex-1 justify-center">
            <TabsList className="h-7 bg-transparent border-none p-0 gap-1">
              <TabsTrigger className="text-[11px] h-7 px-2" value="docs">Docs</TabsTrigger>
              <TabsTrigger className="text-[11px] h-7 px-2" value="sheets">Sheets</TabsTrigger>
              <TabsTrigger className="text-[11px] h-7 px-2" value="pdf">PDF</TabsTrigger>
              <TabsTrigger className="text-[11px] h-7 px-2" value="slides">Slides</TabsTrigger>
              <TabsTrigger className="text-[11px] h-7 px-2" value="templates">Templates</TabsTrigger>
              <TabsTrigger className="text-[11px] h-7 px-2" value="saved">Saved</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={async () => {
                try {
                  const resp = await fetch(`/api/documents/latest?tab=${activeTab}`)
                  if (!resp.ok) return
                  const data = await resp.json()
                  const nextUrl = data?.url
                  if (!nextUrl) return
                  window.dispatchEvent(new CustomEvent("documentsLoadUrl", { detail: { tab: activeTab, url: nextUrl } }))
                } catch {}
              }}
            >
              Load latest
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePanel}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasOnlyOffice ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <p className="text-sm">Provide embed sources to enable the Documents panel.</p>
                <p className="text-xs mt-2">Set NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL and the file URLs (DOC, XLSX, PDF) to use the self-hosted OnlyOffice Document Server.</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="saved" className="flex-1 overflow-hidden h-full mt-0 relative">
                <div className="h-full flex flex-col">
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Saved documents</div>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={refreshSaved}>Refresh</Button>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-2">
                    {savedItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4">No saved items yet.</div>
                    ) : (
                      savedItems.map((it) => {
                        const when = new Date(it.createdAt)
                        const tab = it.kind === 'docx' ? 'docs' : it.kind === 'xlsx' ? 'sheets' : it.kind === 'pptx' ? 'slides' : 'pdf'
                        const badgeColor = it.kind === 'docx' ? 'bg-blue-500/20 text-blue-300' : it.kind === 'xlsx' ? 'bg-green-500/20 text-green-300' : it.kind === 'pptx' ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300'
                        return (
                          <div key={`${it.kind}:${it.id}:${it.url}`} className="flex items-center justify-between rounded-md border border-muted/20 p-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{it.kind.toUpperCase()}</span>
                                <span className="text-sm text-foreground truncate max-w-[40vw]">{it.title || it.id}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[60vw]">{it.url}</div>
                              <div className="text-[10px] text-muted-foreground">{when.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => {
                                // Load URL into appropriate tab and switch
                                if (tab === 'docs') setDocUrl(it.url)
                                if (tab === 'sheets') setSheetUrl(it.url)
                                if (tab === 'pdf') setPdfUrl(it.url)
                                if (tab === 'slides') setPptUrl(it.url)
                                setActiveTab(tab as PanelTab)
                              }}>Open</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(it.url).catch(()=>{}) }}>Copy link</Button>
                              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={async () => {
                                try {
                                  await fetch('/api/documents/registry', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, url: it.url }) })
                                  refreshSaved()
                                } catch {}
                              }}>Delete</Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="templates" className="flex-1 overflow-hidden h-full mt-0 relative">
                <TemplatesGallery
                  onUseTemplate={async (kind, template) => {
                    try {
                      const resp = await fetch("/api/documents/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          prompt: template.title, 
                          kind, 
                          template: template.id, 
                          templateUrl: template.url 
                        }),
                      })
                      if (!resp.ok) return
                      const data = await resp.json()
                      const url = data?.url
                      if (!url) return
                      
                      // Determine which tab to switch to
                      const tab = kind === "docx" ? "docs" : 
                                 kind === "xlsx" ? "sheets" : 
                                 kind === "pptx" ? "slides" : "pdf"
                      
                      // Set the URL for the appropriate tab
                      if (tab === "docs") setDocUrl(url)
                      if (tab === "sheets") setSheetUrl(url)
                      if (tab === "pdf") setPdfUrl(url)
                      if (tab === "slides") setPptUrl(url)
                      
                      // Switch to that tab
                      setActiveTab(tab as any)
                    } catch (e) {
                      console.error("Error using template:", e)
                    }
                  }}
                />
              </TabsContent>
              <TabsContent value="docs" className="flex-1 overflow-hidden">
                <div className="h-full">
                  {docUrl ? (
                    <OnlyOfficeEditor
                      key={docUrl}
                      id="onlyoffice-docs"
                      documentType="word"
                      fileType={getFileTypeFromUrl(docUrl, "docx")}
                      title="Document"
                      url={docUrl}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                      <div>
                        <p>No document loaded yet.</p>
                        <p className="text-xs mt-2">Ask the Executive agent to create a document, or use the Templates tab.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="sheets" className="flex-1 overflow-hidden">
                <div className="h-full">
                  {sheetUrl ? (
                    <OnlyOfficeEditor
                      key={sheetUrl}
                      id="onlyoffice-sheets"
                      documentType="cell"
                      fileType={getFileTypeFromUrl(sheetUrl, "xlsx")}
                      title="Spreadsheet"
                      url={sheetUrl}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                      <div>
                        <p>No spreadsheet loaded yet.</p>
                        <p className="text-xs mt-2">Ask the Executive agent to create a spreadsheet, or use the Templates tab.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="pdf" className="flex-1 overflow-hidden">
                <div className="h-full">
                  {pdfUrl ? (
                    <OnlyOfficeEditor
                      key={pdfUrl}
                      id="onlyoffice-pdf"
                      documentType="word"
                      fileType={getFileTypeFromUrl(pdfUrl, "pdf")}
                      title="PDF"
                      url={pdfUrl}
                      readOnly
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                      <div>
                        <p>No PDF loaded yet.</p>
                        <p className="text-xs mt-2">Ask the Executive agent to create a PDF, or use the Templates tab.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="slides" className="flex-1 overflow-hidden">
                <div className="h-full">
                  {pptUrl ? (
                    <OnlyOfficeEditor
                      key={pptUrl}
                      id="onlyoffice-slides"
                      documentType="slide"
                      fileType={getFileTypeFromUrl(pptUrl, "pptx")}
                      title="Presentation"
                      url={pptUrl}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                      <div>
                        <p>No presentation loaded yet.</p>
                        <p className="text-xs mt-2">Ask the Executive agent to create a presentation, or use the Templates tab.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}

function OnlyOfficeEditor({
  id,
  documentType,
  fileType,
  title,
  url,
  readOnly,
}: {
  id: string
  documentType: DocumentType
  fileType: string
  title: string
  url: string
  readOnly?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  // Load OnlyOffice API script once from proxy (avoids CORS)
  useEffect(() => {
    const scriptId = "onlyoffice-docs-api"
    if (document.getElementById(scriptId)) return

    const script = document.createElement("script")
    script.id = scriptId
    // Load from same-origin proxy
    const baseOrigin = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    script.src = `${baseOrigin}/onlyoffice-proxy/web-apps/apps/api/documents/api.js`
    script.async = true
    script.onerror = () => {
      setStatus("error")
      setError(`Cannot load OnlyOffice script. Ensure container is running: docker compose up -d onlyoffice`)
    }
    document.body.appendChild(script)

    return () => {
      // keep script for reuse
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 40 // ~12s total at 300ms intervals

    const attemptInit = async () => {
      if (cancelled) return
      if (!containerRef.current) return
      if (!window.DocsAPI) {
        attempts++
        if (attempts < maxAttempts) {
          setStatus("loading")
          setTimeout(attemptInit, 300)
          return
        }
        // After max attempts, gather diagnostics
        setStatus("error")
        try {
          const diagResp = await fetch('/api/onlyoffice/diagnostics')
          const diag = await diagResp.json().catch(() => null)
          const scriptStatus = diag?.script?.status || diag?.scriptGet?.status
          const healthStatus = diag?.health?.status
          const base = diag?.base
          setError(`API script unreachable (script=${scriptStatus || 'timeout'}, health=${healthStatus || 'n/a'}) at ${base}.`)
        } catch {
          setError(`OnlyOffice API not loaded. Is the Document Server running?`)
        }
        return
      }

      // DocsAPI available: build config
      if (editorRef.current && editorRef.current.destroyEditor) {
        try { editorRef.current.destroyEditor() } catch {}
      }
      let tokenRaw: string | undefined
      let documentServerUrl: string | undefined
      let config: any = {
        documentType,
        document: { fileType, title, url },
        editorConfig: { mode: readOnly ? 'view' : 'edit', lang: 'en' },
        height: '100%',
        width: '100%',
      }
      try {
        const resp = await fetch('/api/documents/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentType, fileType, title, url, mode: readOnly ? 'view' : 'edit' }),
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data?.config) {
            config = data.config
            tokenRaw = data.token
            documentServerUrl = data.documentServerUrl
            if (tokenRaw) (config as any).token = tokenRaw
          }
        }
      } catch {}

      try {
        // Use documentServerUrl from session response if provided
        const editorConfig = documentServerUrl 
          ? { ...config, documentServerUrl }
          : config
        
        // eslint-disable-next-line new-cap
        editorRef.current = new window.DocsAPI.DocEditor(id, editorConfig)
        if (!cancelled) {
          setStatus('ready')
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error')
          setError(e?.message || 'Failed to initialize OnlyOffice editor')
        }
      }
    }

    setStatus('loading')
    setError(null)
    attemptInit()

    return () => {
      cancelled = true
      if (editorRef.current && editorRef.current.destroyEditor) {
        try { editorRef.current.destroyEditor() } catch {}
      }
    }
  }, [id, documentType, fileType, title, url, readOnly])

  return (
    <div className="w-full h-full">
      {!url ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
          Provide a file URL via env to preview: {id === "onlyoffice-docs" && "NEXT_PUBLIC_ONLYOFFICE_DOC_URL"}
          {id === "onlyoffice-sheets" && "NEXT_PUBLIC_ONLYOFFICE_SHEET_URL"}
          {id === "onlyoffice-pdf" && "NEXT_PUBLIC_ONLYOFFICE_PDF_URL"}
          {id === "onlyoffice-slides" && "NEXT_PUBLIC_ONLYOFFICE_PPT_URL"}
        </div>
      ) : (
        <div className="relative w-full h-full">
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-4">
              {status === 'loading' && 'Connecting to OnlyOffice Document Server (attempting auto-retry)...'}
              {status === 'error' && (
                <div className="text-center">
                  <div className="font-medium mb-1">Document Server unavailable</div>
                  <div className="opacity-80 text-xs max-w-md mx-auto">
                    {error}
                    <div className="mt-2">Actions: 1) Ensure Docker Desktop is running. 2) Run: <code>docker compose up -d onlyoffice</code>. 3) First startup can take 60-120s.</div>
                    <div className="mt-2">Diagnostics endpoint: <code>/api/onlyoffice/diagnostics</code></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div id={id} ref={containerRef} className="w-full h-full" />
        </div>
      )}
    </div>
  )
}
