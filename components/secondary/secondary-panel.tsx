"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, ExternalLink, Clock, Search, Globe } from "lucide-react"

type SearchResult = {
  query: string
  response: string
  sources: Array<{
    title: string
    url: string
    snippet: string
    favicon?: string
  }>
  timestamp: number
  hasWebResults?: boolean
}

type SecondaryPanelProps = {
  isOpen: boolean
  onClose: () => void
}

export default function SecondaryPanel({ isOpen, onClose }: SecondaryPanelProps) {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)

  useEffect(() => {
    const handleSearchResults = (event: CustomEvent) => {
      setSearchResults(event.detail)
    }

    window.addEventListener("searchResults", handleSearchResults as EventListener)
    return () => {
      window.removeEventListener("searchResults", handleSearchResults as EventListener)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="w-1/2 bg-card border-l flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Results
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchResults ? (
          <div className="space-y-0">
            <div className="bg-blue-500/10 border-b border-blue-500/20 p-4">
              <div className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                <Clock className="w-3 h-3" />
                {new Date(searchResults.timestamp).toLocaleTimeString()}
                {searchResults.hasWebResults && (
                  <>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                    <span>Live web results</span>
                  </>
                )}
              </div>
              <h3 className="font-medium text-foreground text-sm">"{searchResults.query}"</h3>
            </div>

            <div className="p-4 border-b">
              <div className="prose prose-sm max-w-none text-foreground">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{searchResults.response}</div>
              </div>
            </div>

            {searchResults.sources && searchResults.sources.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium text-foreground text-sm mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Sources ({searchResults.sources.length})
                </h4>
                <div className="space-y-3">
                  {searchResults.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-secondary/30 hover:bg-secondary/50 rounded-lg p-3 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {source.favicon ? (
                            <img
                              src={source.favicon || "/placeholder.svg"}
                              alt=""
                              className="w-4 h-4 rounded-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                                e.currentTarget.nextElementSibling!.style.display = "block"
                              }}
                            />
                          ) : null}
                          <Globe
                            className="w-4 h-4 text-muted-foreground"
                            style={{ display: source.favicon ? "none" : "block" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm text-foreground group-hover:text-blue-400 transition-colors line-clamp-2">
                            {source.title}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.snippet}</p>
                          <p className="text-xs text-blue-400 mt-1 truncate">{new URL(source.url).hostname}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Click the Search button and ask a question to see results here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
