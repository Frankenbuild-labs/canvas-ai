"use client"

import Script from "next/script"

export default function UnlayerTemplatesEmbed() {
  const projectId = process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID
  if (!projectId) {
    return (
      <div className="bg-yellow-50 text-yellow-900 border border-yellow-200 rounded p-4">
        Set <code className="font-mono">NEXT_PUBLIC_UNLAYER_PROJECT_ID</code> in your environment to show Unlayer templates.
      </div>
    )
  }

  return (
    <div className="w-full">
      <Script src="https://editor.unlayer.com/embed.js" strategy="afterInteractive" />
      <div
        id="unlayer-embed"
        className="w-full overflow-hidden rounded-lg border border-border bg-card min-h-[700px]"
        data-project-id={projectId}
        data-display-mode="web"
        data-source="templates"
      />
    </div>
  )
}
