"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PanelLeftClose, User, Plus, Search, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProfileSettingsModal from "./profile-settings-modal"
import TaskModal, { type Task } from "@/components/tasks/task-modal"
import NoteModal, { type Note } from "@/components/tasks/note-modal"
import TaskCard from "@/components/tasks/task-card"

export default function LeftPanel({ togglePanel }: { togglePanel: () => void }) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [editingNote, setEditingNote] = useState<Note | undefined>()
  // Start with an empty task list; remove previous mock/sample tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | Task["type"]>("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all")

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || task.type === filterType
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "completed" && task.completed) ||
        (filterStatus === "pending" && !task.completed)
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      // Sort by: incomplete first, then by due date, then by creation date
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime()
      }
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

  const handleSaveTask = (taskData: Omit<Task, "id" | "createdAt">) => {
    if (editingTask) {
      // Update existing task
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? { ...taskData, id: editingTask.id, createdAt: editingTask.createdAt } : task,
        ),
      )
      setEditingTask(undefined)
    } else {
      // Create new task
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString() + Math.random(),
        createdAt: new Date(),
      }
      setTasks((prev) => [newTask, ...prev])
    }
  }

  const handleSaveNote = (noteData: Omit<Note, "id" | "createdAt">) => {
    if (editingNote) {
      // Update existing note
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingNote.id ? { ...noteData, id: editingNote.id, createdAt: editingNote.createdAt } : task,
        ),
      )
      setEditingNote(undefined)
    } else {
      // Create new note
      const newNote: Task = {
        ...noteData,
        id: Date.now().toString() + Math.random(),
        createdAt: new Date(),
      }
      setTasks((prev) => [newNote, ...prev])
    }
  }

  const handleEditTask = (task: Task) => {
    if (task.type === "note") {
      setEditingNote(task as Note)
      setIsNoteModalOpen(true)
    } else {
      setEditingTask(task)
      setIsTaskModalOpen(true)
    }
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)))
  }

  const openNewTaskModal = () => {
    setEditingTask(undefined)
    setIsTaskModalOpen(true)
  }

  const openNewNoteModal = () => {
    setEditingNote(undefined)
    setIsNoteModalOpen(true)
  }

  return (
    <>
      <aside className="w-72 flex flex-col bg-card border-r border-border relative h-full max-h-screen">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanel}
          className="absolute top-2 right-2 z-10 text-muted-foreground hover:bg-secondary hover:text-foreground h-8 w-8"
          title="Collapse panel"
        >
          <PanelLeftClose className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs defaultValue="tasks" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 bg-card border-b rounded-none h-14 flex-shrink-0">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
              >
                History
              </TabsTrigger>
              <TabsTrigger
                value="workspaces"
                className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
              >
                Workspaces
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
              >
                Tasks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="workspaces" className="flex-1 overflow-y-auto p-4 mt-0 min-h-0">
              <div className="text-center text-muted-foreground p-8 text-sm">
                <p>Your workspaces will be displayed here.</p>
              </div>
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-y-auto p-4 mt-0 min-h-0">
              <div className="text-center text-muted-foreground p-8 text-sm">
                <p>Your chat history will appear here.</p>
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="flex-1 flex flex-col p-4 mt-0 min-h-0 overflow-hidden">
              <div className="space-y-3 flex-shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={openNewTaskModal}
                    className="bg-accent-primary text-primary-foreground hover:bg-accent-secondary text-xs rounded-md"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                  <Button
                    onClick={openNewNoteModal}
                    variant="outline"
                    className="text-xs border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-primary-foreground bg-transparent rounded-md"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Add Note
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={filterType} onValueChange={(value: "all" | Task["type"]) => setFilterType(value)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="appointment">Appointments</SelectItem>
                      <SelectItem value="reminder">Reminders</SelectItem>
                      <SelectItem value="note">Notes</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterStatus}
                    onValueChange={(value: "all" | "completed" | "pending") => setFilterStatus(value)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 min-h-0">
                <div className="space-y-2 pb-4">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">
                        {searchTerm || filterType !== "all" || filterStatus !== "all"
                          ? "No tasks found"
                          : "No tasks yet. Create your first task!"}
                      </p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex-shrink-0 p-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-auto py-2 px-3"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">john.doe@example.com</p>
            </div>
          </Button>
        </div>
      </aside>

      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setEditingTask(undefined)
        }}
        onSave={handleSaveTask}
        task={editingTask}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false)
          setEditingNote(undefined)
        }}
        onSave={handleSaveNote}
        note={editingNote}
      />
    </>
  )
}
