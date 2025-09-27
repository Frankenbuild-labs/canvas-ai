"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, Link2, Paperclip, Edit, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { format, isToday, isTomorrow, isPast } from "date-fns"
import { cn } from "@/lib/utils"
import type { Task } from "./task-modal"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onToggleComplete: (taskId: string) => void
}

export default function TaskCard({ task, onEdit, onDelete, onToggleComplete }: TaskCardProps) {
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "text-teal-500 bg-teal-50 border-teal-200"
      case "medium":
        return "text-yellow-500 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-green-500 bg-green-50 border-green-200"
    }
  }

  const getTypeIcon = (type: Task["type"]) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-4 w-4" />
      case "reminder":
        return <Clock className="h-4 w-4" />
      case "note":
        return <Circle className="h-4 w-4" />
      default:
        return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return format(date, "MMM d")
  }

  const isOverdue = task.dueDate && isPast(task.dueDate) && !task.completed

  return (
    <Card
      className={cn(
        "hover:shadow-sm transition-all duration-200 bg-black/30 border-border/20 hover:bg-black/40",
        task.completed && "opacity-60",
        isOverdue && "border-teal-500/30 bg-teal-950/20",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={task.completed} onCheckedChange={() => onToggleComplete(task.id)} className="mt-1" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-medium text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(task)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <div className="flex items-center gap-1">
                  {getTypeIcon(task.type)}
                  {task.type}
                </div>
              </Badge>

              <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>

              {task.dueDate && (
                <Badge 
                  variant={isOverdue ? "outline" : "secondary"} 
                  className={cn(
                    "text-xs",
                    isOverdue && "border-teal-500 text-teal-600 bg-teal-50 dark:bg-teal-950/20 dark:text-teal-400"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {isOverdue && <AlertCircle className="h-3 w-3" />}
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                  </div>
                </Badge>
              )}

              {task.reminderDate && (
                <Badge variant="outline" className="text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(task.reminderDate)}
                  </div>
                </Badge>
              )}
            </div>

            {(task.urls.length > 0 || task.files.length > 0 || task.tags.length > 0) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {task.urls.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Link2 className="h-3 w-3 mr-1" />
                    {task.urls.length} URL{task.urls.length > 1 ? "s" : ""}
                  </Badge>
                )}

                {task.files.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {task.files.length} file{task.files.length > 1 ? "s" : ""}
                  </Badge>
                )}

                {task.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}

                {task.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{task.tags.length - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
