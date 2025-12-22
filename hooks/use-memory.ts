"use client"
import { useEffect, useState } from "react"

export function useMemorySnapshot() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({ lastResearch: null, currentDocument: null, images: [] })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/memory/last-research", { cache: "no-store" }),
          fetch("/api/memory/current-document", { cache: "no-store" }),
        ])
        const lastResearch = await r1.json().catch(() => ({}))
        const currentDocument = await r2.json().catch(() => ({}))
        const docId = currentDocument?.document?.docId
        const imgsRes = await fetch("/api/memory/images" + (docId ? `?docId=${encodeURIComponent(docId)}` : ""), { cache: "no-store" })
        const imgsJson = await imgsRes.json().catch(() => ({}))
        if (!cancelled) setData({ lastResearch, currentDocument, images: imgsJson?.images || [] })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load memory")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])
  return { ...data, loading, error }
}
