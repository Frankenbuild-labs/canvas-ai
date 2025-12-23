"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, LayoutGrid, List, Trash2, Check, Folder, X, Plus as PlusIcon, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import LeadCard from "@/components/crm/lead-card"
import AddLeadDialog from "@/components/crm/add-lead-dialog"
import SettingsDialog from "@/components/crm/settings-dialog"
import CrmAgentChat from "@/components/crm/agent-chat"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import BulkUploadDialog, { BulkLead } from "./bulk-upload-dialog"

// Default statuses that are built-in and non-removable
export type DefaultLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
  | "appointment"

// Allow custom statuses by using a string type for the stored value
export type LeadStatus = string

export type Lead = {
  id: string
  dbId?: string
  name: string
  email: string
  phone: string
  company: string
  position: string
  status: LeadStatus
  value: number
  source: string
  notes: string
  createdAt: string
  lastContact: string
  documentId?: string
  docAnswers?: Record<string, string>
}
import { useToast } from "@/components/ui/use-toast"

export type LeadList = {
  id: string
  name: string
  createdAt: string
  leadIds: string[]
}

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@techcorp.com",
    phone: "+1 (555) 123-4567",
    company: "TechCorp Industries",
    position: "VP of Operations",
    status: "qualified",
    value: 45000,
    source: "Website",
    notes: "Interested in enterprise plan. Follow up next week.",
    createdAt: "2024-01-15",
    lastContact: "2024-01-20",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@innovate.io",
    phone: "+1 (555) 234-5678",
    company: "Innovate Solutions",
    position: "CTO",
    status: "proposal",
    value: 78000,
    source: "Referral",
    notes: "Sent proposal on Jan 18. Waiting for feedback.",
    createdAt: "2024-01-10",
    lastContact: "2024-01-18",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@startup.com",
    phone: "+1 (555) 345-6789",
    company: "Startup Ventures",
    position: "Founder & CEO",
    status: "new",
    value: 25000,
    source: "LinkedIn",
    notes: "Initial contact made. Schedule demo call.",
    createdAt: "2024-01-22",
    lastContact: "2024-01-22",
  },
  {
    id: "4",
    name: "David Park",
    email: "d.park@enterprise.com",
    phone: "+1 (555) 456-7890",
    company: "Enterprise Global",
    position: "Director of IT",
    status: "negotiation",
    value: 120000,
    source: "Conference",
    notes: "Negotiating contract terms. Close to closing.",
    createdAt: "2024-01-05",
    lastContact: "2024-01-21",
  },
  {
    id: "5",
    name: "Lisa Thompson",
    email: "lisa.t@marketing.co",
    phone: "+1 (555) 567-8901",
    company: "Marketing Pro",
    position: "Marketing Director",
    status: "contacted",
    value: 32000,
    source: "Email Campaign",
    notes: "Had initial call. Sending more information.",
    createdAt: "2024-01-18",
    lastContact: "2024-01-19",
  },
  {
    id: "6",
    name: "James Wilson",
    email: "j.wilson@finance.com",
    phone: "+1 (555) 678-9012",
    company: "Finance Solutions",
    position: "CFO",
    status: "won",
    value: 95000,
    source: "Referral",
    notes: "Deal closed! Onboarding starts next week.",
    createdAt: "2024-01-01",
    lastContact: "2024-01-20",
  },
]

const DEFAULT_STATUSES: DefaultLeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "appointment",
]

const DEFAULT_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Email Campaign",
  "Conference",
  "Cold Call",
  "Other",
]

function capitalizeWords(s: string) {
  return s
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function LeadManagement() {
  const { toast } = useToast()
  // Server-backed leads; start empty and hydrate from API
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [view, setView] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("")
  const [serverLists, setServerLists] = useState<LeadList[]>([])
  const [isCreateListOpen, setIsCreateListOpen] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  // Details view state
  const [showDetails, setShowDetails] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string>("")

  // Surveys (server-backed)
  type SurveyQuestion = { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'phone' | 'select'; options?: string[] }
  type Survey = { id: string; name: string; description?: string; schema: { questions: SurveyQuestion[] } }
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [activeDocLeadId, setActiveDocLeadId] = useState<string | null>(null)

  async function refreshSurveys() {
    try {
      const res = await fetch('/api/crm/surveys', { cache: 'no-store' })
      const json = await res.json()
      if (Array.isArray(json.surveys)) setSurveys(json.surveys)
    } catch {}
  }
  useEffect(() => { void refreshSurveys() }, [])

  // Customizable statuses and sources from database
  const [customStatuses, setCustomStatuses] = useState<string[]>([])
  const [customSources, setCustomSources] = useState<string[]>([])

  // Load custom statuses and sources from database
  async function refreshCustomStatuses() {
    try {
      const res = await fetch('/api/crm/custom-statuses', { cache: 'no-store' })
      const json = await res.json()
      if (Array.isArray(json.statuses)) setCustomStatuses(json.statuses)
    } catch {}
  }

  async function refreshCustomSources() {
    try {
      const res = await fetch('/api/crm/custom-sources', { cache: 'no-store' })
      const json = await res.json()
      if (Array.isArray(json.sources)) setCustomSources(json.sources)
    } catch {}
  }

  useEffect(() => { 
    void refreshCustomStatuses()
    void refreshCustomSources()
  }, [])

  // Hydrate from server on mount
  async function hydrateLeads() {
    try {
      let res = await fetch(`/api/crm/leads?limit=500`, { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.warn('CRM leads API non-OK:', res.status, err)
        toast({ title: 'CRM error', description: 'Failed to load leads from database.' })
        setLeads([])
        return
      }
      let data = await res.json()
      let dbRows = (data.leads || []) as Array<any>
      if (Array.isArray(dbRows) && dbRows.length > 0) {
        const mappedDb: Lead[] = dbRows.map((r: any) => ({
          id: r.id,
          dbId: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone || "",
          company: r.company,
          position: r.position || "",
          status: r.status || "new",
          value: Number(r.value || 0),
          source: r.source || "Website",
          notes: r.notes || "",
          createdAt: r.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
          lastContact: r.last_contact || new Date().toISOString().split("T")[0],
          documentId: r.document_id || '',
          docAnswers: r.document_answers || undefined,
        }))
        setLeads(mappedDb)
        return
      }
    } catch (e) {
      console.warn('DB fetch for CRM leads failed:', e)
      toast({ title: 'CRM error', description: 'Failed to load leads. Please try again.' })
      setLeads([])
    }
  }

  useEffect(() => { void hydrateLeads() }, [])
  // Also try again shortly after mount in case the first attempt races with server warmup
  useEffect(() => {
    const t = setTimeout(() => { void hydrateLeads() }, 750)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const onFocus = () => { void hydrateLeads() }
    const onVis = () => { if (document.visibilityState === 'visible') void hydrateLeads() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Fetch server lists on mount and when needed
  const fetchServerLists = async () => {
    try {
      const res = await fetch("/api/crm/lists")
      if (!res.ok) throw new Error("Failed to fetch lists")
      const data = await res.json()
      const apiLists = (data.lists || []) as Array<{ id: string; name: string; created_at: string; leadIds?: string[] }>
      const mapped: LeadList[] = apiLists.map((l) => ({
        id: l.id,
        name: l.name,
        createdAt: l.created_at,
        leadIds: l.leadIds || [],
      }))
      setServerLists(mapped)
    } catch (e) {
      console.warn("Failed to fetch server lists:", e)
    }
  }

  useEffect(() => {
    void fetchServerLists()
  }, [])

  const allStatuses = useMemo(() => {
    const set = new Set<string>(DEFAULT_STATUSES)
    for (const s of customStatuses) set.add(s)
    return Array.from(set)
  }, [customStatuses])

  const allSources = useMemo(() => {
    const set = new Set<string>(DEFAULT_SOURCES)
    for (const s of customSources) set.add(s)
    return Array.from(set)
  }, [customSources])

  const statusFilters = useMemo(
    () => [
      { label: "All Leads", value: "all" },
      ...allStatuses.map((s) => ({ label: capitalizeWords(s), value: s })),
    ],
    [allStatuses],
  )

  // Optional list filter (server-backed only)
  const lists = useMemo(() => [...serverLists], [serverLists])

  const leadsAfterList = useMemo(() => {
    if (!activeListId) return leads
    const list = lists.find((l) => l.id === activeListId)
    if (!list) return leads
    const set = new Set(list.leadIds)
    return leads.filter((lead) => set.has(lead.id))
  }, [activeListId, lists, leads])

  const filteredLeads = leadsAfterList.filter((lead) => {
    const matchesFilter = filter === "all" || lead.status === filter
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      query === "" ||
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  })

  // Select-all computed state for the current filtered list
  const filteredIds = useMemo(() => filteredLeads.map((l) => l.id), [filteredLeads])
  const selectedCountInFiltered = useMemo(
    () => filteredIds.filter((id) => selectedIds.has(id)).length,
    [filteredIds, selectedIds],
  )
  const allSelected = filteredLeads.length > 0 && selectedCountInFiltered === filteredLeads.length
  const isIndeterminate = selectedCountInFiltered > 0 && !allSelected

  const handleToggleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        // Select all leads in the current filtered view
        filteredIds.forEach((id) => next.add(id))
      } else {
        // Clear selection only for the current filtered view
        filteredIds.forEach((id) => next.delete(id))
      }
      return next
    })
  }

  const handleAddLead = async (lead: Omit<Lead, "id" | "createdAt">) => {
    // Persist to server so other modules (Dialer) see the same leads
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone || undefined,
          company: lead.company,
          position: lead.position || undefined,
          status: lead.status || 'new',
          value: lead.value || 0,
          source: lead.source || 'Website',
          notes: lead.notes || '',
          lastContact: lead.lastContact || undefined,
          documentId: (lead as any).documentId || undefined,
          docAnswers: (lead as any).docAnswers || undefined,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const r = data.lead
      const newLead: Lead = {
        id: r.id,
        dbId: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone || "",
        company: r.company,
        position: r.position || "",
        status: r.status || 'new',
        value: Number(r.value || 0),
        source: r.source || 'Website',
        notes: r.notes || '',
        createdAt: r.created_at?.slice(0,10) || new Date().toISOString().split('T')[0],
        lastContact: r.last_contact || new Date().toISOString().split('T')[0],
        documentId: r.document_id || '',
        docAnswers: r.document_answers || undefined,
      }
      setLeads((prev) => [newLead, ...prev])
    } catch (e) {
      console.error('Failed to create server lead:', e)
      toast({
        title: 'Create lead failed',
        description: 'Unable to save lead to database. Please retry or contact support.',
        variant: 'destructive',
      })
    }
  }

  const handleEditLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)))
  }

  const handleDeleteLead = async (id: string) => {
    // Delete from server first
    try {
      const res = await fetch(`/api/crm/leads?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        console.error('Failed to delete lead from server:', res.status)
        toast({ title: 'Delete failed', description: 'Failed to delete lead from database', variant: 'destructive' })
        return
      }
    } catch (e) {
      console.error('Failed to delete lead:', e)
      toast({ title: 'Delete failed', description: 'Failed to delete lead', variant: 'destructive' })
      return
    }
    
    // Then update local state
    setLeads((prev) => prev.filter((lead) => lead.id !== id))
    // Remove from any lists
    setServerLists((prev) => prev.map((lst) => ({ ...lst, leadIds: lst.leadIds.filter((lid) => lid !== id) })))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast({ description: 'Lead deleted successfully' })
  }

  const handleBulkDelete = async () => {
    const toDelete = Array.from(selectedIds)
    if (toDelete.length === 0) return
    
    // Delete from server
    try {
      const deletePromises = toDelete.map(id => 
        fetch(`/api/crm/leads?id=${id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
    } catch (e) {
      console.error('Failed to delete some leads:', e)
      toast({ title: 'Delete failed', description: 'Some leads could not be deleted', variant: 'destructive' })
      return
    }
    
    // Then update local state
    const toDeleteSet = new Set(toDelete)
    setLeads((prev) => prev.filter((l) => !toDeleteSet.has(l.id)))
    setServerLists((prev) => prev.map((lst) => ({ ...lst, leadIds: lst.leadIds.filter((lid) => !toDeleteSet.has(lid)) })))
    setSelectedIds(new Set())
    toast({ description: `Deleted ${toDelete.length} leads successfully` })
  }

  const handleClearSelection = () => setSelectedIds(new Set())

  const handleAddCustomStatus = async (s: string) => {
    const value = s.trim()
    if (!value) return
    if (DEFAULT_STATUSES.includes(value as DefaultLeadStatus)) return
    if (customStatuses.includes(value)) return
    
    try {
      await fetch('/api/crm/custom-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value })
      })
      setCustomStatuses((prev) => [...prev, value])
    } catch (e) {
      console.error('Failed to add custom status:', e)
      toast({ title: 'Error', description: 'Failed to add custom status', variant: 'destructive' })
    }
  }

  const handleRemoveCustomStatus = async (s: string) => {
    if (DEFAULT_STATUSES.includes(s as DefaultLeadStatus)) return
    
    try {
      await fetch(`/api/crm/custom-statuses?status=${encodeURIComponent(s)}`, {
        method: 'DELETE'
      })
      setCustomStatuses((prev) => prev.filter((x) => x !== s))
    } catch (e) {
      console.error('Failed to remove custom status:', e)
      toast({ title: 'Error', description: 'Failed to remove custom status', variant: 'destructive' })
    }
  }

  const handleAddCustomSource = async (s: string) => {
    const value = s.trim()
    if (!value) return
    if (DEFAULT_SOURCES.includes(value)) return
    if (customSources.includes(value)) return
    
    try {
      await fetch('/api/crm/custom-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: value })
      })
      setCustomSources((prev) => [...prev, value])
    } catch (e) {
      console.error('Failed to add custom source:', e)
      toast({ title: 'Error', description: 'Failed to add custom source', variant: 'destructive' })
    }
  }

  const handleRemoveCustomSource = async (s: string) => {
    if (DEFAULT_SOURCES.includes(s)) return
    
    try {
      await fetch(`/api/crm/custom-sources?source=${encodeURIComponent(s)}`, {
        method: 'DELETE'
      })
      setCustomSources((prev) => prev.filter((x) => x !== s))
    } catch (e) {
      console.error('Failed to remove custom source:', e)
      toast({ title: 'Error', description: 'Failed to remove custom source', variant: 'destructive' })
    }
  }

  const totalValue = filteredLeads.reduce((sum, lead) => sum + lead.value, 0)

  // Open details helper
  const openDetailsAction = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    setSelectedLeadId(leadId)
    setEditingNotes(lead?.notes || '')
    setShowDetails(true)
  }
  const closeDetails = () => {
    setShowDetails(false)
    setSelectedLeadId(null)
  }

  // List helpers
  const createListFromSelection = async (name: string) => {
    const ids = Array.from(selectedIds)
    if (!name.trim() || ids.length === 0) return
    // Require that all selected leads have persisted IDs
    const selected = leads.filter((l) => selectedIds.has(l.id))
    const allHaveDb = selected.every((l) => l.dbId)
    if (!allHaveDb) {
      toast({
        title: 'Cannot create list',
        description: 'All selected leads must be saved to the database before creating a list.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch("/api/crm/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), leadIds: selected.map((l) => l.dbId) }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      await fetchServerLists()
      setActiveListId(data.list?.id || null)
      setIsCreateListOpen(false)
      setNewListName("")
      toast({ description: `List "${name}" created.` })
    } catch (e) {
      console.error('Failed to create list:', e)
      toast({
        title: 'Create list failed',
        description: 'Unable to save list to database. Please retry or contact support.',
        variant: 'destructive',
      })
    }
  }

  const deleteList = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/lists?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      await fetchServerLists()
      if (activeListId === id) setActiveListId(null)
      toast({ description: "List deleted." })
    } catch (e) {
      console.error('Failed to delete list:', e)
      toast({
        title: 'Delete list failed',
        description: 'Unable to delete list from database. Please retry or contact support.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Filter by Status</h3>
            <Button size="sm" onClick={() => setIsSettingsOpen(true)} className="h-7 px-2 bg-teal-600 hover:bg-teal-700 text-white">
              Manage
            </Button>
          </div>
          <ul className="space-y-0.5">
            {statusFilters.map((status) => (
              <li key={status.value}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm h-8",
                    filter === status.value && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => setFilter(status.value)}
                >
                  {status.label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {status.value === "all" ? leads.length : leads.filter((l) => l.status === status.value).length}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* CRM Agent chat occupies remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CrmAgentChat
            context={{
              filter,
              searchQuery,
              selectedIds: Array.from(selectedIds),
              // send a shallow copy of leads (only fields the tools may need)
              leads: leads.map((l) => ({
                id: l.id,
                name: l.name,
                email: l.email,
                phone: l.phone,
                company: l.company,
                position: l.position,
                status: l.status,
                value: l.value,
                source: l.source,
                notes: l.notes,
                createdAt: l.createdAt,
                lastContact: l.lastContact,
              })),
            }}
            statuses={allStatuses}
            defaultStatuses={DEFAULT_STATUSES}
            onReplaceLeadsAction={(next: Lead[]) => setLeads(next)}
            onClearSelectionAction={() => setSelectedIds(new Set())}
            onStatusesChangeAction={(next: string[]) => {
              // Separate custom statuses from defaults
              const nextSet = new Set(next)
              const keptCustom = Array.from(nextSet).filter((s) => !DEFAULT_STATUSES.includes(s as DefaultLeadStatus))
              setCustomStatuses(keptCustom as string[])
            }}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 flex-col overflow-hidden">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 max-w-3xl">
            <Checkbox
              checked={allSelected ? true : isIndeterminate ? "indeterminate" : false}
              onCheckedChange={handleToggleSelectAll}
              aria-label="Select all filtered leads"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter || "all"} onValueChange={(val) => setFilter(val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Leads" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={activeListId || "all"} 
                onValueChange={(val) => setActiveListId(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Lists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lists</SelectItem>
                  {lists.length > 0 && (
                    <>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.leadIds.length})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Pipeline summary moved to header */}
            <div className="hidden md:flex items-end gap-3 pr-2">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Pipeline Value</div>
                <div className="text-xl font-bold text-foreground">${totalValue.toLocaleString()}</div>
              </div>
              <Button variant="outline" size="icon" onClick={() => setIsTemplatesOpen(true)} title="Manage Surveys">
                <Folder className="w-5 h-5" />
              </Button>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Leads</div>
                <div className="text-base font-semibold text-foreground">{filteredLeads.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}>
              <List className="w-5 h-5" />
            </Button>
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}>
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button
              className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
              <Button variant="outline" onClick={() => setIsBulkOpen(true)}>Bulk Upload CSV</Button>
            </div>
          </div>
        </header>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4 bg-card border rounded-lg p-3">
            <div className="text-sm text-muted-foreground">
              Selected {selectedIds.size} {selectedIds.size === 1 ? "lead" : "leads"}
            </div>
            <div className="flex items-center gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {allStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {capitalizeWords(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" disabled={!bulkStatus} onClick={handleBulkApplyStatus}>
                <Check className="w-4 h-4 mr-1" /> Apply
              </Button>
              <Button onClick={() => setIsCreateListOpen(true)}>Save as List</Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
              <Button variant="ghost" onClick={handleClearSelection}>Clear</Button>
            </div>
          </div>
        )}

        {!showDetails && filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center overflow-auto">
            <p className="text-muted-foreground mb-4">No leads found</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Lead
            </Button>
          </div>
        ) : !showDetails ? (
          <div className="flex-1 min-h-0 overflow-auto pr-1">
            <div
              className={cn(
                "grid",
                view === "grid" ? "gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "gap-6 grid-cols-1",
              )}
            >
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteLead}
                  onStatusChange={(id: string, status: string) => {
                    const found = leads.find((l) => l.id === id)
                    if (found) {
                      handleEditLead({ ...found, status })
                    }
                  }}
                  selected={selectedIds.has(lead.id)}
                  onSelectChange={handleSelectChange}
                  compact={view === "list"}
                  docAssigned={!!lead.documentId}
                  onOpenDocument={() => setActiveDocLeadId(lead.id)}
                  onOpenDetailsAction={() => openDetailsAction(lead.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Details view
          <div className="flex-1 min-h-0 overflow-auto pr-1">
            {(() => {
              const lead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) : null
              if (!lead) return (
                <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No lead selected.</div>
              )
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={closeDetails} title="Back to list">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Button>
                    <h2 className="text-lg font-semibold truncate">{lead.name}</h2>
                  </div>
                  <div className="rounded-md border bg-card p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Company</div>
                        <Input
                          value={lead.company || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, company:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, company: e.currentTarget.value})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Position</div>
                        <Input
                          value={lead.position || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, position:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, position: e.currentTarget.value||null})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <Input
                          value={lead.email || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, email:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, email: e.currentTarget.value})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <Input
                          value={lead.phone || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, phone:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, phone: e.currentTarget.value||null})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <Select value={lead.status} onValueChange={async (v)=>{
                          setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, status:v}:l))
                          try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, status: v})}) }catch{}
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusFilters.filter(s=>s.value!=='all').map(s=> (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Value</div>
                        <Input
                          type="number"
                          value={lead.value || 0}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, value:Number(e.target.value)}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, value: Number(e.currentTarget.value||0)})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Source</div>
                        <Input
                          value={lead.source || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, source:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, source: e.currentTarget.value||null})})}catch{}}}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Last Contact</div>
                        <Input
                          type="date"
                          value={lead.lastContact || ''}
                          onChange={(e)=> setLeads(prev=>prev.map(l=>l.id===lead.id?{...l, lastContact:e.target.value}:l))}
                          onBlur={async (e)=>{ try{ await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: lead.id, lastContact: e.currentTarget.value||null})})}catch{}}}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Notes</div>
                      <div>
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer" title="Attach file to notes">
                          <input aria-label="Attach file to notes" type="file" className="hidden" onChange={async (e) => {
                            try {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const fd = new FormData()
                              fd.append('leadId', lead.id)
                              fd.append('file', file)
                              const res = await fetch('/api/crm/leads/attachments', { method: 'POST', body: fd })
                              const json = await res.json()
                              if (res.ok && json?.url) {
                                const line = `\n[${json.name || file.name}](${json.url})\n`
                                setEditingNotes((prev) => (prev || '') + line)
                              }
                            } catch {}
                          }} />
                          <Paperclip className="w-4 h-4" />
                        </label>
                      </div>
                    </div>
                    <textarea
                      className="w-full border rounded p-2 text-sm resize-none"
                      rows={8}
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/crm/leads', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: lead.id, notes: editingNotes })
                            })
                            if (res.ok) {
                              setLeads(prev => prev.map(x => x.id === lead.id ? { ...x, notes: editingNotes } : x))
                            }
                          } catch {}
                        }}
                      >Save Notes</Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          defaultStatuses={DEFAULT_STATUSES}
          customStatuses={customStatuses}
          onAddStatus={handleAddCustomStatus}
          onRemoveStatus={handleRemoveCustomStatus}
          defaultSources={DEFAULT_SOURCES}
          customSources={customSources}
          onAddSource={handleAddCustomSource}
          onRemoveSource={handleRemoveCustomSource}
        />

        <AddLeadDialog
          open={isAddDialogOpen}
          onOpenChangeAction={handleCloseDialog}
          templates={surveys.map(s => ({ id: s.id, name: s.name }))}
          onSaveAction={(lead: Omit<Lead, "id" | "createdAt">) => {
            if (editingLead) {
              // Persist documentId update to server, then update local state
              ;(async () => {
                try {
                  const res = await fetch('/api/crm/leads', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingLead.id, documentId: (lead as any).documentId ?? null })
                  })
                  if (!res.ok) throw new Error(`HTTP ${res.status}`)
                  const data = await res.json()
                  const r = data.lead
                  handleEditLead({
                    ...editingLead,
                    documentId: r.document_id || (lead as any).documentId || '',
                  } as Lead)
                } catch {
                  // Fallback to local update only
                  handleEditLead({ ...editingLead, documentId: (lead as any).documentId || '' } as Lead)
                }
              })()
            } else {
              handleAddLead(lead)
            }
            handleCloseDialog()
          }}
          editingLead={editingLead}
          statuses={allStatuses}
          sources={allSources}
        />

        {/* Surveys Manager Dialog */}
        <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Surveys</DialogTitle>
            </DialogHeader>
            <SurveyManager surveys={surveys} onChanged={refreshSurveys} />
          </DialogContent>
        </Dialog>

        {/* Lead Document Fill Dialog */}
        <Dialog open={!!activeDocLeadId} onOpenChange={(o) => { if (!o) setActiveDocLeadId(null) }}>
          <DialogContent className="max-w-2xl">
            {(() => {
              const lead = leads.find(l => l.id === activeDocLeadId)
              if (!lead) return null
              const tmpl = surveys.find(t => t.id === lead.documentId)
              if (!tmpl) return (
                <div className="py-4">No survey assigned. Edit the lead and choose a survey.</div>
              )
              const answers = lead.docAnswers || {}
              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>{tmpl.name} — {lead.name}</DialogTitle>
                  </DialogHeader>
                  <SurveyFill
                    survey={tmpl}
                    answers={answers}
                    onChange={(key, value) => {
                      setLeads(prev => prev.map(l => l.id === lead.id ? {
                        ...l,
                        docAnswers: { ...(l.docAnswers || {}), [key]: value }
                      } : l))
                    }}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActiveDocLeadId(null)}>Close</Button>
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={async () => {
                      // Persist answers to server if possible
                      try {
                        await fetch('/api/crm/leads', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: lead.id, docAnswers: lead.docAnswers || {} })
                        })
                      } catch {}
                      setActiveDocLeadId(null)
                    }}>Save</Button>
                  </DialogFooter>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>

        {/* Create List Dialog */}
        <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create List from Selection</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm">List Name</label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Q4 Prospects"
              />
              <p className="text-xs text-muted-foreground">{selectedIds.size} leads will be added to this list.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateListOpen(false)}>Cancel</Button>
              <Button onClick={() => createListFromSelection(newListName)} disabled={!newListName.trim()}>
                Create List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <BulkUploadDialog
          open={isBulkOpen}
          onOpenChangeAction={setIsBulkOpen}
          onImportAction={(items: BulkLead[], listName?: string) => {
            void (async () => {
              try {
                const res = await fetch("/api/crm/bulk-upload", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items, listName }),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                const createdApi = (data.created || []) as Array<any>
                const created: Lead[] = createdApi.map((r: any) => ({
                  id: r.id,
                  dbId: r.id,
                  name: r.name,
                  email: r.email,
                  phone: r.phone || "",
                  company: r.company,
                  position: r.position || "",
                  status: r.status || "new",
                  value: Number(r.value || 0),
                  source: r.source || "Website",
                  notes: r.notes || "",
                  createdAt: r.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
                  lastContact: r.last_contact || new Date().toISOString().split("T")[0],
                }))
                setLeads((prev) => [...created, ...prev])
                if (listName && data.list?.id) {
                  await fetchServerLists()
                  setActiveListId(data.list.id)
                }
                toast({ description: `Imported ${created.length} leads${listName ? ` and created list "${listName}"` : ""}.` })
              } catch (e) {
                console.error('Bulk upload failed:', e)
                toast({
                  title: 'Bulk upload failed',
                  description: 'Unable to import leads into the database. Please retry or contact support.',
                  variant: 'destructive',
                })
              }
            })()
          }}
        />
      </main>
    </div>
  )
}

// --- Inline components for Surveys management and filling ---

function SurveyManager({ surveys, onChanged }: { surveys: { id: string; name: string; description?: string; schema: { questions: any[] } }[]; onChanged: () => void }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<Array<{ key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'phone' | 'select'; options?: string }>>([
    { key: 'q1', label: 'How old are you?', type: 'number' },
    { key: 'q2', label: 'When were you born?', type: 'date' },
    { key: 'q3', label: 'Do you have another phone number?', type: 'phone' },
  ])

  const resetForm = () => {
    setName("")
    setDescription("")
    setQuestions([
      { key: 'q1', label: 'How old are you?', type: 'number' },
      { key: 'q2', label: 'When were you born?', type: 'date' },
      { key: 'q3', label: 'Do you have another phone number?', type: 'phone' },
    ])
  }

  const addQuestion = () => {
    const idx = questions.length + 1
    setQuestions(prev => [...prev, { key: `q${idx}`, label: `Question ${idx}`, type: 'text' }])
  }
  const removeQuestion = (key: string) => {
    setQuestions(prev => prev.filter(q => q.key !== key))
  }

  async function create() {
    const schema = {
      questions: questions.map(q => ({ key: q.key, label: q.label, type: q.type, ...(q.options ? { options: q.options.split(',').map(s => s.trim()).filter(Boolean) } : {}) }))
    }
    const res = await fetch('/api/crm/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, schema })
    })
    if (res.ok) {
      onChanged()
      setCreating(false)
      resetForm()
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Create and manage surveys. Assign a survey to a lead in the lead form, then click the paper icon on the lead to fill it during calls.</div>
      {!creating ? (
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Your Surveys</div>
          <Button size="sm" onClick={() => setCreating(true)} className="bg-teal-600 hover:bg-teal-700 text-white"><PlusIcon className="w-4 h-4 mr-1" /> New Survey</Button>
        </div>
      ) : (
        <div className="border rounded-md p-3 space-y-3 bg-background">
          <div className="flex items-center justify-between">
            <div className="font-medium">New Survey</div>
            <Button variant="ghost" size="icon" onClick={() => { setCreating(false); resetForm() }}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs mb-1">Name</div>
              <Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Intake Form" />
            </div>
            <div>
              <div className="text-xs mb-1">Description</div>
              <Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Questions</div>
            {questions.map((q) => (
              <div key={q.key} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-6" value={q.label} onChange={e=>setQuestions(prev=>prev.map(x=>x.key===q.key?{...x,label:e.target.value}:x))} />
                <Select value={q.type} onValueChange={(val: any)=>setQuestions(prev=>prev.map(x=>x.key===q.key?{...x,type:val}:x))}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Paragraph</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
                {q.type === 'select' ? (
                  <Input className="col-span-2" placeholder="Options (comma-separated)" value={q.options || ''} onChange={e=>setQuestions(prev=>prev.map(x=>x.key===q.key?{...x,options:e.target.value}:x))} />
                ) : (
                  <div className="col-span-2" />
                )}
                <Button variant="ghost" size="icon" onClick={()=>removeQuestion(q.key)} title="Remove"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <div>
              <Button variant="outline" size="sm" onClick={addQuestion}><PlusIcon className="w-4 h-4 mr-1" /> Add Question</Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreating(false); resetForm() }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" disabled={!name.trim() || questions.length === 0} onClick={create}>Create Survey</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-auto">
        {surveys.map(s => (
          <div key={s.id} className="border rounded-md p-2 bg-background">
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.schema?.questions?.length || 0} question(s)</div>
          </div>
        ))}
        {surveys.length === 0 && (
          <div className="text-sm text-muted-foreground">No surveys yet. Click New Survey to create one.</div>
        )}
      </div>
    </div>
  )
}

function SurveyFill({ survey, answers, onChange }: { survey: { schema: { questions: Array<{ key: string; label: string; type: string; options?: string[] }> } }, answers: Record<string, any>, onChange: (key: string, value: any) => void }) {
  const q = survey.schema?.questions || []
  return (
    <div className="space-y-3">
      {q.map((it) => {
        const val = answers?.[it.key] ?? ''
        if (it.type === 'textarea') {
          return (
            <div key={it.key} className="space-y-1">
              <div className="text-sm font-medium">{it.label}</div>
              <textarea className="w-full border rounded p-2 text-sm" rows={3} value={val} placeholder={it.label} aria-label={it.label} onChange={e=>onChange(it.key, e.target.value)} />
            </div>
          )
        }
        if (it.type === 'select' && Array.isArray(it.options)) {
          return (
            <div key={it.key} className="space-y-1">
              <div className="text-sm font-medium">{it.label}</div>
              <Select value={String(val)} onValueChange={(v)=>onChange(it.key, v)}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {it.options.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )
        }
        const inputType = it.type === 'number' ? 'number' : it.type === 'date' ? 'date' : 'text'
        return (
          <div key={it.key} className="space-y-1">
            <div className="text-sm font-medium">{it.label}</div>
            <Input type={inputType} value={val} onChange={e=>onChange(it.key, e.target.value)} />
          </div>
        )
      })}
    </div>
  )
}
