"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Mail, Phone, Building2, MoreVertical, Edit, Trash2, DollarSign, Calendar, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Lead, LeadStatus } from "./lead-management"
import { Checkbox } from "@/components/ui/checkbox"
import { PhoneDialButton, PhoneNumberLink } from "@/components/voice/phone-dial-button"

type LeadCardProps = {
  lead: Lead
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: LeadStatus) => void
  compact?: boolean
  selected?: boolean
  onSelectChange?: (id: string, checked: boolean) => void
  docAssigned?: boolean
  onOpenDocument?: () => void
  onOpenDetailsAction?: () => void
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  qualified: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  proposal: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  negotiation: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  won: "bg-green-500/10 text-green-500 border-green-500/20",
  lost: "bg-red-500/10 text-red-500 border-red-500/20",
  appointment: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
}

function formatStatusLabel(s: string) {
  return s
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function LeadCard({
  lead,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
  selected = false,
  onSelectChange,
  docAssigned = false,
  onOpenDocument,
  onOpenDetailsAction,
}: LeadCardProps) {
  const router = useRouter()
  const headerMain = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectChange?.(lead.id, !!checked)}
          aria-label={selected ? "Deselect lead" : "Select lead"}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
        {!compact ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="font-semibold text-lg text-foreground truncate underline-offset-2 hover:underline text-left"
                onClick={(e) => { e.stopPropagation(); onOpenDetailsAction?.() }}
                title="Open lead details"
              >
                {lead.name}
              </button>
              {docAssigned && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-teal-700 hover:text-teal-800"
                  title="Open assigned document"
                  onClick={(e) => { e.stopPropagation(); onOpenDocument?.() }}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{lead.position}</p>
          </>
        ) : (
          <div className="grid w-full grid-cols-12 items-center gap-4 text-sm">
            {/* col-1 is consumed by checkbox */}
            <span className="col-span-2 font-semibold text-foreground truncate flex items-center gap-1">
              <button
                type="button"
                className="truncate text-left underline-offset-2 hover:underline"
                title="Open lead details"
                onClick={(e) => { e.stopPropagation(); onOpenDetailsAction?.() }}
              >
                {lead.name}
              </button>
              {docAssigned && (
                <button
                  type="button"
                  title="Open assigned document"
                  onClick={(e) => { e.stopPropagation(); onOpenDocument?.() }}
                  className="inline-flex items-center text-teal-700 hover:text-teal-800"
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
            </span>
            <span className="col-span-2 text-muted-foreground truncate flex items-center">
              <Mail className="h-4 w-4 mr-1 opacity-70" /> {lead.email}
            </span>
            <span className="col-span-2 text-muted-foreground flex items-center truncate">
              <PhoneNumberLink phone={lead.phone} leadId={lead.id} leadName={lead.name} />
            </span>
            <span className="col-span-2 text-muted-foreground truncate flex items-center">
              <Building2 className="h-4 w-4 mr-1 opacity-70" /> {lead.company}
            </span>
            <span className="col-span-2 flex items-center text-foreground font-semibold">
              <DollarSign className="h-4 w-4 mr-1" />
              {lead.value.toLocaleString()}
            </span>
            <span className="col-span-1 flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {lead.lastContact}
            </span>
            <span className="col-span-1 flex justify-end">
              <Badge className={statusColors[lead.status] || "bg-muted text-foreground border-border"}>
                {formatStatusLabel(lead.status)}
              </Badge>
            </span>
          </div>
        )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Quick actions: email and phone (mock links) */}
        <Button asChild variant="ghost" size="icon" aria-label="Email lead">
          <a href={`mailto:${lead.email}`} aria-label={`Email ${lead.name}`} title={`Email ${lead.name}`}>
            <Mail className="h-4 w-4" />
          </a>
        </Button>
        <PhoneDialButton
          phone={lead.phone}
          leadId={lead.id}
          leadName={lead.name}
          variant="ghost"
          size="icon"
          showLabel={false}
        />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(lead)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(lead.id)} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  const content = !compact ? (
    <CardContent className="space-y-3">
      <div className="flex items-center text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate">{lead.company}</span>
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate">{lead.email}</span>
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <PhoneNumberLink phone={lead.phone} leadId={lead.id} leadName={lead.name} className="text-sm" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center text-sm font-semibold text-foreground">
          <DollarSign className="h-4 w-4 mr-1" />
          {lead.value.toLocaleString()}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {lead.lastContact}
        </div>
      </div>
      {lead.notes && <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t">{lead.notes}</p>}
    </CardContent>
  ) : null

  return (
    <Card className="hover:shadow-md transition-shadow rounded-lg">
      <CardHeader className={compact ? "py-3" : "pb-3"}>{headerMain}</CardHeader>
      {content}
    </Card>
  )
}
