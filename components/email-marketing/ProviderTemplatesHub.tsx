"use client"

import Script from "next/script"
import { useEffect, useMemo, useState } from "react"

type Provider = "unlayer" | "stripo" | "none"

export default function ProviderTemplatesHub() {
  const provider: Provider = (process.env.NEXT_PUBLIC_EMAIL_TEMPLATES_PROVIDER as Provider) || "none"
  const unlayerProjectId = process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID
  const stripoClientId = process.env.NEXT_PUBLIC_STRIPO_CLIENT_ID

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const content = useMemo(() => {
    if (!mounted) return null
    switch (provider) {
      case "unlayer":
        if (!unlayerProjectId) return MissingEnv("NEXT_PUBLIC_UNLAYER_PROJECT_ID")
        return <UnlayerGallery projectId={unlayerProjectId} />
      case "stripo":
        if (!stripoClientId) return MissingEnv("NEXT_PUBLIC_STRIPO_CLIENT_ID")
        return <StripoConnectNotice />
      default:
        return <NoProviderConfigured />
    }
  }, [mounted, provider, unlayerProjectId, stripoClientId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Template Catalog</h2>
        <p className="text-muted-foreground">Browse pre‑built templates from your selected provider.</p>
      </div>
      {content}
    </div>
  )
}

function MissingEnv(name: string) {
  return (
    <div className="bg-yellow-50 text-yellow-900 border border-yellow-200 rounded p-4">
      Missing required environment variable <code className="font-mono">{name}</code> for the selected provider.
    </div>
  )
}

function NoProviderConfigured() {
  return (
    <div className="bg-muted border border-border rounded p-4">
      <p className="text-sm text-muted-foreground">
        No template provider configured. Set <code className="font-mono">NEXT_PUBLIC_EMAIL_TEMPLATES_PROVIDER</code> to
        <code className="mx-1">unlayer</code> or <code className="mx-1">stripo</code> in your environment.
      </p>
      <div className="mt-3 text-xs text-muted-foreground">
        For Unlayer, also set <code className="font-mono">NEXT_PUBLIC_UNLAYER_PROJECT_ID</code>.
        For Stripo, set <code className="font-mono">NEXT_PUBLIC_STRIPO_CLIENT_ID</code>.
      </div>
    </div>
  )
}

function UnlayerGallery({ projectId }: { projectId: string }) {
  // Renders Unlayer Design Gallery via embed
  return (
    <div className="w-full">
      <Script src="https://editor.unlayer.com/embed.js" strategy="afterInteractive" />
      <div
        className="w-full overflow-hidden rounded-lg border border-border bg-card min-h-[700px]"
        id="unlayer-embed"
        data-project-id={projectId}
        data-display-mode="web"
        data-source="templates"
      />
    </div>
  )
}

function StripoConnectNotice() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <p className="text-sm text-muted-foreground">
        Stripo templates are available via their embedded editor. For security, you need to provide API credentials and
        implement server‑side token exchange. Once configured, this page will show the Stripo gallery.
      </p>
      <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-foreground">
        <li>Create a Stripo account and obtain Client ID and Secret.</li>
        <li>Add <code className="font-mono">NEXT_PUBLIC_EMAIL_TEMPLATES_PROVIDER=stripo</code> and
          <code className="font-mono ml-1">NEXT_PUBLIC_STRIPO_CLIENT_ID</code> to your env, and securely expose an API route for token exchange.</li>
        <li>We can wire the embed to list templates once credentials are available.</li>
      </ol>
    </div>
  )
}
