"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Domain = {
  id?: string
  name: string
  status: string
  records?: Array<{ type: string; name: string; value: string; ttl?: number; priority?: number }>
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/email/domains', { cache: 'no-store' })
      const json = await res.json()
      if (json?.ok) setDomains(json.domains || [])
      else setError(json?.error || 'Failed to load domains')
    } catch (e: any) {
      setError(e?.message || 'Failed to load domains')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function onCreateDomain() {
    if (!newDomain.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/email/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDomain.trim() })
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || 'Failed to create domain')
      setNewDomain("")
      refresh()
    } catch (e: any) {
      setError(e?.message || 'Failed to create domain')
    } finally {
      setCreating(false)
    }
  }

  const verifiedDomains = useMemo(() => domains.filter(d => String(d.status).toLowerCase()==='verified'), [domains])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Domains</h1>
        <p className="text-sm text-muted-foreground">Connect and verify sending domains for better deliverability. These will be available as From options when composing emails.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="domain-name">Add domain</Label>
          <Input id="domain-name" value={newDomain} onChange={e=>setNewDomain(e.target.value)} placeholder="example.com" />
        </div>
        <Button onClick={onCreateDomain} disabled={creating || !newDomain.trim()}>{creating ? 'Adding…' : 'Add domain'}</Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Connected domains</h2>
        <Button variant="outline" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
      </div>

      {domains.length === 0 ? (
        <div className="text-sm text-muted-foreground">No domains yet. Add one above to get started.</div>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <div key={d.name} className="border rounded-md p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs">
                    <span className={
                      'inline-flex items-center px-2 py-0.5 rounded ' +
                      (String(d.status).toLowerCase()==='verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800')
                    }>{d.status}</span>
                  </div>
                </div>
              </div>
              {Array.isArray(d.records) && d.records.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">DNS records</div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1 pr-2">Type</th>
                          <th className="py-1 pr-2">Name</th>
                          <th className="py-1 pr-2">Value</th>
                          <th className="py-1 pr-2">TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.records.map((r, idx) => (
                          <tr key={idx} className="align-top">
                            <td className="py-1 pr-2 font-mono">{r.type}</td>
                            <td className="py-1 pr-2 font-mono break-all">{r.name}</td>
                            <td className="py-1 pr-2 font-mono break-all">{r.value}</td>
                            <td className="py-1 pr-2 font-mono">{r.ttl ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {String(d.status).toLowerCase() !== 'verified' && (
                    <div className="text-xs text-muted-foreground mt-2">Add these DNS records at your DNS provider, then click Refresh to re-check verification status.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {verifiedDomains.length > 0 ? (
        <div className="text-sm text-muted-foreground">Verified domains: {verifiedDomains.map(v=>v.name).join(', ')}</div>
      ) : (
        <div className="text-sm text-amber-700">Tip: Verify your domain to enable better deliverability and From address selection.</div>
      )}
    </div>
  )
}
