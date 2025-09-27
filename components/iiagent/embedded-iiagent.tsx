"use client";
import { useEffect, useState } from "react";

interface Props {
  url: string;
}

// Simple health check + iframe wrapper for ii-agent embed mode (?embed=1)
export default function EmbeddedIIAgent({ url }: Props) {
  const [status, setStatus] = useState<'idle'|'checking'|'up'|'down'>('idle');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let aborted = false;
    const check = async () => {
      setStatus(s => s === 'idle' ? 'checking' : s);
      try {
        // Attempt a lightweight fetch (will often be opaque if cross-origin but network success is fine)
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        if (!aborted) setStatus('up');
      } catch (e) {
        if (!aborted) setStatus('down');
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => { aborted = true; clearInterval(id); };
  }, [url, attempt]);

  return (
    <div className="relative w-full h-full">
      {status !== 'up' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur">
          <div className="flex flex-col items-center gap-2 text-center max-w-sm">
            <div className="h-10 w-10 rounded-full border-2 border-dashed animate-spin border-muted" />
            <h3 className="text-sm font-medium">
              {status === 'checking' && 'Connecting ii-agent environment...'}
              {status === 'idle' && 'Initializing ii-agent...'}
              {status === 'down' && 'ii-agent unreachable'}
            </h3>
            {status === 'down' && (
              <p className="text-xs text-muted-foreground">Verify the ii-agent frontend container is running and the URL is correct.</p>
            )}
            <p className="text-xs text-muted-foreground break-all">URL: {url}</p>
          </div>
          {status === 'down' && (
            <button onClick={() => setAttempt(a => a + 1)} className="px-3 py-1 rounded border text-xs hover:bg-accent transition-colors">Retry</button>
          )}
          <button onClick={() => window.open(url, '_blank')} className="px-3 py-1 rounded border text-xs hover:bg-accent transition-colors">Open Full</button>
        </div>
      )}
      <iframe
        src={`${url}${url.includes('?') ? '&' : '?'}embed=1`}
        className="w-full h-full border-0"
        title="II-Agent Sandbox"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
