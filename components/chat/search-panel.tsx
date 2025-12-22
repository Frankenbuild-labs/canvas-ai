"use client"
import { useState } from "react"
import { Search, X, ExternalLink, Image as ImageIcon, Sparkles } from "lucide-react"

interface SearchResult {
  id: string
  title: string
  url: string
  text?: string
  image?: string
  favicon?: string
  publishedDate?: string
  author?: string
  score?: number
}

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    
    try {
      const response = await fetch('/api/search/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Failed to search')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[500px] bg-card border-l shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-secondary/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-foreground">Web Search</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="Close search panel"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b bg-background">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search the web..."
            className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="w-full mt-2 py-2 bg-accent-primary hover:bg-accent-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Results Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {results.length === 0 && !isSearching && !error && (
          <div className="text-center text-muted-foreground py-12">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Enter a search query to find results</p>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.id}
            className="group p-4 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-all hover:shadow-md"
          >
            {/* Result Header */}
            <div className="flex items-start gap-3 mb-2">
              {result.favicon && (
                <img
                  src={result.favicon}
                  alt=""
                  className="w-5 h-5 mt-0.5 rounded"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-primary hover:underline font-medium line-clamp-1 flex items-center gap-1 group/link"
                >
                  {result.title}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </a>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {new URL(result.url).hostname}
                </p>
              </div>
            </div>

            {/* Result Image (if available) */}
            {result.image && (
              <div className="mb-3 rounded-md overflow-hidden bg-background">
                <img
                  src={result.image}
                  alt={result.title}
                  className="w-full h-32 object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}

            {/* Result Text */}
            {result.text && (
              <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed mb-2">
                {result.text}
              </p>
            )}

            {/* Result Metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {result.author && (
                <span className="flex items-center gap-1">
                  By {result.author}
                </span>
              )}
              {result.publishedDate && (
                <span>
                  {new Date(result.publishedDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
