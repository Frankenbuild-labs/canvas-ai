"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RecipientSelector } from "@/components/email-marketing/RecipientSelector"
import { useToast } from "@/components/ui/use-toast"
import InboxPreviewPanel from '@/components/email-marketing/InboxPreviewPanel'
import OutboxPreviewPanel from '@/components/email-marketing/OutboxPreviewPanel'
import DomainsStatusPanel from '@/components/email-marketing/DomainsStatusPanel'

export default function ComposeEmailPage() {
  const { toast } = useToast()
  const [from, setFrom] = useState("")
  const [domains, setDomains] = useState<Array<{ id: string; name: string; status: string }>>([])
  const [fromPreset, setFromPreset] = useState<string>("")
  const [to, setTo] = useState("")
  const [recipientMode, setRecipientMode] = useState<'direct' | 'lists'>('direct')
  const [recipientEmails, setRecipientEmails] = useState<string[]>([])
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("") // Unified body - will be sent as HTML if contains tags, else text
  const [isSending, setIsSending] = useState(false)
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; rawUrl: string }>>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; size: number; base64: string }>>([])

  async function onSend() {
    const toFinal = recipientMode === 'lists' ? recipientEmails : to.split(/[,\n]/).map(e=>e.trim()).filter(Boolean)
    if (!toFinal.length || !from.trim()) {
      toast({ description: "From and To are required." })
      return
    }
    setIsSending(true)
    try {
      // Detect if body contains HTML tags - if so send as html, else as text
      const isHtml = /<[a-z][\s\S]*>/i.test(body)
      const payload: any = { from, to: toFinal, subject, attachments: attachments.map(a=>({ filename: a.name, mime: a.type, contentBase64: a.base64 })) }
      if (isHtml) {
        payload.html = body
      } else {
        payload.text = body
      }
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json().catch(()=>({}))
      if (res.ok) {
        toast({ description: 'Email sent.' })
        setSubject("")
        setBody("")
        setAttachments([])
        if (recipientMode === 'direct') setTo("")
      } else {
        toast({ description: `Send failed: ${json?.error || res.status}` })
      }
    } catch (e: any) {
      toast({ description: `Send failed: ${e?.message || 'error'}` })
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/email/domains', { cache: 'no-store' })
        const json = await res.json()
        if (json?.ok && Array.isArray(json.domains)) {
          setDomains(json.domains)
          // If there is a verified domain, prefill a sensible from
          const verified = json.domains.find((d: any) => String(d.status).toLowerCase() === 'verified')
          if (verified && !from) setFrom(`noreply@${verified.name}`)
        }
      } catch {}
    })()
  }, [])

  // Load templates (catalog) and restore draft from localStorage
  useEffect(() => {
    ;(async () => {
      try {
        setIsLoadingTemplates(true)
        const res = await fetch('/api/email/templates/catalog')
        const json = await res.json()
        const cat = Array.isArray(json?.catalog)
          ? json.catalog.flatMap((g: any) => (Array.isArray(g.items) ? g.items : []))
          : []
        setTemplates(cat.map((x: any) => ({ id: x.id, name: x.name, rawUrl: x.rawUrl })))
      } catch {
        setTemplates([])
      } finally {
        setIsLoadingTemplates(false)
      }
      try {
        const draft = JSON.parse(localStorage.getItem('composeDraft') || 'null')
        if (draft) {
          setFrom(draft.from || '')
          setTo(draft.to || '')
          setSubject(draft.subject || '')
          setBody(draft.body || draft.html || draft.text || '')
          if (draft.recipientMode) setRecipientMode(draft.recipientMode)
          if (Array.isArray(draft.recipientEmails)) setRecipientEmails(draft.recipientEmails)
        }
      } catch {}
      // Handle prefill from TemplatesList "Use" action
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.get('prefill') === '1') {
          const preHtml = sessionStorage.getItem('compose_prefill_html')
          const preSubject = sessionStorage.getItem('compose_prefill_subject')
          if (preHtml) setBody(preHtml)
          if (preSubject) setSubject(preSubject)
          sessionStorage.removeItem('compose_prefill_html')
          sessionStorage.removeItem('compose_prefill_subject')
        }
      } catch {}
    })()
  }, [])

  // Auto-save draft to localStorage
  useEffect(() => {
    const id = setTimeout(() => {
      const payload = { from, to, subject, body, recipientMode, recipientEmails }
      try { localStorage.setItem('composeDraft', JSON.stringify(payload)) } catch {}
    }, 400)
    return () => clearTimeout(id)
  }, [from, to, subject, body, recipientMode, recipientEmails])

  async function applyTemplate(rawUrl: string) {
    try {
      const res = await fetch(`/api/email/templates/fetch?url=${encodeURIComponent(rawUrl)}&injectBase=1`)
      if (!res.ok) throw new Error(`Fetch template failed: ${res.status}`)
      const htmlText = await res.text()
      setBody(htmlText)
      toast({ description: 'Template applied.' })
    } catch (e: any) {
      toast({ description: e?.message || 'Failed to load template' })
    }
  }

  const verifiedDomains = useMemo(() => domains.filter(d => String(d.status).toLowerCase() === 'verified'), [domains])
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar with Inbox/Outbox/Domains */}
      <div className="w-80 border-r border-border bg-card overflow-y-auto flex-shrink-0">
        <div className="p-4 space-y-4">
          <InboxPreviewPanel limit={6} />
          <OutboxPreviewPanel limit={6} />
          <DomainsStatusPanel domains={domains} />
        </div>
      </div>

      {/* Main Compose Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-card">
          <div className="px-4 h-12 flex items-center">
            <div className="font-medium">Compose Email</div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Template picker */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Insert template</Label>
              <select
                className="border rounded px-2 py-2 bg-background"
                aria-label="Insert template"
                disabled={isLoadingTemplates || templates.length===0}
                onChange={(e)=> { if (e.target.value) { applyTemplate(e.target.value); e.target.value=''; }}}
              >
                <option value="">Select…</option>
                {templates.map(t=> (
                  <option key={t.id} value={t.rawUrl}>{t.name}</option>
                ))}
              </select>
              {isLoadingTemplates && <span className="text-xs text-muted-foreground">Loading templates…</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="from">From</Label>
                {fromOptions.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      className="border rounded px-2 py-2 flex-1 bg-background"
                      aria-label="From preset"
                      title="From preset"
                      value={fromPreset || (fromOptions.includes(from) ? from : '')}
                      onChange={(e) => { setFromPreset(e.target.value); if (e.target.value) setFrom(e.target.value) }}
                    >
                      <option value="">Custom…</option>
                      {fromOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <Input id="from" value={from} onChange={e=>{ setFromPreset(''); setFrom(e.target.value) }} placeholder="you@domain.com" />
                  </div>
                ) : (
                  <Input id="from" value={from} onChange={e=>setFrom(e.target.value)} placeholder="you@domain.com" />
                )}
                {domains.length > 0 && verifiedDomains.length === 0 && (
                  <div className="text-xs text-amber-600">Domain not verified yet. Use a verified From to maximize deliverability.</div>
                )}
                {domains.length === 0 && (
                  <div className="text-xs text-muted-foreground">No sending domains found. Add one in Email → Settings.</div>
                )}
              </div>
              
              <div className="space-y-2">
                <RecipientSelector disabled={isSending} onChange={(emails, mode)=>{ setRecipientMode(mode); setRecipientEmails(emails) }} />
                {recipientMode === 'direct' && (
                  <div className="space-y-1">
                    <Label htmlFor="to">Direct To</Label>
                    <Input id="to" value={to} onChange={e=>setTo(e.target.value)} placeholder="user1@example.com, user2@example.com" />
                    <div className="text-xs text-muted-foreground">Separate multiple emails with commas or new lines.</div>
                  </div>
                )}
                {recipientMode === 'lists' && (
                  <div className="text-xs text-muted-foreground">Using {recipientEmails.length} unique email(s) from selected CRM list(s).</div>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" />
            </div>
            
            {/* Unified Message Body */}
            <div className="space-y-1">
              <Label htmlFor="body">Message</Label>
              <Textarea 
                id="body" 
                rows={16} 
                value={body} 
                onChange={e=>setBody(e.target.value)} 
                placeholder="Compose your email here... (Supports plain text or HTML)" 
                className="font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground">
                Tip: Start with HTML tags like <code>&lt;p&gt;</code> to send as HTML, or type plain text for a simple message.
              </div>
            </div>
            
            {/* Attachments */}
            <div className="space-y-2">
              <Label htmlFor="attachments" className="cursor-pointer">Attachments</Label>
              <div className="flex items-center gap-2">
                <input
                  id="attachments"
                  aria-label="Add attachments"
                  title="Add attachments"
                  type="file"
                  multiple
                  onChange={async (e)=>{
                    const files = Array.from(e.target.files||[])
                    if (files.length === 0) return
                    const reads = await Promise.all(files.map(f=> new Promise<{name:string;type:string;size:number;base64:string}>((resolve,reject)=>{
                      const reader = new FileReader()
                      reader.onload = ()=>{
                        const result = String(reader.result||'')
                        const base64 = result.startsWith('data:') ? result.substring(result.indexOf(',')+1) : result
                        resolve({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, base64 })
                      }
                      reader.onerror = ()=> reject(reader.error)
                      reader.readAsDataURL(f)
                    })))
                    setAttachments(prev=>{
                      const existingMap = new Map(prev.map(p=>[p.name,p]))
                      for (const r of reads) existingMap.set(r.name, r)
                      return Array.from(existingMap.values())
                    })
                  }}
                />
              </div>
              {attachments.length>0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {attachments.map((a,idx)=> (
                    <li key={idx} className="flex items-center justify-between">
                      <span>{a.name} <span className="text-xs">({Math.round(a.size/1024)} KB)</span></span>
                      <button aria-label={`Remove attachment ${a.name}`} className="text-foreground hover:underline" onClick={()=> setAttachments(attachments.filter((_,i)=>i!==idx))}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {attachments.length>0 && (
                <div className="text-xs text-muted-foreground">
                  Total size: {Math.round(attachments.reduce((acc,a)=>acc+a.size,0)/1024)} KB
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={()=>{ try { localStorage.removeItem('composeDraft'); toast({ description: 'Draft cleared'}) } catch {} }}
              >
                Clear Draft
              </Button>
              <Button 
                disabled={isSending || !from.trim() || (recipientMode==='direct' ? !to.trim() : recipientEmails.length===0)} 
                onClick={onSend} 
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSending ? 'Sending…' : 'Send Email'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
