"use client";

import { useEffect, useState, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface RecipientSelectorProps {
  onChange: (emails: string[], mode: 'direct' | 'lists') => void
  disabled?: boolean
}

interface ListSummary { id: string; name: string; count: number }
interface Lead { id: string; name: string; email: string }

export function RecipientSelector({ onChange, disabled }: RecipientSelectorProps) {
  const [mode, setMode] = useState<'direct' | 'lists'>('direct')
  const [directInput, setDirectInput] = useState('')
  const [lists, setLists] = useState<ListSummary[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [leadsByList, setLeadsByList] = useState<Record<string, Lead[]>>({})
  const [loadingLists, setLoadingLists] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState<Record<string, boolean>>({})

  // Fetch lists once
  useEffect(() => {
    if (mode !== 'lists') return
    ;(async () => {
      setLoadingLists(true)
      try {
        const res = await fetch('/api/email/recipients', { cache: 'no-store' })
        const json = await res.json()
        if (Array.isArray(json.lists)) {
          setLists(json.lists.map((l: any) => ({ id: l.id, name: l.name, count: l.count || (Array.isArray(l.leadIds) ? l.leadIds.length : 0) })))
        }
      } catch (e) {
        setLists([])
      } finally {
        setLoadingLists(false)
      }
    })()
  }, [mode])

  // When list selection changes, fetch leads for each newly added list
  useEffect(() => {
    if (mode !== 'lists') return
    selectedListIds.forEach(id => {
      if (leadsByList[id] || loadingLeads[id]) return
      ;(async () => {
        setLoadingLeads(prev => ({ ...prev, [id]: true }))
        try {
          const res = await fetch(`/api/email/recipients?list_id=${encodeURIComponent(id)}`)
          const json = await res.json()
          if (json.list_id === id && Array.isArray(json.leads)) {
            // Filter valid email leads
            const ls = json.leads.filter((l: any) => l.email).map((l: any) => ({ id: l.id, name: l.name, email: l.email }))
            setLeadsByList(prev => ({ ...prev, [id]: ls }))
          }
        } catch {}
        finally {
          setLoadingLeads(prev => ({ ...prev, [id]: false }))
        }
      })()
    })
  }, [selectedListIds, mode, leadsByList, loadingLeads])

  // Derive emails
  const emails = useMemo(() => {
    if (mode === 'direct') {
      return directInput.split(/[,\n]/).map(e => e.trim()).filter(Boolean)
    }
    const all: string[] = []
    for (const id of selectedListIds) {
      const leads = leadsByList[id] || []
      for (const lead of leads) {
        if (lead.email) all.push(lead.email)
      }
    }
    return Array.from(new Set(all))
  }, [mode, directInput, selectedListIds, leadsByList])

  // Emit changes
  useEffect(() => {
    onChange(emails, mode)
  }, [emails, mode, onChange])

  return (
    <div className="space-y-3">
      <Label className="text-sm">Recipients</Label>
      <div className="flex gap-2 text-xs">
        <button type="button" className={`px-2 py-1 rounded border ${mode==='direct' ? 'bg-teal-600 text-white' : 'bg-card'}`} onClick={()=>setMode('direct')} disabled={disabled}>Direct Emails</button>
        <button type="button" className={`px-2 py-1 rounded border ${mode==='lists' ? 'bg-teal-600 text-white' : 'bg-card'}`} onClick={()=>setMode('lists')} disabled={disabled}>CRM Lists</button>
      </div>
      {mode === 'direct' && (
        <div className="space-y-2">
          <Input placeholder="user1@example.com, user2@example.com" value={directInput} onChange={e=>setDirectInput(e.target.value)} disabled={disabled} />
          <div className="text-xs text-muted-foreground">Separate multiple emails with commas or new lines.</div>
        </div>
      )}
      {mode === 'lists' && (
        <div className="space-y-2">
          {loadingLists && <div className="text-xs text-muted-foreground">Loading lists…</div>}
          {!loadingLists && lists.length === 0 && <div className="text-xs text-muted-foreground">No CRM lists found. Create lists in CRM first.</div>}
          <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2 bg-card">
            {lists.map(l => {
              const selected = selectedListIds.includes(l.id)
              const leadCount = leadsByList[l.id]?.length || l.count
              return (
                <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => {
                      setSelectedListIds(prev => e.target.checked ? [...prev, l.id] : prev.filter(x=>x!==l.id))
                    }}
                    disabled={disabled}
                  />
                  <span className="flex-1 truncate" title={l.name}>{l.name}</span>
                  <span className="text-xs text-muted-foreground">{leadCount} lead{leadCount===1?'':'s'}</span>
                  {loadingLeads[l.id] && <span className="text-[10px] text-muted-foreground">…</span>}
                </label>
              )
            })}
          </div>
          {selectedListIds.length>0 && (
            <div className="text-xs text-muted-foreground">Total unique recipient emails: {emails.length}</div>
          )}
        </div>
      )}
    </div>
  )
}
