"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function TasksTab() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-foreground">Task Management</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="w-5 h-5 mr-3 text-accent-primary" />
            Connect your Google Calendar
          </CardTitle>
          <CardDescription>
            Integrate your Google Calendar to seamlessly sync your tasks and appointments. Manage your schedule directly
            within Metatron and never miss a deadline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start space-y-4">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>View your daily and weekly schedule.</li>
              <li>Create new tasks and events from your chat.</li>
              <li>Receive reminders and notifications.</li>
            </ul>
            <Button className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary">
              Connect Google Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
