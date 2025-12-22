'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CheckCircle2, Phone, PhoneOff, X, UserX, Clock } from "lucide-react"
import { format } from "date-fns"

interface CallDispositionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (disposition: DispositionData) => Promise<void>
  contactName?: string
  contactPhone?: string
}

export interface DispositionData {
  dispositionType: string
  notes?: string
  nextAction?: string
  followUpDate?: string
}

const dispositionTypes = [
  { value: 'answered', label: 'Answered', icon: Phone, color: 'text-green-600' },
  { value: 'voicemail', label: 'Voicemail Left', icon: Phone, color: 'text-blue-600' },
  { value: 'no_answer', label: 'No Answer', icon: PhoneOff, color: 'text-yellow-600' },
  { value: 'busy', label: 'Busy', icon: Clock, color: 'text-orange-600' },
  { value: 'wrong_number', label: 'Wrong Number', icon: X, color: 'text-red-600' },
  { value: 'interested', label: 'Interested', icon: CheckCircle2, color: 'text-green-700' },
  { value: 'not_interested', label: 'Not Interested', icon: X, color: 'text-gray-600' },
  { value: 'callback_requested', label: 'Callback Requested', icon: Phone, color: 'text-purple-600' },
  { value: 'do_not_call', label: 'Do Not Call', icon: UserX, color: 'text-red-700' },
]

const nextActions = [
  { value: 'none', label: 'No Follow-up' },
  { value: 'call_back', label: 'Schedule Callback' },
  { value: 'send_email', label: 'Send Follow-up Email' },
  { value: 'send_sms', label: 'Send Text Message' },
  { value: 'schedule_meeting', label: 'Schedule Meeting' },
  { value: 'mark_dead', label: 'Mark as Dead Lead' },
]

export function CallDispositionModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  contactName,
  contactPhone 
}: CallDispositionModalProps) {
  const [dispositionType, setDispositionType] = useState('')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('none')
  const [followUpDate, setFollowUpDate] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!dispositionType) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        dispositionType,
        notes: notes.trim() || undefined,
        nextAction: nextAction !== 'none' ? nextAction : undefined,
        followUpDate: followUpDate ? followUpDate.toISOString() : undefined,
      })
      
      // Reset form
      setDispositionType('')
      setNotes('')
      setNextAction('none')
      setFollowUpDate(undefined)
      onClose()
    } catch (error) {
      console.error('Error submitting disposition:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDisposition = dispositionTypes.find(d => d.value === dispositionType)
  const needsFollowUp = nextAction === 'call_back' || nextAction === 'schedule_meeting'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Call Disposition</DialogTitle>
          <DialogDescription>
            {contactName && <span className="font-medium">{contactName}</span>}
            {contactPhone && <span className="text-sm text-muted-foreground ml-2">{contactPhone}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Disposition Type */}
          <div className="space-y-2">
            <Label htmlFor="disposition">Call Outcome *</Label>
            <Select value={dispositionType} onValueChange={setDispositionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select call outcome..." />
              </SelectTrigger>
              <SelectContent>
                {dispositionTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Next Action */}
          <div className="space-y-2">
            <Label htmlFor="nextAction">Next Action</Label>
            <Select value={nextAction} onValueChange={setNextAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nextActions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up Date (shown when callback or meeting scheduled) */}
          {needsFollowUp && (
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {followUpDate ? format(followUpDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={setFollowUpDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!dispositionType || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Disposition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
