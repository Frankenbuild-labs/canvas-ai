'use client'

import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface PhoneDialButtonProps {
  phone: string
  leadId?: string
  leadName?: string
  variant?: "default" | "ghost" | "link" | "outline" | "secondary"
  size?: "sm" | "default" | "lg" | "icon"
  showLabel?: boolean
  className?: string
}

export function PhoneDialButton({ 
  phone, 
  leadId, 
  leadName, 
  variant = "ghost", 
  size = "sm",
  showLabel = true,
  className = ""
}: PhoneDialButtonProps) {
  const router = useRouter()

  const handleDial = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    
    if (!phone) return
    
    // Build deep link URL with lead context
    const params = new URLSearchParams({
      to: phone,
      open: 'true'
    })
    if (leadId) params.set('leadId', leadId)
    if (leadName) params.set('name', leadName)
    
    // Navigate to dialer
    router.push(`/voice/dial?${params.toString()}`)
  }

  if (!phone) return null

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDial}
      className={`gap-1.5 ${className}`}
      title={`Call ${phone}`}
    >
      <Phone className="h-4 w-4" />
      {showLabel && size !== "icon" && (
        <span className="hidden sm:inline">{phone}</span>
      )}
    </Button>
  )
}

// Inline phone display with click-to-dial
export function PhoneNumberLink({ 
  phone, 
  leadId, 
  leadName,
  className = ""
}: Omit<PhoneDialButtonProps, 'variant' | 'size' | 'showLabel'>) {
  const router = useRouter()

  const handleClick = () => {
    if (!phone) return
    
    const params = new URLSearchParams({
      to: phone,
      open: 'true'
    })
    if (leadId) params.set('leadId', leadId)
    if (leadName) params.set('name', leadName)
    
    router.push(`/voice/dial?${params.toString()}`)
  }

  if (!phone) return null

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-primary hover:underline cursor-pointer ${className}`}
      title="Click to call"
    >
      <Phone className="h-3 w-3" />
      <span>{phone}</span>
    </button>
  )
}
