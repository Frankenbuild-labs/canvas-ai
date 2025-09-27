import {
  Bot,
  Calendar,
  Camera,
  Code,
  Database,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Music,
  Settings,
  Shield,
  Star,
  Users,
  Zap,
  Heart,
  Bookmark,
  Search,
  Home,
  User,
  Bell,
  Lock,
  Eye,
  Download,
  Upload,
  Edit,
  Trash,
  Plus,
  Minus,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

const iconMap = {
  bot: Bot,
  calendar: Calendar,
  camera: Camera,
  code: Code,
  database: Database,
  file: FileText,
  globe: Globe,
  mail: Mail,
  message: MessageSquare,
  music: Music,
  settings: Settings,
  shield: Shield,
  star: Star,
  users: Users,
  zap: Zap,
  heart: Heart,
  bookmark: Bookmark,
  search: Search,
  home: Home,
  user: User,
  bell: Bell,
  lock: Lock,
  eye: Eye,
  download: Download,
  upload: Upload,
  edit: Edit,
  trash: Trash,
  plus: Plus,
  minus: Minus,
  check: Check,
  x: X,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
}

export const iconNames = Object.keys(iconMap) as Array<keyof typeof iconMap>

type IconProps = {
  name: keyof typeof iconMap
  className?: string
}

export function Icon({ name, className = "w-4 h-4" }: IconProps) {
  const IconComponent = iconMap[name]
  return IconComponent ? <IconComponent className={className} /> : null
}
