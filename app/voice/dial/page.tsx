"use client"
export const dynamic = 'force-dynamic'
// Allow using the custom element <call-widget /> in this file
declare namespace JSX {
  interface IntrinsicElements {
    'call-widget': any
  }
}
import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { CallDispositionModal, DispositionData } from "@/components/voice/call-disposition-modal"

// Placeholder contact type and sample data; swap with CRM later
type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  position?: string
  status?: string
  value?: number
  source?: string
  createdAt?: string
  lastContact?: string
  notes?: string
}
type CRMList = { id: string; title: string }

// Simple E.164 normalizer with US default. Allows SIP URIs untouched.
function normalizeToE164(input: string, defaultCountry: string = 'US') {
  let s = (input || '').trim()
  if (!s) return s
  // If SIP URI or already has a scheme, leave as-is
  if (/^sip:/i.test(s) || /^[a-z]+:/i.test(s)) return s
  // Strip non-digits except leading +
  if (s.startsWith('+')) {
    const digits = '+' + s.slice(1).replace(/\D+/g, '')
    return digits
  }
  const digits = s.replace(/\D+/g, '')
  if (!digits) return s
  // Simple US normalization: 10 digits => +1..., 11 digits starting with 1 => +1...
  if (defaultCountry === 'US') {
    if (digits.length === 10) return '+1' + digits
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  }
  // Fallback: prepend +
  return '+' + digits
}

// Wrap the component that uses useSearchParams in a Suspense boundary
export default function DialPage() {
  return (
    <Suspense fallback={null}>
      <DialPageInner />
    </Suspense>
  )
}

function DialPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [lists, setLists] = useState<CRMList[]>([])
  const [selectedList, setSelectedList] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>("")
  const [fromNumber, setFromNumber] = useState<string>("")
  const [purchasedNumbers, setPurchasedNumbers] = useState<{ phoneNumber: string; friendlyName?: string }[]>([])
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [voicemails, setVoicemails] = useState<any[]>([])
  const [tokenError, setTokenError] = useState<string>("")
  const [callError, setCallError] = useState<string>("")
  // Number search parameters
  const [isoCountry, setIsoCountry] = useState<string>("US")
  const [areaCode, setAreaCode] = useState<string>("")
  const [containsDigits, setContainsDigits] = useState<string>("")
  const [availableNumbers, setAvailableNumbers] = useState<{ phoneNumber: string; friendlyName?: string }[]>([])

  // Agent state
  const [agents, setAgents] = useState<any[]>([])
  const [newAgentName, setNewAgentName] = useState<string>("")
  const [newAgentPrompt, setNewAgentPrompt] = useState<string>("")
  const [newAgentNumber, setNewAgentNumber] = useState<string>("")
  const [newAgentVoice, setNewAgentVoice] = useState<string>("alloy")
  const [newAgentLanguage, setNewAgentLanguage] = useState<string>("en-US")
  const [newAgentTemperature, setNewAgentTemperature] = useState<number>(0.3)
    const [newAgentPrefab, setNewAgentPrefab] = useState<string | undefined>(undefined)
  const [enableRecording, setEnableRecording] = useState<boolean>(true)
  const [enableTranscripts, setEnableTranscripts] = useState<boolean>(true)
  const [isCreatingAgent, setIsCreatingAgent] = useState<boolean>(false)
  
  // Agent prefab customization state
  const [departments, setDepartments] = useState<Array<{name: string; description: string; number: string}>>([
    { name: "sales", description: "Product inquiries and pricing", number: "" },
    { name: "support", description: "Technical support", number: "" },
  ])
  const [questions, setQuestions] = useState<Array<{key_name: string; question_text: string; confirm: boolean}>>([
    { key_name: "full_name", question_text: "What is your full name?", confirm: false },
    { key_name: "email", question_text: "What is your email address?", confirm: true },
    { key_name: "reason", question_text: "Why are you calling?", confirm: false },
  ])
  const [faqs, setFaqs] = useState<Array<{question: string; answer: string}>>([
    { question: "What is CanvasAI?", answer: "CanvasAI is your AI-powered creative and operations platform." },
    { question: "How do I contact support?", answer: "You can say 'support' or ask to be transferred to a representative." },
  ])
  
  // Agent service status
  const [serviceStatus, setServiceStatus] = useState<{
    running: boolean;
    url?: string;
    agents?: number;
    error?: string;
  } | null>(null)

  // Disposition modal state
  const [showDispositionModal, setShowDispositionModal] = useState<boolean>(false)
  const [lastCallLogId, setLastCallLogId] = useState<string | null>(null)
  const [lastCallContact, setLastCallContact] = useState<{name?: string, phone?: string} | null>(null)
  
  // Call history state
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [historyFilter, setHistoryFilter] = useState<string>('all') // all, answered, voicemail, interested, etc.

  // Call Widget state
  const buttonId = 'dialerBtn-main'
  const [token, setToken] = useState<string>("")
  const [host, setHost] = useState<string>("")
  const widgetRef = useRef<any>(null)
  // Use an any-typed alias to the custom element to avoid TS JSX typing issues
  const CallWidget: any = 'call-widget'
  const widgetReady = Boolean(token && host)
  const dialerEnabled = widgetReady
  const [isDialerOpen, setIsDialerOpen] = useState(false)

  useEffect(() => {
    // Load the Call Widget via CDN to register the <call-widget> element
    const globalKey = "__sw_widget_loaded__"
    if (!(window as any)[globalKey]) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@signalwire/call-widget/dist/c2c-widget-full.umd.min.js"
      script.async = true
      document.head.appendChild(script)
      ;(window as any)[globalKey] = true
    }

    // Fetch a short-lived token from our API
    ;(async () => {
      try {
        const res = await fetch("/api/voice/sw/token")
        if (res.ok) {
          const data = await res.json()
          setToken(data.token || "")
          setHost(data.host || "")
          if (!data.host) {
            setTokenError("SignalWire host missing: set SIGNALWIRE_SPACE_URL on the server.")
          } else {
            setTokenError("")
          }
        } else {
          const err = await res.json().catch(()=>({ error: `status ${res.status}` }))
          setTokenError(err?.error || `Token error status ${res.status}`)
        }
      } catch (e) {
        console.error("Failed to fetch SignalWire token", e)
        setTokenError("Token request failed—check env SIGNALWIRE_* values.")
      }
    })()

    // Attach detailed event listeners when the widget is present
    const id = setInterval(() => {
      const el = widgetRef.current as any
      if (el && (el as HTMLElement).addEventListener) {
        try {
          el.addEventListener("beforecall", (e: any) => console.log("[SW] beforecall"))
          el.addEventListener("beforeDial", (e: any) => {
            try {
              const d = e?.detail || {}
              console.log("[SW] beforeDial", d)
              let dest = ''
              if (typeof d.destination === 'string') dest = d.destination
              else if (typeof d.dialString === 'string') dest = d.dialString
              // Fallback to widget attribute if detail is missing destination
              if (!dest && (widgetRef.current as HTMLElement)?.getAttribute) {
                dest = (widgetRef.current as HTMLElement).getAttribute('destination') || ''
              }
              if (dest) {
                const norm = normalizeToE164(dest, 'US')
                const fromNorm = normalizeToE164(fromNumber || '')
                console.log('[SW] normalized destination', { from: dest, to: norm, callerId: fromNorm })
                if (typeof d.approve === 'function') {
                  // Pass overrides to ensure widget uses our values
                  d.approve({ destination: norm, from: fromNorm || undefined })
                  return
                }
                // As a fallback, update the element attribute so the widget picks it up
                if ((widgetRef.current as HTMLElement)?.setAttribute) {
                  (widgetRef.current as HTMLElement).setAttribute('destination', norm)
                }
              }
              if (typeof d.approve === 'function') d.approve()
            } catch (err) {
              console.warn('beforeDial handler error', err)
            }
          })
          el.addEventListener("call.joined", (e: any) => {
            setCallError("")
            console.log("[SW] call.joined", e?.detail)
            
            // Create call log when call starts (optional - won't block calling if API doesn't exist)
            const detail = e?.detail || {}
            const selectedContact = contacts.find(c => c.id === selectedContactId)
            const callNumber = detail.destination || detail.to || selectedContact?.phone || ''
            const fromNum = detail.from || fromNumber || ''
            
            if (callNumber && fromNum) {
              fetch('/api/voice/sw/call/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  leadId: selectedContact?.id || null,
                  contactNumber: callNumber,
                  fromNumber: fromNum,
                  direction: 'outbound',
                  status: 'in-progress',
                  providerCallSid: detail.callSid || null,
                })
              }).then(res => {
                if (!res.ok) {
                  console.warn('Call log API not available yet')
                  return null
                }
                return res.json()
              })
                .then(data => {
                  if (data?.callLog?.id) {
                    setLastCallLogId(data.callLog.id)
                    setLastCallContact({
                      name: selectedContact?.name,
                      phone: callNumber
                    })
                    console.log('[SW] Call log created:', data.callLog.id)
                  }
                })
                .catch(err => {
                  console.warn('Call logging not available (tables may not exist yet):', err)
                  // Don't break calling if logging fails
                })
            }
          })
          el.addEventListener("call.left", (e: any) => {
            console.log("[SW] call.left", e?.detail)
            
            // Show disposition modal after call ends (only if call log was created)
            if (lastCallLogId) {
              setShowDispositionModal(true)
            } else {
              console.log('[SW] No call log ID - skipping disposition modal')
            }
          })
          el.addEventListener("call.incoming", (e: any) => console.log("[SW] call.incoming", e?.detail))
          el.addEventListener("error", (e: any) => {
            try {
              const msg = (e?.detail?.message || e?.message || "Call failed").toString()
              console.error("[SW] widget error", e)
              if (/Authblock is invalid/i.test(msg) || /422\s*UnprocessableEntity/i.test(msg)) {
                setCallError("Your SignalWire Click-to-Call token isn't authorized for PSTN. Enable External Calling (PSTN) for this token and use a purchased/verified From number.")
              } else if (/Uri is invalid/i.test(msg)) {
                setCallError("The phone number looks invalid. Please use E.164 format like +16825551234.")
              } else {
                setCallError(msg)
              }
            } catch {
              setCallError("Call failed. Check console for details.")
            }
          })
          clearInterval(id)
        } catch (e) {
          // ignore and retry next tick
        }
      }
    }, 300)

    return () => { clearInterval(id) }
  }, [])

  // Handle deep-link click-to-dial: /voice/dial?to=+15551234567&from=+15557654321&open=true
  useEffect(() => {
    const to = searchParams?.get('to') || ''
    const from = searchParams?.get('from') || ''
    const open = (searchParams?.get('open') || '').toLowerCase() === 'true' || !!to
    if (!open) return
    const id = setInterval(() => {
      const el = widgetRef.current as HTMLElement | null
      if (!el || !token) return
      try {
        if (to) el.setAttribute('destination', normalizeToE164(to))
        const fromNorm = normalizeToE164(from || fromNumber || '')
        if (fromNorm) el.setAttribute('from', fromNorm)
        // Open the widget window
        const btn = document.getElementById(buttonId)
        if (btn) {
          btn.dispatchEvent(new Event('click', { bubbles: true }))
          clearInterval(id)
        }
      } catch {
        // ignore; retry
      }
    }, 250)
    const t = setTimeout(() => clearInterval(id), 5000)
    return () => { clearInterval(id); clearTimeout(t) }
  }, [searchParams, token, fromNumber, buttonId])

  // Keep widget `from` attribute in sync with selected purchased number
  useEffect(() => {
    const el = widgetRef.current as HTMLElement | null
    if (el && (el as any).setAttribute) {
      const fromNorm = normalizeToE164(fromNumber || '')
      if (fromNorm) {
        el.setAttribute('from', fromNorm)
      }
    }
  }, [fromNumber])

  // Fetch purchased SignalWire numbers
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/voice/sw/numbers', { cache: 'no-store' })
        const data = await res.json()
        if (data?.ok && Array.isArray(data.numbers)) {
          const nums = data.numbers.map((n: any) => ({ phoneNumber: n.phoneNumber, friendlyName: n.friendlyName }))
          setPurchasedNumbers(nums)
          if (!fromNumber && nums.length > 0) setFromNumber(nums[0].phoneNumber)
        }
      } catch {}
    })()
  }, [])

  async function searchNumbers() {
    const url = new URL('/api/voice/sw/numbers/search', window.location.origin)
    if (isoCountry) url.searchParams.set('country', isoCountry)
    if (areaCode) url.searchParams.set('areaCode', areaCode)
    if (containsDigits) url.searchParams.set('contains', containsDigits)
    const res = await fetch(url.toString(), { cache: 'no-store' })
    const json = await res.json()
    if (json?.ok) setAvailableNumbers(json.numbers || [])
  }

  async function purchaseNumber(num: string) {
    const res = await fetch('/api/voice/sw/numbers/purchase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: num })
    })
    const json = await res.json()
    if (json?.ok) {
      // Refresh purchased numbers
      const ref = await fetch('/api/voice/sw/numbers', { cache: 'no-store' })
      const d = await ref.json()
      if (d?.ok) {
        const nums = d.numbers.map((n: any) => ({ phoneNumber: n.phoneNumber, friendlyName: n.friendlyName }))
        setPurchasedNumbers(nums)
        setFromNumber(num)
      }
    }
  }

  // Fetch agents
  async function fetchAgents() {
    try {
      const res = await fetch('/api/voice/sw/agents', { cache: 'no-store' })
      const json = await res.json()
      if (json?.ok) setAgents(json.agents || [])
    } catch (e) {
      console.error('Failed to fetch agents:', e)
    }
  }
  
  // Check agent service status
  async function checkServiceStatus() {
    try {
      const res = await fetch('/api/voice/sw/agents/service-status', { cache: 'no-store' })
      const json = await res.json()
      setServiceStatus(json)
    } catch (e) {
      console.error('Failed to check service status:', e)
      setServiceStatus({ running: false, error: 'Failed to check service status' })
    }
  }

  async function fetchRecentCalls() {
    try {
      const res = await fetch('/api/voice/sw/call/recent', { cache: 'no-store' })
      const json = await res.json()
      if (json?.ok) setRecentCalls(json.calls || [])
    } catch (e) {
      console.error('Failed to fetch recent calls:', e)
    }
  }

  async function fetchVoicemails() {
    try {
      const url = new URL('/api/voice/sw/voicemail', window.location.origin)
      url.searchParams.set('pageSize', '50')
      const res = await fetch(url.toString(), { cache: 'no-store' })
      const json = await res.json()
      if (json?.ok) setVoicemails(json.recordings || [])
    } catch (e) {
      console.error('Failed to fetch voicemails:', e)
    }
  }

  // Create agent
  async function createAgent() {
    if (!newAgentName.trim() || !newAgentPrompt.trim() || !newAgentNumber) {
      alert('Please fill in all fields')
      return
    }
    if (!newAgentPrefab || newAgentPrefab === 'none') {
      alert('Please select an agent type')
      return
    }
    setIsCreatingAgent(true)
    try {
      // Build settings object with prefab-specific configurations
      const settings: any = {
        prefab: newAgentPrefab,
        voice: newAgentVoice,
        language: newAgentLanguage,
        temperature: newAgentTemperature,
        recordCalls: enableRecording,
        transcripts: enableTranscripts,
        sttProvider: 'signalwire',
        ttsProvider: 'signalwire',
        bargeIn: true,
        enableMessageInject: true,
        enablePostPrompt: true,
        enablePostPromptUrl: false,
      }
      
      // Add prefab-specific configurations
      if (newAgentPrefab === 'receptionist') {
        // Validate departments have transfer numbers
        const validDepts = departments.filter(d => d.name.trim() && d.number.trim())
        if (validDepts.length === 0) {
          alert('Please add at least one department with a transfer number')
          setIsCreatingAgent(false)
          return
        }
        settings.departments = validDepts
      } else if (newAgentPrefab === 'info-gatherer') {
        // Validate questions
        const validQuestions = questions.filter(q => q.key_name.trim() && q.question_text.trim())
        if (validQuestions.length === 0) {
          alert('Please add at least one question')
          setIsCreatingAgent(false)
          return
        }
        settings.questions = validQuestions
      } else if (newAgentPrefab === 'faq-bot') {
        // Validate FAQs
        const validFaqs = faqs.filter(f => f.question.trim() && f.answer.trim())
        if (validFaqs.length === 0) {
          alert('Please add at least one FAQ')
          setIsCreatingAgent(false)
          return
        }
        settings.faqs = validFaqs
      }
      
      const res = await fetch('/api/voice/sw/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: newAgentName,
          prompt: newAgentPrompt,
          assigned_number: newAgentNumber,
          settings: settings,
        }),
      })
      const json = await res.json()
      if (json?.ok) {
        setNewAgentName('')
        setNewAgentPrompt('')
        setNewAgentNumber('')
        setNewAgentPrefab(undefined)
        setNewAgentVoice('alloy')
        setEnableRecording(true)
        setEnableTranscripts(true)
        fetchAgents()
      } else {
        alert(`Failed to create agent: ${json.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Failed to create agent:', e)
      alert('Failed to create agent')
    } finally {
      setIsCreatingAgent(false)
    }
  }

  // Toggle agent status
  async function toggleAgentStatus(agentId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/voice/sw/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json?.ok) {
        fetchAgents()
      } else {
        alert(`Failed to update agent: ${json.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Failed to update agent:', e)
      alert('Failed to update agent')
    }
  }

  // Delete agent
  async function deleteAgent(agentId: string) {
    if (!confirm('Are you sure you want to delete this agent?')) return
    try {
      const res = await fetch(`/api/voice/sw/agents/${agentId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json?.ok) {
        fetchAgents()
      } else {
        alert(`Failed to delete agent: ${json.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Failed to delete agent:', e)
      alert('Failed to delete agent')
    }
  }

  // Fetch CRM lead lists on mount
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/crm/lists', { cache: 'no-store' })
        const json = await res.json()
        const arr = json?.lists || []
        const mapped = arr.map((l: any) => ({ id: l.id, title: l.name || 'List' }))
        setLists(mapped)
      } catch {}
    })()
    // Fetch agents and check service status
    fetchAgents()
    checkServiceStatus()
    // Fetch recent calls and voicemails
    fetchRecentCalls()
    fetchVoicemails()
    
    // Poll service status every 30 seconds
    const statusInterval = setInterval(checkServiceStatus, 30000)
    return () => clearInterval(statusInterval)
  }, [])

  // Fetch CRM leads when list/search changes
  useEffect(() => {
    ;(async () => {
      try {
        const url = new URL('/api/crm/leads', window.location.origin)
        if (selectedList) url.searchParams.set('list_id', selectedList)
        if (search) url.searchParams.set('search', search)
        url.searchParams.set('limit', '50')
        const res = await fetch(url.toString(), { cache: 'no-store' })
        const json = await res.json()
        const rows = json?.leads || []
        const mapped: Contact[] = rows.map((r: any) => ({
          id: r.id,
          name: r.name || r.email,
          phone: r.phone || '',
          email: r.email || '',
        }))
        setContacts(mapped)
        // Default select the first contact if none selected
        if (!selectedContactId && mapped.length > 0) {
          setSelectedContactId(mapped[0].id)
        } else if (selectedContactId && mapped.every(c => c.id !== selectedContactId) && mapped.length > 0) {
          // If the previously selected contact is no longer in the list, select the first
          setSelectedContactId(mapped[0].id)
        }
      } catch {
        setContacts([])
      }
    })()
  }, [selectedList, search])

  // Fetch call history with dispositions
  const fetchCallHistory = async () => {
    try {
      const response = await fetch('/api/voice/history?limit=100')
      if (!response.ok) {
        console.warn('Call history API not available yet (tables may not exist)')
        return
      }
      const data = await response.json()
      setCallHistory(data.calls || [])
    } catch (error) {
      console.warn('Error fetching call history:', error)
      setCallHistory([]) // Set empty array on error
    }
  }

  // Load call history on mount (non-blocking)
  useEffect(() => {
    fetchCallHistory().catch(err => console.warn('Failed to load call history:', err))
  }, [])

  // Remove legacy PSTN callback function; calling is via widget "Open Dialer"

  // Handle call disposition submission
  const handleDispositionSubmit = async (disposition: DispositionData) => {
    if (!lastCallLogId) {
      console.warn('No call log ID available for disposition')
      return
    }
    
    try {
      const response = await fetch('/api/voice/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callLogId: lastCallLogId,
          ...disposition
        })
      })
      
      if (!response.ok) {
        console.warn('Disposition API not available yet')
        // Close modal anyway
        setLastCallLogId(null)
        setLastCallContact(null)
        return
      }
      
      // Refresh recent calls, history, and contacts to show updated data
      fetchRecentCalls()
      fetchCallHistory().catch(err => console.warn('Failed to refresh history:', err))
      
      // Reset call state
      setLastCallLogId(null)
      setLastCallContact(null)
    } catch (error) {
      console.warn('Error saving disposition:', error)
      // Don't show error to user if disposition feature isn't set up yet
      setLastCallLogId(null)
      setLastCallContact(null)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] p-4">
      {/* Call Disposition Modal */}
      <CallDispositionModal
        isOpen={showDispositionModal}
        onClose={() => setShowDispositionModal(false)}
        onSubmit={handleDispositionSubmit}
        contactName={lastCallContact?.name}
        contactPhone={lastCallContact?.phone}
      />
      
      {/* Main content continues below... */}
      {/* Header with back arrow */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left column: Calling (top) + Chat (bottom) */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* Top: Calling + Numbers */}
          <div className="rounded-md border bg-muted p-3 flex flex-col gap-4 shadow-sm overflow-auto flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400">Calling</h2>
              <Button
                id={buttonId}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400"
                onClick={() => {
                  setIsDialerOpen(prev => !prev)
                  if (widgetRef.current && (widgetRef.current as any).setAttribute) {
                    ;(widgetRef.current as any).setAttribute('destination', '')
                  }
                }}
                disabled={!dialerEnabled}
              >
                Open Dial Pad
              </Button>
            </div>
            {tokenError ? (
              <div className="text-xs text-red-600">{tokenError}</div>
            ) : (
              <div className="text-xs text-muted-foreground">Use the SignalWire dialer to call directly from your browser.</div>
            )}
            {callError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {callError}
              </div>
            )}
            {(tokenError || !dialerEnabled) && (
              <div className="text-xs text-muted-foreground">
                Need help configuring SignalWire? Review docs/VOICE_SIGNALWIRE_README.md for the exact env vars and webhook steps.
              </div>
            )}
            {/* The Call Widget custom element (registered by the package) */}
            {widgetReady && (
              <CallWidget
                ref={widgetRef as any}
                button-id={buttonId}
                token={token}
                host={host}
                support-audio="true"
                support-video="false"
                window-mode="audio+transcript"
                log-level="debug"
                debug-ws-traffic="true"
              />
            )}
            {!token && (
              <div className="text-xs text-amber-600">
                No widget token available. Set SIGNALWIRE_EMBED_TOKEN in your env or configure SIGNING_KEY for short-lived tokens.
              </div>
            )}
            {token && !host && (
              <div className="text-xs text-amber-600">
                Missing SignalWire host. Ensure SIGNALWIRE_SPACE_URL matches the Call Widget token.
              </div>
            )}

            {/* Numbers settings moved here */}
            <div className="border-t pt-3 -mb-1" />
            <div className="grid gap-3">
              <div className="text-sm font-medium">Your Numbers</div>
              {purchasedNumbers.length > 0 ? (
                <Select value={fromNumber} onValueChange={setFromNumber}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a number" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedNumbers.map((n) => (
                      <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                        {n.phoneNumber}{n.friendlyName ? ` — ${n.friendlyName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-1">
                  <Input
                    type="tel"
                    placeholder="Paste a verified SignalWire number"
                    value={fromNumber}
                    onChange={e => setFromNumber(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    No purchased numbers found yet. Paste a verified caller ID or purchase one below.
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Selected From Number is used for SMS threads. The widget handles calling directly.</p>
              {!fromNumber && (
                <div className="text-xs text-amber-600">
                  Select or purchase a verified caller ID before placing calls.
                </div>
              )}

              <div className="mt-2 text-sm font-medium">Search & Purchase</div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <Input placeholder="Country (US)" value={isoCountry} onChange={e=>setIsoCountry(e.target.value)} />
                <Input placeholder="Area Code" value={areaCode} onChange={e=>setAreaCode(e.target.value)} />
                <Input placeholder="Contains digits" value={containsDigits} onChange={e=>setContainsDigits(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={searchNumbers} className="bg-teal-600 hover:bg-teal-700 text-white">Search</Button>
              </div>
              <div className="max-h-40 overflow-auto space-y-2">
                {availableNumbers.map(a => (
                  <div key={a.phoneNumber} className="flex items-center justify-between border rounded p-2 bg-background">
                    <div className="text-sm">{a.phoneNumber} <span className="text-xs opacity-70">{a.friendlyName || ''}</span></div>
                    <Button size="sm" onClick={() => purchaseNumber(a.phoneNumber)} className="bg-teal-600 hover:bg-teal-700 text-white">Purchase</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: SMS Chat */}
          <div className="rounded-md border bg-card flex flex-col flex-1 min-h-0">
            <ChatPane
              contact={contacts.find(c => c.id === selectedContactId) || null}
              fromNumber={fromNumber}
            />
          </div>
        </div>

        {/* Middle: Contacts / Recent Calls / Voicemail */}
        <div className="col-span-5 rounded-md border bg-card p-3 overflow-hidden flex flex-col">
          <Tabs defaultValue="contacts" className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="calls">Recent Calls</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="voicemail">Voicemail</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400">Contacts</h2>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search" className="h-8 w-40" value={search} onChange={e=>setSearch(e.target.value)} />
                  <Select value={selectedList} onValueChange={setSelectedList}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="All Leads" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {contacts.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No contacts found.
                    <span className="ml-2">
                      <Link href="/crm" className="underline">Manage CRM leads</Link>
                    </span>
                  </div>
                )}
                {contacts.map(c => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedContactId(c.id)}
                    onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') setSelectedContactId(c.id) }}
                    className={`w-full text-left rounded-md border p-3 bg-background flex items-center justify-between hover:border-teal-500 cursor-pointer ${selectedContactId === c.id ? 'border-teal-600 ring-2 ring-teal-500/50 dark:border-teal-400 dark:ring-teal-400/50' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{c.phone || 'No phone on file'}</div>
                      {c.email && (
                        <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!dialerEnabled) return
                        const selPhone = c.phone || ''
                        const norm = normalizeToE164(selPhone)
                        if (widgetRef.current && (widgetRef.current as any).setAttribute && norm) {
                          ;(widgetRef.current as any).setAttribute('destination', norm)
                        }
                        if (widgetRef.current && (widgetRef.current as any).setAttribute && fromNumber) {
                          ;(widgetRef.current as any).setAttribute('from', normalizeToE164(fromNumber))
                        }
                        if (!isDialerOpen) {
                          document.getElementById(buttonId)?.dispatchEvent(new Event('click', { bubbles: true }))
                        }
                      }}
                      disabled={!dialerEnabled}
                    >Click to Dial</Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calls" className="flex-1 overflow-auto px-0 pb-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400">Recent Calls</h2>
                <Button size="sm" variant="outline" onClick={fetchRecentCalls}>Refresh</Button>
              </div>
              <div className="space-y-2">
                {recentCalls.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent calls.</div>
                ) : (
                  recentCalls.map((c, idx) => (
                    <div key={c.id || idx} className="flex items-center justify-between rounded border bg-background p-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.contact_number}</div>
                        <div className="text-xs text-muted-foreground truncate">From {c.from_number} • {c.status || '—'} • {c.started_at?.slice?.(0,19)?.replace('T',' ')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.recording_url ? (
                          <Button size="sm" variant="outline" asChild>
                            <a href={c.recording_url} target="_blank" rel="noreferrer">Recording</a>
                          </Button>
                        ) : null}
                        <Button size="sm" disabled={!dialerEnabled} onClick={() => {
                          if (!dialerEnabled) return
                          const norm = normalizeToE164(c.contact_number)
                          if (widgetRef.current && (widgetRef.current as any).setAttribute && norm) {
                            ;(widgetRef.current as any).setAttribute('destination', norm)
                          }
                          if (widgetRef.current && (widgetRef.current as any).setAttribute && fromNumber) {
                            ;(widgetRef.current as any).setAttribute('from', normalizeToE164(fromNumber))
                          }
                          if (!isDialerOpen) {
                            document.getElementById(buttonId)?.dispatchEvent(new Event('click', { bubbles: true }))
                          }
                        }}>Call Back</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-auto px-0 pb-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400">Call History</h2>
                <div className="flex items-center gap-2">
                  <Select value={historyFilter} onValueChange={setHistoryFilter}>
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Calls</SelectItem>
                      <SelectItem value="answered">Answered</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="callback_requested">Callback</SelectItem>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={fetchCallHistory}>Refresh</Button>
                </div>
              </div>
              <div className="space-y-2">
                {callHistory.filter(c => historyFilter === 'all' || c.disposition_type === historyFilter).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No call history found.</div>
                ) : (
                  callHistory
                    .filter(c => historyFilter === 'all' || c.disposition_type === historyFilter)
                    .map((c, idx) => (
                      <div key={c.id || idx} className="rounded border bg-background p-3 text-sm space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {c.lead_name || c.contact_number}
                              </span>
                              {c.disposition_type && (
                                <Badge variant="outline" className="text-xs">
                                  {c.disposition_type.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {c.contact_number}
                              {c.lead_company && ` • ${c.lead_company}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {c.started_at ? new Date(c.started_at).toLocaleString() : 'Date unknown'}
                              {c.duration_seconds && ` • ${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.recording_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={c.recording_url} target="_blank" rel="noreferrer">▶</a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" disabled={!dialerEnabled} onClick={() => {
                              if (!dialerEnabled || !c.contact_number) return
                              const norm = normalizeToE164(c.contact_number)
                              if (widgetRef.current && (widgetRef.current as any).setAttribute && norm) {
                                ;(widgetRef.current as any).setAttribute('destination', norm)
                              }
                              if (widgetRef.current && (widgetRef.current as any).setAttribute && fromNumber) {
                                ;(widgetRef.current as any).setAttribute('from', normalizeToE164(fromNumber))
                              }
                              // Select the contact if they're in the list
                              const matchingContact = contacts.find(ct => ct.phone === c.contact_number || ct.id === c.lead_id)
                              if (matchingContact) setSelectedContactId(matchingContact.id)
                              if (!isDialerOpen) {
                                document.getElementById(buttonId)?.dispatchEvent(new Event('click', { bubbles: true }))
                              }
                            }}>📞</Button>
                          </div>
                        </div>
                        {c.disposition_notes && (
                          <div className="text-xs bg-muted p-2 rounded">
                            <span className="font-medium">Notes: </span>
                            {c.disposition_notes}
                          </div>
                        )}
                        {c.next_action && c.next_action !== 'none' && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Next: </span>
                            {c.next_action.replace(/_/g, ' ')}
                            {c.follow_up_date && ` on ${new Date(c.follow_up_date).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="voicemail" className="flex-1 overflow-auto px-0 pb-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400">Voicemail</h2>
                <Button size="sm" variant="outline" onClick={fetchVoicemails}>Refresh</Button>
              </div>
              <div className="space-y-2">
                {voicemails.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No voicemails found.</div>
                ) : (
                  voicemails.map((r: any, idx: number) => {
                    const created = r.date_created || r.DateCreated || r.start_time || r.StartTime || ''
                    const duration = r.duration || r.Duration || ''
                    const link = r.media_url || r.MediaUrl || r.uri || r.Uri || ''
                    const href = link && typeof link === 'string' ? (link.startsWith('http') ? link : `https://${link.replace(/^\//,'')}`) : ''
                    const caller = r.from || r.From || r.calling_number || r.CallingNumber || ''
                    const contactName = contacts.find(c => c.phone && normalizeToE164(c.phone) === normalizeToE164(String(caller || '')))?.name || ''
                    return (
                      <div key={r.sid || r.Sid || idx} className="flex items-center justify-between rounded border bg-background p-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{contactName ? contactName : `Voicemail ${r.sid || r.Sid || ''}`}</div>
                          <div className="text-xs text-muted-foreground truncate">{created} • {duration ? `${duration}s` : '—'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {href ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={href} target="_blank" rel="noreferrer">Play</a>
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={async () => {
                            const sid = r.sid || r.Sid
                            if (!sid) return
                            const delUrl = new URL('/api/voice/sw/voicemail', window.location.origin)
                            delUrl.searchParams.set('sid', String(sid))
                            const res = await fetch(delUrl.toString(), { method: 'DELETE' })
                            if (res.ok) fetchVoicemails()
                          }}>Delete</Button>
                          {href ? (
                            <Button size="sm" variant="outline" onClick={async () => {
                              const res = await fetch('/api/voice/sw/voicemail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaUrl: href }) })
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `voicemail_${r.sid || r.Sid || idx}.mp3`
                              document.body.appendChild(a)
                              a.click()
                              a.remove()
                              URL.revokeObjectURL(url)
                            }}>Download</Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: AI Agents */}
        <div className="col-span-3 rounded-md border bg-card flex flex-col">
          <Tabs defaultValue="create" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-3">
              <TabsTrigger value="create">Create Agent</TabsTrigger>
              <TabsTrigger value="list">My Agents</TabsTrigger>
            </TabsList>

            {/* Create Agent Tab */}
            <TabsContent value="create" className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Agent Name</label>
                  <Input
                    placeholder="e.g. Customer Support Agent"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                  />
                </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Agent Type</label>
                    <Select value={newAgentPrefab} onValueChange={setNewAgentPrefab}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="receptionist">🏢 Receptionist - Route calls to departments</SelectItem>
                        <SelectItem value="info-gatherer">📝 Info Gatherer - Collect caller information</SelectItem>
                        <SelectItem value="faq-bot">❓ FAQ Bot - Answer common questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                {/* Prefab-Specific Configuration Sections */}
                {newAgentPrefab === 'receptionist' && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Departments</label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setDepartments([...departments, { name: "", description: "", number: "" }])}
                      >
                        Add Department
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {departments.map((dept, idx) => (
                        <div key={idx} className="border rounded-md p-3 bg-background space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Department name (e.g., sales)"
                                value={dept.name}
                                onChange={(e) => {
                                  const updated = [...departments]
                                  updated[idx].name = e.target.value
                                  setDepartments(updated)
                                }}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Description (e.g., Product inquiries and pricing)"
                                value={dept.description}
                                onChange={(e) => {
                                  const updated = [...departments]
                                  updated[idx].description = e.target.value
                                  setDepartments(updated)
                                }}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Transfer number (e.g., +15551234567)"
                                value={dept.number}
                                onChange={(e) => {
                                  const updated = [...departments]
                                  updated[idx].number = e.target.value
                                  setDepartments(updated)
                                }}
                                className="text-sm"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDepartments(departments.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {departments.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No departments configured. Add at least one.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {newAgentPrefab === 'info-gatherer' && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Questions</label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setQuestions([...questions, { key_name: "", question_text: "", confirm: false }])}
                      >
                        Add Question
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div key={idx} className="border rounded-md p-3 bg-background space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Field key (e.g., email)"
                                value={q.key_name}
                                onChange={(e) => {
                                  const updated = [...questions]
                                  updated[idx].key_name = e.target.value
                                  setQuestions(updated)
                                }}
                                className="text-sm"
                              />
                              <Textarea
                                placeholder="Question (e.g., What is your email address?)"
                                value={q.question_text}
                                onChange={(e) => {
                                  const updated = [...questions]
                                  updated[idx].question_text = e.target.value
                                  setQuestions(updated)
                                }}
                                rows={2}
                                className="text-sm resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={q.confirm}
                                  onCheckedChange={(checked) => {
                                    const updated = [...questions]
                                    updated[idx].confirm = checked
                                    setQuestions(updated)
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">Ask for confirmation</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {questions.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No questions configured. Add at least one.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {newAgentPrefab === 'faq-bot' && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">FAQs</label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                      >
                        Add FAQ
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {faqs.map((faq, idx) => (
                        <div key={idx} className="border rounded-md p-3 bg-background space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Question (e.g., What are your business hours?)"
                                value={faq.question}
                                onChange={(e) => {
                                  const updated = [...faqs]
                                  updated[idx].question = e.target.value
                                  setFaqs(updated)
                                }}
                                className="text-sm"
                              />
                              <Textarea
                                placeholder="Answer (e.g., We're open Monday-Friday 9am-5pm EST)"
                                value={faq.answer}
                                onChange={(e) => {
                                  const updated = [...faqs]
                                  updated[idx].answer = e.target.value
                                  setFaqs(updated)
                                }}
                                rows={3}
                                className="text-sm resize-none"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {faqs.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No FAQs configured. Add at least one.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Agent Prompt</label>
                  <Textarea
                    placeholder="Define your agent's personality, knowledge, and behavior. E.g. 'You are a friendly customer support agent who helps customers with product questions...'"
                    value={newAgentPrompt}
                    onChange={(e) => setNewAgentPrompt(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assign Phone Number</label>
                  {purchasedNumbers.length > 0 ? (
                    <Select value={newAgentNumber} onValueChange={setNewAgentNumber}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a number" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchasedNumbers.map((n) => (
                          <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                            {n.phoneNumber}{n.friendlyName ? ` — ${n.friendlyName}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No numbers available. Purchase a number in the left panel first.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Voice</label>
                    <Select value={newAgentVoice} onValueChange={setNewAgentVoice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* SignalWire TTS voices */}
                        <SelectItem value="alloy">Alloy (Default)</SelectItem>
                        <SelectItem value="verse">Verse</SelectItem>
                        <SelectItem value="amber">Amber</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-rows-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={enableRecording} onCheckedChange={setEnableRecording} />
                      <span className="text-sm">Record Calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={enableTranscripts} onCheckedChange={setEnableTranscripts} />
                      <span className="text-sm">Transcripts</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Language</label>
                    <Input value={newAgentLanguage} onChange={(e) => setNewAgentLanguage(e.target.value)} placeholder="e.g. en-US" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Temperature</label>
                    <Input type="number" min={0} max={1} step={0.1} value={newAgentTemperature}
                      onChange={(e) => setNewAgentTemperature(Number(e.target.value))} />
                  </div>
                </div>

                <Button
                  onClick={createAgent}
                  disabled={isCreatingAgent || !newAgentName.trim() || !newAgentPrompt.trim() || !newAgentNumber}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400"
                >
                  {isCreatingAgent ? 'Creating...' : 'Create Agent'}
                </Button>
              </div>
            </TabsContent>

            {/* Agent List Tab */}
            <TabsContent value="list" className="flex-1 overflow-auto px-3 pb-3">
              <div className="space-y-3 pt-2">
                {agents.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No agents created yet. Create your first agent in the Create Agent tab.
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="rounded-md border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{agent.agent_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{agent.assigned_number}</div>
                        </div>
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {agent.prompt}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch
                            checked={agent.status === 'active'}
                            onCheckedChange={() => toggleAgentStatus(agent.id, agent.status)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {agent.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAgent(agent.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Recent Calls tab moved to middle panel */}
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ChatPane({ contact, fromNumber }: { contact: { id: string; name: string; phone: string } | null; fromNumber: string }) {
  const sel = contact
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState("")
  const [smsError, setSmsError] = useState<string>("")
  const [smsHint, setSmsHint] = useState<string>("")
  const canChat = Boolean(fromNumber && sel?.phone)
  const endRef = useRef<HTMLDivElement | null>(null)

  async function refresh() {
    if (!canChat) return
    const fromNorm = normalizeToE164(fromNumber || '')
    const toNorm = normalizeToE164(sel!.phone || '')
    const res = await fetch(`/api/voice/sw/sms?from=${encodeURIComponent(fromNorm)}&to=${encodeURIComponent(toNorm)}&pageSize=25`, { cache: "no-store" })
    const data = await res.json()
    if (data.ok) {
      setMessages(data.data?.messages || data.data?.Messages || [])
      setSmsError("")
      setSmsHint("")
    } else {
      const errObj = data?.error
      const errText = typeof errObj === 'object' ? (errObj?.message || errObj?.error || JSON.stringify(errObj)) : (errObj || '')
      setSmsError(errText || `SMS list failed (${res.status})`)
      setSmsHint(data?.hint || data?.errorText || '')
    }
  }

  async function send() {
    if (!canChat || !text.trim()) return
    const fromNorm = normalizeToE164(fromNumber || '')
    const toNorm = normalizeToE164(sel!.phone || '')
    const res = await fetch(`/api/voice/sw/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromNorm, to: toNorm, text }),
    })
    const data = await res.json()
    if (data.ok) {
      setText("")
      refresh()
      setSmsError("")
      setSmsHint("")
    } else {
      const errObj = data?.error
      const errText = typeof errObj === 'object' ? (errObj?.message || errObj?.error || JSON.stringify(errObj)) : (errObj || '')
      setSmsError(errText || `SMS send failed (${res.status})`)
      setSmsHint(data?.hint || data?.errorText || '')
    }
  }

  useEffect(() => { refresh() }, [sel?.id, sel?.phone, fromNumber])

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // No contact selection logic here; handled by middle panel

  // Subscribe to inbound SMS stream and refresh when matching from/to pair
  useEffect(() => {
    if (!canChat) return
    const es = new EventSource('/api/voice/sw/sms/stream')
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'sms') {
          // Match thread (either inbound to our fromNumber from sel.phone)
          const matchInbound = (data.to === fromNumber && data.from === sel!.phone)
          const matchOutbound = (data.from === fromNumber && data.to === sel!.phone)
          if (matchInbound || matchOutbound) {
            // Fetch latest to include any provider message IDs/state
            refresh()
          }
        }
      } catch {}
    }
    es.onerror = () => {
      // auto-closed by browser; ignore
      try { es.close() } catch {}
    }
    return () => { try { es.close() } catch {} }
  }, [canChat, fromNumber, sel?.id, sel?.phone])

  return (
    <div className="flex h-full flex-col">
      {/* Header with contact info */}
      <div className="border-b px-3 py-2 flex items-center justify-between">
        {sel ? (
          <div className="min-w-0">
            <div className="font-medium truncate">{sel.name}</div>
            <div className="text-xs text-muted-foreground truncate">{sel.phone}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select a contact from the middle column to start messaging.</div>
        )}
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-2 mb-2 pr-3 pl-3 pt-3 flex flex-col">
        {messages.map((m, i) => {
          const body = m.body || m.Body || m.message || m.Message || ''
          const direction = m.direction || m.Direction || ''
          const isOut = direction.toLowerCase().includes('out')
          return (
            <div key={i} className={`max-w-[85%] rounded px-2 py-1 text-sm ${isOut ? 'self-end bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
              {body}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {/* Composer */}
      <div className="border-t p-3 flex gap-2">
        <Input placeholder={sel ? `Message ${sel.name}` : 'Select a contact to start chatting'} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} disabled={!canChat} />
        <Button size="sm" onClick={send} disabled={!canChat || !text.trim()} className="bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400">Send</Button>
        {(smsError || smsHint) && (
          <div className="flex flex-col ml-2 max-w-[220px]">
            {smsError && <div className="text-xs text-red-600 truncate" title={smsError}>{smsError}</div>}
            {smsHint && <div className="text-[10px] text-muted-foreground truncate" title={smsHint}>{smsHint}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
