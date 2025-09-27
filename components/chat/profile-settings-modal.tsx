"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { User, CreditCard } from "lucide-react"

type ProfileSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle>Profile & Settings</DialogTitle>
          <DialogDescription>Manage your personal information and subscription plan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <User className="w-4 h-4 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john.doe@example.com" />
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                Save Changes
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <CreditCard className="w-4 h-4 mr-2" />
                Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-md bg-secondary">
                <div>
                  <p className="font-semibold text-sm">Pro Plan</p>
                  <p className="text-muted-foreground text-sm">$20.00 / month</p>
                </div>
                <Button variant="secondary" size="sm">
                  Manage
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Your subscription will renew on August 30, 2025.</p>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
