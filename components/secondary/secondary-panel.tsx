"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, ExternalLink, Clock, Search, Globe, Copy, FileText, Download } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"

type SearchResult = {
  query: string
  response: string
  sources: Array<{
    id?: number
    title: string
    url: string
    snippet: string
    favicon?: string
    dateTime?: string
    relevanceScore?: number
    domain?: string
  }>
  timestamp: number
  hasWebResults?: boolean
  metadata?: {
    visitedUrls?: number
    totalUrls?: number
    processingTime?: string
    researchDepth?: string
  }
  images?: Array<{
    url: string
    title?: string
    width?: number
    height?: number
    thumbnail?: string
  }>
}

type SecondaryPanelProps = {
  isOpen: boolean
  onCloseAction: () => void
}

export default function SecondaryPanel({ isOpen, onCloseAction }: SecondaryPanelProps) {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const logsRef = useRef<HTMLDivElement | null>(null)
  const [imageModalIndex, setImageModalIndex] = useState<number | null>(null)
  const [isCreatingDocument, setIsCreatingDocument] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const handleSearchResults = (event: CustomEvent) => {
      setSearchResults(event.detail)
      // Keep any accumulated logs if panel was already open; otherwise start clean
      setIsComplete(true)
    }
    window.addEventListener("searchResults", handleSearchResults as EventListener)
    return () => window.removeEventListener("searchResults", handleSearchResults as EventListener)
  }, [])

  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      const d: any = (event as any).detail
      if (d?.type === 'progress' && typeof d.message === 'string') {
        const msg = d.message.trim()
        if (msg) setLogs((prev) => [...prev, msg].slice(-400))
        setIsComplete(false)
      }
      if (d?.type === 'complete') {
        setIsComplete(true)
      }
    }
    window.addEventListener('researchProgress', handleProgress as EventListener)
    return () => window.removeEventListener('researchProgress', handleProgress as EventListener)
  }, [])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  const openDocsPanel = (tab: 'docs' | 'sheets' | 'pdf' | 'slides', url: string) => {
    // Open documents panel via event
    window.dispatchEvent(new CustomEvent('documentCreated', { detail: { tab, url, type: tab } }))
    window.dispatchEvent(new CustomEvent('toggleDocumentsPanel'))
  }

  const parseMarkdownTables = (md: string) => {
    // Very small parser to extract the first markdown table
    const lines = (md || '').split(/\r?\n/)
    let start = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*\|.*\|\s*$/.test(lines[i])) {
        // ensure next line is separator like |---|
        if (i + 1 < lines.length && /^\s*\|\s*:?-{2,}.*\|\s*$/.test(lines[i + 1])) { start = i; break }
      }
    }
    if (start === -1) return null
    const headerLine = lines[start]
    const sepLine = lines[start + 1]
    const dataLines: string[] = []
    for (let j = start + 2; j < lines.length; j++) {
      if (!/^\s*\|.*\|\s*$/.test(lines[j])) break
      dataLines.push(lines[j])
    }
    const splitRow = (row: string) => row.split('|').map(s => s.trim()).filter(Boolean)
    const headers = splitRow(headerLine)
    const rows = dataLines.map(splitRow)
    if (!headers.length || !rows.length) return null
    return { headers, rows }
  }

  const handleCreateDocument = async (format: 'pdf' | 'word' | 'excel' | 'powerpoint') => {
    if (!searchResults) return
    try {
      setIsCreatingDocument(true)
      const title = searchResults.query || 'Research Report'
      const answer = (searchResults.response || '').trim()

      if (format === 'powerpoint') {
        // Build simple slides from the answer
        const sentences = answer.split(/(?<=[.!?])\s+/).filter(Boolean)
        const bullets = sentences.slice(0, 6)
        const res = await fetch('/api/documents/pptx/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, slides: [{ title, bullets }] }),
        })
        const data = await res.json()
        if (res.ok && data?.url) openDocsPanel('slides', data.url)
        return
      }

      // Map to /api/documents/generate
      const kind = format === 'pdf' ? 'pdf' : format === 'word' ? 'docx' : 'xlsx'
      const body: any = { prompt: title, kind, content: undefined as any }
      if (kind === 'docx') body.content = { text: answer }
      if (kind === 'pdf') body.content = { text: answer }
      if (kind === 'xlsx') {
        const table = parseMarkdownTables(answer)
        if (table) {
          body.content = {
            headers: table.headers,
            data: table.rows,
            autoFilter: true,
            tableStyle: 'TableStyleMedium9',
            summary: true,
          }
        } else {
          // Fallback: put sentences as rows
          const sents = (answer || '').split(/(?<=[.!?])\s+/).filter(Boolean)
          body.content = {
            headers: ['Text'],
            data: sents.map((s) => [s.slice(0, 300)]),
          }
        }
      }
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data?.url) {
        const tab = kind === 'docx' ? 'docs' : kind === 'xlsx' ? 'sheets' : 'pdf'
        openDocsPanel(tab, data.url)
      }
    } catch (e) {
      // noop fallback
    } finally {
      setIsCreatingDocument(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-1/2 bg-card border-l flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Results
        </h2>
        <div className="flex items-center gap-2">
          {searchResults?.response && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleCreateDocument('pdf')} disabled={isCreatingDocument} className="text-red-600 border-red-200 hover:bg-red-50">
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCreateDocument('word')} disabled={isCreatingDocument} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Download className="w-4 h-4 mr-1" />
                Docs
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCreateDocument('excel')} disabled={isCreatingDocument} className="text-green-600 border-green-200 hover:bg-green-50">
                <Download className="w-4 h-4 mr-1" />
                Sheets
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCreateDocument('powerpoint')} disabled={isCreatingDocument} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                <Download className="w-4 h-4 mr-1" />
                Slides
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onCloseAction}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchResults || logs.length > 0 ? (
          <div className="h-full flex flex-col">
            <div className="bg-blue-500/10 border-b border-blue-500/20 p-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                <Clock className="w-3 h-3" />
                {searchResults ? new Date(searchResults.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                {searchResults?.hasWebResults && (<><span>•</span><Globe className="w-3 h-3" /><span>Live web results</span></>)}
                {searchResults?.metadata && (<><span>•</span><span>{searchResults.metadata.visitedUrls}/{searchResults.metadata.totalUrls} sources</span></>)}
              </div>
              <h3 className="font-medium text-foreground text-sm">"{searchResults?.query || 'Research in progress'}"</h3>
              {searchResults?.metadata && (
                <div className="text-xs text-muted-foreground mt-1">{searchResults.metadata.researchDepth} • {searchResults.metadata.processingTime}</div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs uppercase text-muted-foreground">Agent Research</span>
                  {searchResults?.response && (
                    <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText((searchResults.response || '').trim())} title="Copy answer" className="h-7 w-7">
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {(!isComplete || logs.length > 0) && (
                  <div className="mb-4">
                    <div className="text-xs uppercase text-muted-foreground mb-2">Agent Work</div>
                    <div ref={logsRef} className="bg-secondary/30 border border-muted/20 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs leading-relaxed">
                      {logs.length > 0 ? logs.map((l, i) => (<div key={i} className="text-muted-foreground">{l}</div>)) : (
                        <div className="text-muted-foreground">Waiting for progress…</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                  {searchResults?.response ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                      components={{
                        a: (props) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" />,
                        h1: (props) => <h1 {...props} className="mt-2" />,
                        h2: (props) => <h2 {...props} className="mt-2" />,
                        h3: (props) => <h3 {...props} className="mt-2" />,
                        ul: (props) => <ul {...props} className="list-disc pl-5" />,
                        ol: (props) => <ol {...props} className="list-decimal pl-5" />,
                        code: (props) => <code {...props} className="bg-muted/50 px-1 py-0.5 rounded" />,
                        img: ({node, ...props}) => <img {...props} className="rounded-lg shadow-md border border-border" />,
                        details: ({node, ...props}) => <details {...props} className="bg-secondary/30 border border-muted/20 rounded-lg p-3 my-3" />,
                        summary: ({node, ...props}) => <summary {...props} className="cursor-pointer font-medium text-accent-primary" />,
                      }}
                    >
                      {searchResults.response}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-sm text-muted-foreground">Answer is being generated…</div>
                  )}
                </div>

                {searchResults?.sources && searchResults.sources.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-foreground text-sm mb-3 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Sources ({searchResults?.sources?.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {searchResults?.sources?.map((source, index) => {
                        let hostname = ''
                        try { hostname = new URL(source.url).hostname.replace('www.', '') } catch {}
                        const favicon = source.favicon || (hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` : undefined)
                        return (
                          <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-muted/20 bg-secondary/30 hover:bg-secondary/50 p-3 transition-colors group">
                            <img src={favicon || "/placeholder.svg"} alt={hostname} className="w-6 h-6 rounded-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg" }} />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm text-foreground group-hover:text-blue-400 transition-colors line-clamp-2">{source.title || hostname}</h5>
                              {source.snippet && (<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.snippet}</p>)}
                              <p className="text-xs text-blue-400 mt-1 truncate">{hostname || source.url}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors flex-shrink-0" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Click the Research button and ask a question to see results here</p>
            </div>
          </div>
        )}
      </div>

      {imageModalIndex !== null && searchResults?.images && searchResults.images[imageModalIndex] && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setImageModalIndex(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={searchResults.images[imageModalIndex].url} alt={searchResults.images[imageModalIndex].title || 'Image'} className="max-h-[80vh] w-full object-contain rounded-md shadow-2xl" />
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => setImageModalIndex((imageModalIndex! - 1 + searchResults.images!.length) % searchResults.images!.length)}>Prev</Button>
              <div className="text-sm text-muted-foreground truncate">{searchResults.images[imageModalIndex].title || 'Untitled image'}</div>
              <Button variant="secondary" onClick={() => setImageModalIndex((imageModalIndex! + 1) % searchResults.images!.length)}>Next</Button>
              <Button variant="destructive" onClick={() => setImageModalIndex(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
