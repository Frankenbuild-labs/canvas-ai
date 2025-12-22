"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Message { id: string; from: string; to: string; subject?: string | null; created_at?: string }

export default function InboxPreviewPanel({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<Message[]>([])
  useEffect(() => { (async () => {
    try {
      const res = await fetch(`/api/email/inbox?limit=${limit}`, { cache: 'no-store' })
      const json = await res.json()
      if (Array.isArray(json?.items)) setItems(json.items.slice(0, limit))
    } catch {}
  })() }, [limit])
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Inbox</h3>
        <Link href="/email/inbox" className="text-xs underline">Open</Link>
      </div>
      <div className="space-y-1">
        {items.map(m => (
          <div key={m.id} className="text-xs flex items-center justify-between border rounded px-2 py-1 bg-muted/40">
            <span className="truncate max-w-[160px]" title={m.subject || '(no subject)'}>{m.subject || '(no subject)'}</span>
            <span className="text-[10px] text-muted-foreground">{m.created_at?.slice?.(0,10) || ''}</span>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-muted-foreground">No messages.</div>}
      </div>
    </div>
  )
}
