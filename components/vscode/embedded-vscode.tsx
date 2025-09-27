"use client"
import { useEffect, useState, useRef } from 'react'

interface Props {
  url: string
}

type Status = 'idle' | 'checking' | 'up' | 'down'

export default function EmbeddedVSCode({ url }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [attempt, setAttempt] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    let aborted = false

    const check = async (initial = false) => {
      // If we're already up, do a silent ping and only downgrade on hard failure
      if (status === 'up' && !initial) {
        try {
          await fetch(url, { method: 'HEAD', mode: 'no-cors' })
        } catch (e) {
          if (!aborted) setStatus('down')
        }
        return
      }

      if (status !== 'up') setStatus(prev => (prev === 'idle' ? 'checking' : prev))
      try {
        await fetch(url, { method: 'GET', mode: 'no-cors' })
        if (!aborted) {
          // Mark up only once; never revert to 'checking' unless failure
          setStatus('up')
        }
      } catch (e) {
        if (!aborted) setStatus('down')
      }
    }

    // initial check
    check(true)
    const interval = setInterval(() => check(false), 8000) // slower poll to reduce load
    return () => { aborted = true; clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, attempt])

  const retry = () => {
    setAttempt(a => a + 1)
  }

  // No DOM injection; embed VS Code as-is

  return (
    <div className="relative w-full h-full">
      {status !== 'up' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur">
          <div className="flex flex-col items-center gap-2 text-center max-w-sm">
            <div className="h-10 w-10 rounded-full border-2 border-dashed animate-spin border-muted" />
            <h3 className="text-sm font-medium">
              {status === 'checking' && 'Starting VS Code Web...'}
              {status === 'idle' && 'Initializing...'}
              {status === 'down' && 'VS Code Web not reachable'}
            </h3>
            {status === 'down' && (
              <p className="text-xs text-muted-foreground">
                Make sure code-server (port 3100) is running. Start it (docker or local) then click retry.
              </p>
            )}
            <p className="text-xs text-muted-foreground">URL: {url}</p>
          </div>
          {status === 'down' && (
            <button
              onClick={retry}
              className="px-3 py-1 rounded border text-xs hover:bg-accent transition-colors"
            >Retry</button>
          )}
          <button
            onClick={() => window.open(url, '_blank')}
            className="px-3 py-1 rounded border text-xs hover:bg-accent transition-colors"
          >Open in New Tab</button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        title="VS Code Web"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
