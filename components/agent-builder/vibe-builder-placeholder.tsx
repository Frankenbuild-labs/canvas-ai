"use client"

export default function VibeBuilderPlaceholder() {
  return (
    <div className="h-full w-full p-6 overflow-auto" aria-label="Vibe Builder Placeholder">
      <div className="space-y-4 max-w-xl text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Vibe Builder (Placeholder)</h2>
        <p>
          The external agent builder repository will be integrated here. This placeholder simulates the mount point
          for the interactive builder UI. Upcoming steps:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Clone/import external repo code under <code>external/vibe-agent-builder</code>.</li>
          <li>Create adapter layer to map its chat/events to existing application chat stream.</li>
          <li>Replace this placeholder with dynamic import of the builder root component.</li>
          <li>Add sandboxed iframe option if global styles conflict.</li>
        </ol>
        <p>
          You can proceed with UI wiring now; functional integration will follow once the external module is added.
        </p>
      </div>
    </div>
  )
}
