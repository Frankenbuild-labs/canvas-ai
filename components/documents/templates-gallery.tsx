"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Sheet, FileType, Presentation, Download, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Template {
  id: string
  name: string
  description: string
  category: string
  type: "docx" | "xlsx" | "pptx" | "pdf"
  path: string
  thumbnail?: string
  featured?: boolean
  status?: "stub" | "active" | "deprecated" // templates can be metadata-only stubs
  complexityScore?: number
}

interface Category {
  id: string
  name: string
  count: number
}

interface TemplatesGalleryProps {
  onUseTemplate: (kind: "docx" | "xlsx" | "pdf" | "pptx", template: { id: string; title: string; url: string }) => void
}

export function TemplatesGallery({ onUseTemplate }: TemplatesGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/templates")
      if (!response.ok) throw new Error("Failed to load templates")
      const data = await response.json()

      // Support new manifest structure (public/templates/templates.json) when API returns empty
      const apiTemplates: Template[] = data.templates || []
      const apiCategories: Category[] = data.categories || []

      // If no templates from API, attempt to fetch manifest directly (stub mode)
      if (apiTemplates.length === 0) {
        try {
          const manifestRes = await fetch("/templates/templates.json")
          if (manifestRes.ok) {
            const manifest = await manifestRes.json()
            const stubTemplates: Template[] = (manifest.templates || []).map((t: any) => ({
              id: t.id,
              name: t.id.replace(/tmpl_[^_]+_|_v\d+$/g, '').replace(/_/g, ' '),
              description: "Template stub – awaiting asset upload.",
              category: (t.domain && t.domain[0]) || "general",
              type: (t.artifactType || "docx"),
              path: `/templates/${t.artifactType}/${t.id}.${t.artifactType}`,
              status: t.status || "stub",
              complexityScore: t.complexityScore,
            }))
            setTemplates(stubTemplates)
            // Derive categories from manifest if API omitted them
            const derivedCats: Category[] = (manifest.categories || []).map((c: string) => ({
              id: c,
              name: c,
              count: stubTemplates.filter(st => st.category === c).length,
            }))
            setCategories(derivedCats)
            setLoading(false)
            return
          }
        } catch (_) {
          // ignore manifest fetch errors, fall back to API data
        }
      }

      setTemplates(apiTemplates)
      setCategories(apiCategories)
    } catch (err: any) {
      setError(err.message || "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = (selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)
  ).sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name)
    if (sortBy === "oldest") return a.id.localeCompare(b.id) 
    return b.id.localeCompare(a.id) // newest first
  })

  const getColorForType = (type: string) => {
    switch (type) {
      case "docx": return { bg: "from-blue-500 to-blue-600", icon: "📄" }
      case "xlsx": return { bg: "from-green-500 to-green-600", icon: "📊" }
      case "pptx": return { bg: "from-orange-500 to-orange-600", icon: "📽️" }
      case "pdf": return { bg: "from-red-500 to-red-600", icon: "📕" }
      default: return { bg: "from-blue-500 to-blue-600", icon: "📄" }
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "docx": return <FileText className="w-5 h-5 text-blue-500" />
      case "xlsx": return <Sheet className="w-5 h-5 text-green-500" />
      case "pptx": return <Presentation className="w-5 h-5 text-orange-500" />
      case "pdf": return <FileType className="w-5 h-5 text-red-500" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 space-y-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-semibold">Document templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill out the documents online in one click or download and open them in ONLYOFFICE editors
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "text-xs",
                selectedCategory === category.id && "bg-orange-500 hover:bg-orange-600"
              )}
            >
              {category.name.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Count & Sort */}
      <div className="px-4 py-3 border-b flex-shrink-0 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Document' : 'Documents'}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              SORT BY: {sortBy === "newest" ? "Newest - Oldest" : sortBy === "oldest" ? "Oldest - Newest" : "Name"}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>
              Newest - Oldest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>
              Oldest - Newest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("name")}>
              Name (A-Z)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Templates Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-muted-foreground">No templates found.</p>
            <p className="text-xs text-muted-foreground">Upload assets into <code>public/templates/&lt;type&gt;</code> or register stub metadata in <code>templates.json</code>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                {/* Thumbnail - Real Document Preview */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {template.status === "stub" ? (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground p-2 text-center">
                      Metadata Stub
                    </div>
                  ) : (
                    <img 
                      src={template.thumbnail || `/api/templates/preview?path=${encodeURIComponent(template.path)}`}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        if (!img.src.includes('/api/templates/preview')) {
                          img.src = `/api/templates/preview?path=${encodeURIComponent(template.path)}`
                        }
                      }}
                    />
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute bottom-1.5 left-1.5 bg-white dark:bg-gray-800 rounded px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                    <div className="scale-75">
                      {getIconForType(template.type)}
                    </div>
                  </div>
                </div>

                {/* Content - More compact */}
                <div className="p-2 space-y-1.5">
                  <h3 className="font-medium text-xs line-clamp-1 flex items-center gap-1">
                    {template.name}
                    {template.status === "stub" && (
                      <span className="text-[9px] px-1 py-0.5 bg-yellow-200 text-yellow-800 rounded">STUB</span>
                    )}
                  </h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                  
                  {/* Actions - More compact */}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-[10px] h-7 px-2"
                      disabled={template.status === "stub"}
                      onClick={() => onUseTemplate(template.type, {
                        id: template.id,
                        title: template.name,
                        url: template.path
                      })}
                    >
                      {template.status === "stub" ? "Pending" : "Use"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        // Download template
                        const link = document.createElement('a')
                        link.href = template.path
                        link.download = `${template.name}.${template.type}`
                        link.click()
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
