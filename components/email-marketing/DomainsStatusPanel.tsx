import Link from 'next/link'

type Domain = { name: string; status?: string; records?: any[] }

export default function DomainsStatusPanel({ domains }: { domains: Domain[] }) {
  const verified = domains.filter(d => String(d.status || '').toLowerCase() === 'verified')
  const pending = domains.filter(d => String(d.status || '').toLowerCase() !== 'verified')
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Domains</h3>
        <Link href="/email/domains" className="text-xs underline">Manage</Link>
      </div>
      {domains.length === 0 ? (
        <div className="text-xs text-muted-foreground">No domains connected.</div>
      ) : (
        <div className="space-y-1">
          {verified.slice(0,3).map(d => (
            <div key={d.name} className="text-xs flex items-center justify-between border rounded px-2 py-1 bg-muted/40">
              <span className="truncate max-w-[140px]" title={d.name}>{d.name}</span>
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">verified</span>
            </div>
          ))}
          {pending.slice(0,3).map(d => (
            <div key={d.name} className="text-xs flex items-center justify-between border rounded px-2 py-1 bg-muted/40">
              <span className="truncate max-w-[140px]" title={d.name}>{d.name}</span>
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">pending</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
