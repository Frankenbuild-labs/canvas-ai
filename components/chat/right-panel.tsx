"use client"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Palette,
  Share2,
  AppWindow,
  BrainCircuit,
  Video,
  Settings2,
  PlusCircle,
  Waypoints,
  Contact,
  PanelRightClose,
  Wrench,
  ChevronDown,
  ChevronRight,
  Mail,
  Search,
  VideoIcon,
  Paintbrush,
  Mic,
  Calendar,
  Building2,
  TrendingUp,
  Phone,
  Database,
  FileVideo,
  CreditCard,
} from "lucide-react"
import FlowTab from "./flow-tab"
import { useState } from "react"

const features = [
  { name: "Agent/Flow Builder", icon: <Bot className="w-5 h-5" />, href: "/agent-flow-builder" },
  { name: "App/Web Builder", icon: <AppWindow className="w-5 h-5" />, href: "#" },
  { name: "Video Meeting", icon: <Video className="w-5 h-5" />, href: "/video-meeting" },
  { name: "Management Center", icon: <Settings2 className="w-5 h-5" />, href: "/management-center" },
]

const businessSubItems = [
  { name: "Marketing", icon: <TrendingUp className="w-4 h-4" />, href: "/marketing" },
  { name: "CRM", icon: <Contact className="w-4 h-4" />, href: "/crm" },
  { name: "Email", icon: <Mail className="w-4 h-4" />, href: "/email" },
  { name: "Dial", icon: <Phone className="w-4 h-4" />, href: "/voice/dial" },
  { name: "Payments", icon: <CreditCard className="w-4 h-4" />, href: "/payments" },
  { name: "Lead Gen", icon: <Database className="w-4 h-4" />, href: "/business/lead-gen" },
]

const creativeStudioSubItems = [
  { name: "Content", icon: <FileVideo className="w-4 h-4" />, href: "/creative-studio/content" },
  { name: "Img/Vid Gen", icon: <VideoIcon className="w-4 h-4" />, href: "/creative-studio" },
  { name: "Voice Clone", icon: <Mic className="w-4 h-4" />, href: "/creative-studio/voice" },
  { name: "Model Training", icon: <BrainCircuit className="w-4 h-4" />, href: "/model-training" },
]

const socialStationSubItems = [
  { name: "Dashboard", icon: <Calendar className="w-4 h-4" />, href: "/social-station/dashboard" },
  { name: "Schedule", icon: <Calendar className="w-4 h-4" />, href: "/social-station/schedule" },
  { name: "Influencer", icon: <Bot className="w-4 h-4" />, href: "/social-station/influencer" },
  { name: "B-roll", icon: <FileVideo className="w-4 h-4" />, href: "/social-station/b-roll" },
]

const addFeatures = ["Add Feature", "Add Feature"]

export default function RightPanel({ togglePanel }: { togglePanel: () => void }) {
  const [isBusinessOpen, setIsBusinessOpen] = useState(false)
  const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false)
  const [isSocialStationOpen, setIsSocialStationOpen] = useState(false)

  return (
    <aside className="w-72 flex flex-col bg-card border-l relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePanel}
        className="absolute top-2 left-2 z-10 text-muted-foreground hover:bg-secondary hover:text-foreground h-8 w-8"
        title="Collapse panel"
      >
        <PanelRightClose className="w-5 h-5" />
      </Button>
      <Tabs defaultValue="features" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border-b h-14">
          <TabsTrigger
            value="features"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
          >
            Features
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Tools
          </TabsTrigger>
          <TabsTrigger
            value="flow"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md"
          >
            <Waypoints className="w-4 h-4 mr-2" />
            Live
          </TabsTrigger>
        </TabsList>
        <TabsContent value="features" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0">
          {features
            .filter((tool) => tool.name !== "Social Station")
            .map((tool) => (
              <Link
                key={tool.name}
                href={tool.href}
                className="flex items-center p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="mr-3 text-accent-primary">{tool.icon}</div>
                <p className="font-medium text-foreground text-sm">{tool.name}</p>
              </Link>
            ))}

          <div className="space-y-1">
            <div
              onClick={() => setIsBusinessOpen(!isBusinessOpen)}
              className="flex items-center p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="mr-3 text-accent-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="font-medium text-foreground text-sm flex-1">Business</p>
              <div className="text-muted-foreground transition-transform duration-200">
                {isBusinessOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isBusinessOpen ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-4 space-y-1 border-l border-border pl-4">
                {businessSubItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center p-2 rounded-md bg-background hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="mr-3 text-accent-primary">{item.icon}</div>
                    <p className="font-medium text-foreground text-sm">{item.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div
              onClick={() => setIsCreativeStudioOpen(!isCreativeStudioOpen)}
              className="flex items-center p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="mr-3 text-accent-primary">
                <Palette className="w-5 h-5" />
              </div>
              <p className="font-medium text-foreground text-sm flex-1">Creative Studio</p>
              <div className="text-muted-foreground transition-transform duration-200">
                {isCreativeStudioOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isCreativeStudioOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-4 space-y-1 border-l border-border pl-4">
                {creativeStudioSubItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center p-2 rounded-md bg-background hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="mr-3 text-accent-primary">{item.icon}</div>
                    <p className="font-medium text-foreground text-sm">{item.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div
              onClick={() => setIsSocialStationOpen(!isSocialStationOpen)}
              className="flex items-center p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="mr-3 text-accent-primary">
                <Share2 className="w-5 h-5" />
              </div>
              <p className="font-medium text-foreground text-sm flex-1">Social Station</p>
              <div className="text-muted-foreground transition-transform duration-200">
                {isSocialStationOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isSocialStationOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-4 space-y-1 border-l border-border pl-4">
                {socialStationSubItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center p-2 rounded-md bg-background hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="mr-3 text-accent-primary">{item.icon}</div>
                    <p className="font-medium text-foreground text-sm">{item.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {addFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-center p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors text-muted-foreground"
            >
              <div className="mr-3">
                <PlusCircle className="w-5 h-5" />
              </div>
              <p className="font-medium text-sm">{feature}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="tools" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="text-center text-muted-foreground p-8 text-sm">
            <p>Utility tools will be displayed here.</p>
          </div>
        </TabsContent>
        <TabsContent value="flow" className="flex-1 overflow-y-auto p-4 mt-0">
          <FlowTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
