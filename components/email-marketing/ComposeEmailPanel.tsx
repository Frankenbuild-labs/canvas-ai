"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { EmailTemplate } from "@/lib/email-marketing/types"

type Props = {
  verifiedDomains: Array<{ name: string; status?: string }>
  templates: EmailTemplate[]
}

export default function ComposeEmailPanel({ verifiedDomains, templates }: Props) {
  const [from, setFrom] = useState("")
  const fromOptions = useMemo(() => {
    const entries: string[] = []
    for (const d of verifiedDomains) {
      entries.push(`noreply@${d.name}`)
      entries.push(`hello@${d.name}`)
      entries.push(`support@${d.name}`)
    }
    return Array.from(new Set(entries))
  }, [verifiedDomains])

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Quick Compose</h3>
        <Link href="/email/compose" className="text-xs underline">Open full composer</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1 md:col-span-1">
          <Label htmlFor="qc-from">From</Label>
          {fromOptions.length ? (
            <select
              id="qc-from"
              className="border rounded px-2 py-2 bg-background w-full"
              aria-label="From address"
              title="From address"
              value={from || fromOptions[0]}
              onChange={(e)=> setFrom(e.target.value)}
            >
              {fromOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input id="qc-from" placeholder="you@domain.com" value={from} onChange={e=>setFrom(e.target.value)} />
          )}
          {verifiedDomains.length === 0 && (
            <div className="text-[11px] text-amber-600">No verified domain. Add one to unlock proper From options.</div>
          )}
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Template</Label>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-2 bg-background flex-1"
              aria-label="Choose template"
              title="Choose template"
              onChange={(e)=>{
                const url = new URL('/email/compose', window.location.origin)
                const id = e.target.value
                if (id) {
                  // Pass prefill marker; content will be fetched in compose page
                  url.searchParams.set('prefill', '1')
                }
                window.location.href = url.toString()
              }}
            >
              <option value="">Select…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.metadata?.name || t.title}</option>
              ))}
            </select>
            <Link href="/email/templates" className="text-xs underline">Manage</Link>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Link href="/email/compose" className="inline-flex">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white">Compose</Button>
        </Link>
      </div>
    </div>
  )
}
