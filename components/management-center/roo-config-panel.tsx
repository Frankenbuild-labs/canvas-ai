import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

/**
 * RooConfigPanel (placeholder)
 * - Future: persist via API route, integrate with sidecar configuration
 * - Current: local state only, shows intended fields
 */
export const RooConfigPanel: React.FC = () => {
  const [model, setModel] = useState('default')
  const [temperature, setTemperature] = useState('0.2')
  const [autoApprove, setAutoApprove] = useState(false)

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-semibold tracking-wide">Roo Agent Settings (Preview)</h3>
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="roo-model">Model</Label>
          <Input id="roo-model" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="roo-temp">Temperature</Label>
          <Input id="roo-temp" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="0.0 - 1.0" />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="roo-autoApprove"
            aria-labelledby="roo-autoApprove-label"
            type="checkbox"
            checked={autoApprove}
            onChange={e => setAutoApprove(e.target.checked)}
            className="h-4 w-4"
          />
          <Label id="roo-autoApprove-label" htmlFor="roo-autoApprove">Auto-approve follow-up asks</Label>
        </div>
      </div>
      <Separator />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button" onClick={() => { setModel('default'); setTemperature('0.2'); setAutoApprove(false) }}>Reset</Button>
        <Button type="button" disabled>Save (Coming Soon)</Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This panel is a scaffold only. In a future iteration these values will be persisted and applied to Roo task requests.
      </p>
    </Card>
  )
}

export default RooConfigPanel
