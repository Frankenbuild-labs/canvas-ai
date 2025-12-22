"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import LeadManagement from "@/components/crm/lead-management"

export default function CRMPage() {
  return (
  <div className="h-screen overflow-hidden flex flex-col bg-background crm-surface">
    <header className="px-4 py-3 border-b bg-card sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/" prefetch>
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Back to Chat</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">CRM - Lead Management</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden p-4">
        <LeadManagement />
      </main>
    </div>
  )
}
