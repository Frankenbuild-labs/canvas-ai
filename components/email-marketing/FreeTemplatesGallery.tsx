"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type CatalogItem = { id: string; name: string; path: string; rawUrl: string }
type CatalogSource = { source: string; items: CatalogItem[] }

export default function FreeTemplatesGallery() {
  const [sources, setSources] = useState<CatalogSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/email/templates/catalog', { cache: 'no-store' })
        const json = await res.json()
        if (mounted) {
          if (json.success) setSources(json.catalog)
          else setError(json.error || 'Failed to load catalog')
        }
      } catch (e: any) {
        if (mounted) setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleUseTemplate = async (item: CatalogItem) => {
    try {
      // Pre-fetch the HTML through our proxy to avoid CORS issues
  const res = await fetch(`/api/email/templates/fetch?url=${encodeURIComponent(item.rawUrl)}`)
      if (!res.ok) throw new Error('Failed to fetch template HTML')
      const html = await res.text()
      sessionStorage.setItem('prefill_template_html', html)
      sessionStorage.setItem('prefill_template_name', item.name)
      router.push('/email/templates/new?prefill=1')
    } catch (e) {
      alert('Could not load template HTML. Please try again.')
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading free templates…</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>

  const flatItems: Array<CatalogItem & { source: string }> = []
  sources.forEach(s => s.items.forEach(it => flatItems.push({ ...it, source: s.source })))

  if (flatItems.length === 0) {
    return (
      <div className="bg-muted border border-border rounded p-4 text-sm text-muted-foreground">
        No templates found from the free catalogs right now.
      </div>
    )
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Free Template Gallery</h2>
          <p className="text-muted-foreground">Sources: Designmodo, Colorlib</p>
        </div>
        <Link href="https://github.com/designmodo/html-email-templates" target="_blank" className="text-xs underline text-muted-foreground mr-2">Designmodo</Link>
        <Link href="https://github.com/ColorlibHQ/email-templates" target="_blank" className="text-xs underline text-muted-foreground">Colorlib</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {flatItems.map((item) => (
          <PreviewCard key={item.id} item={item} onUse={() => handleUseTemplate(item)} />
        ))}
      </div>
    </div>
  )
}

function PreviewCard({ item, onUse }: { item: CatalogItem & { source: string }; onUse: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !src) {
          const previewUrl = `/api/email/templates/fetch?injectBase=1&url=${encodeURIComponent(item.rawUrl)}`
          setSrc(previewUrl)
          io.disconnect()
        }
      })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [item.rawUrl, src])

  return (
    <div ref={wrapRef} className="group relative bg-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-border">
      <div className="relative bg-muted">
        {/* 3:4 area */}
        <div className="relative" style={{ paddingBottom: '133.333%' }}>
          {src ? (
            <iframe
              srcDoc={undefined}
              src={src}
              sandbox="allow-same-origin"
              onLoad={() => setLoaded(true)}
              className="absolute inset-0 w-full h-full origin-top-left scale-[0.35] translate-x-[-32%] translate-y-[-32%] bg-white"
              title={item.name}
            />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-[10px] uppercase tracking-wide">
            {item.source}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="font-semibold text-foreground text-sm line-clamp-2 min-h-[2.5rem]">{item.name}</div>
        <button onClick={onUse} className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm py-2 transition-colors">
          Use Template
        </button>
      </div>
    </div>
  )
}
