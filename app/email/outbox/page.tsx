"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  from: string
  to: string
  subject?: string | null
  text?: string | null
  html?: string | null
  created_at?: string
  status?: string | null
  provider?: string | null
  attachments?: Array<{ filename: string; mime?: string; size_bytes?: number }> | null
}

export default function OutboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function refresh() {
    setIsLoading(true)
    try {
      const url = new URL('/api/email/outbox', window.location.origin)
      if (query) url.searchParams.set('search', query)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      const json = await res.json()
      setMessages(Array.isArray(json?.items) ? json.items : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/email" className="text-muted-foreground hover:text-foreground" title="Back to Email">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div className="font-medium">Outbox</div>
          <div className="ml-auto flex items-center gap-2">
            <Input className="h-8 w-56" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
            <Button size="sm" onClick={refresh} disabled={isLoading}>{isLoading ? 'Loading…' : 'Refresh'}</Button>
            <Link href="/email/compose" className="text-sm underline">Compose</Link>
          </div>
        </div>
      </div>
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="space-y-2">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">No sent messages.</div>
          )}
          {messages.map(m => (
            <div key={m.id} className="rounded border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">{m.subject || '(no subject)'}</div>
                <div className="text-xs text-muted-foreground">{m.created_at?.slice?.(0,19)?.replace('T',' ')}</div>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                From: {m.from} • To: {m.to} {m.attachments?.length ? `• ${m.attachments.length} attachment${m.attachments.length>1?'s':''}` : ''} {m.status ? `• ${m.status}` : ''} {m.provider ? `• ${m.provider}` : ''}
              </div>
              {m.text ? (
                <div className="text-sm mt-2 whitespace-pre-wrap line-clamp-3">{m.text}</div>
              ) : m.html ? (
                <div className="text-sm mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.html }} />
              ) : null}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
