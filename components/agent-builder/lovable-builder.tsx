"use client"

// Preview-only container. Listens to events from ChatArea and renders the generated UI fullscreen in an iframe.
import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

const API_PREFIX = "/api/lovable"

export default function LovableBuilder() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    const stored = sessionStorage.getItem("composio_user_id")
    if (stored) setUserId(stored)
    else {
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      sessionStorage.setItem("composio_user_id", id)
      setUserId(id)
    }
  }, [])

  // Helpers copied from the original repo to embed generated HTML safely
  const applyGeneratedFrontend = (rawHtml: string) => {
    if (!iframeRef.current) return
    try {
      let cleanFrontend = rawHtml
        .replace(/```html\s*/g, "")
        .replace(/```\s*$/g, "")
        .replace(/__LLM_API_KEY__/g, `""`)
        .replace(/__COMPOSIO_API_KEY__/g, `""`)
        .replace(/__USER_ID__/g, `"${userId}"`)
        .replace(
          /const\s+API_BASE_URL\s*=\s*window\.location\.origin\s*;/,
          'const API_BASE_URL = (document.referrer ? new URL(document.referrer).origin : "");'
        )

      const originShim = `<script>(function(){try{var ref=document.referrer;var origin = ref ? new URL(ref).origin : (window.top && window.top.location ? window.top.location.origin : ''); if(origin){ try{var base=document.createElement('base'); base.href = origin + '/'; if(document.head){document.head.prepend(base);} }catch(_){} window.API_BASE_URL = origin; var of = window.fetch; if(of){ window.fetch = function(input, init){ try{ var u = typeof input==='string'? input : (input && input.url)||''; if(u && u.startsWith('/')){ return of(origin + u, init); } }catch(e){} return of(input, init); }; } } }catch(e){}})();</script>`
      const storageShim = `<script>(function(){try{window.localStorage.getItem('__test');}catch(e){var m={};var s={getItem:(k)=>Object.prototype.hasOwnProperty.call(m,k)?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:(k)=>{delete m[k]},clear:()=>{m={}},key:(i)=>Object.keys(m)[i]||null,get length(){return Object.keys(m).length}};try{Object.defineProperty(window,'localStorage',{value:s,configurable:true});}catch(_){}try{Object.defineProperty(window,'sessionStorage',{value:{...s},configurable:true});}catch(_){} }})();</script>`
      const shims = originShim + storageShim
      const shimmedFrontend = /<head[^>]*>/i.test(cleanFrontend)
        ? cleanFrontend.replace(/<head[^>]*>/i, (m: string) => `${m}\n${shims}`)
        : `${shims}\n${cleanFrontend}`

      iframeRef.current.removeAttribute("src")
      ;(iframeRef.current as any).srcdoc = shimmedFrontend
      setHasGenerated(true)
    } catch (e) {
      console.error("Failed to apply generated frontend", e)
    }
  }

  const handleGenerate = async (idea: string) => {
    try {
      const res = await fetch(`${API_PREFIX}/generate-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIdea: idea }),
      })
      if (!res.ok) throw new Error(`Generate failed (${res.status})`)
      const code = await res.json()
      applyGeneratedFrontend(code.frontend || "")
      window.dispatchEvent(new CustomEvent("lovable:generated", { detail: code }))
    } catch (error: any) {
      window.dispatchEvent(
        new CustomEvent("lovable:error", { detail: { message: error?.message || String(error) } })
      )
    }
  }

  useEffect(() => {
    const onGenerate = (e: Event) => {
      const { idea } = (e as CustomEvent<{ idea: string }>).detail || ({} as any)
      if (!idea) return
      handleGenerate(idea)
    }
    const onReload = () => {
      if (!iframeRef.current) return
      const current = (iframeRef.current as any).srcdoc
      if (current) {
        // Force reapply srcdoc
        (iframeRef.current as any).srcdoc = current
      } else {
        iframeRef.current.src = `${API_PREFIX}/preview?type=default&t=${Date.now()}`
      }
    }
    window.addEventListener("lovable:generate", onGenerate as EventListener)
    window.addEventListener("lovable:reload", onReload as EventListener)
    return () => {
      window.removeEventListener("lovable:generate", onGenerate as EventListener)
      window.removeEventListener("lovable:reload", onReload as EventListener)
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="text-sm font-medium text-foreground">Live Preview</div>
        <button
          onClick={() => window.dispatchEvent(new Event("lovable:reload"))}
          className="px-3 py-1.5 bg-secondary hover:bg-accent rounded-md text-xs text-muted-foreground hover:text-foreground border"
          title="Reload preview"
        >
          <RefreshCw className="w-3 h-3 inline mr-2" /> Reload
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          className="h-full w-full bg-white"
          src={`${API_PREFIX}/preview?type=default`}
          title="AI Agent Preview"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
        {!hasGenerated && (
          <div className="sr-only">Waiting for first generation…</div>
        )}
      </div>
    </div>
  )
}
