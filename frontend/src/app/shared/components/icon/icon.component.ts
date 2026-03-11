import { Component, computed, input } from '@angular/core'
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleAlert,
  Clock,
  ClipboardList,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flag,
  Folder,
  GitBranch,
  Hash,
  History,
  House,
  Inbox,
  Info,
  LayoutDashboard,
  LineChart,
  Link,
  List,
  ListTodo,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  PanelLeft,
  PenLine,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  SortAsc,
  SortDesc,
  Star,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Trash,
  TriangleAlert,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-angular'
import { LucideAngularModule } from 'lucide-angular'

export type LucideIconName =
  | 'activity'
  | 'alert-circle'
  | 'archive'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-up-down'
  | 'bar-chart-3'
  | 'bell'
  | 'calendar-days'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'circle'
  | 'circle-alert'
  | 'clock'
  | 'clipboard-list'
  | 'copy'
  | 'edit'
  | 'external-link'
  | 'eye'
  | 'eye-off'
  | 'file-text'
  | 'filter'
  | 'flag'
  | 'folder'
  | 'git-branch'
  | 'hash'
  | 'history'
  | 'house'
  | 'inbox'
  | 'info'
  | 'layout-dashboard'
  | 'line-chart'
  | 'link'
  | 'list'
  | 'list-todo'
  | 'loader-2'
  | 'lock'
  | 'log-out'
  | 'mail'
  | 'menu'
  | 'message-circle'
  | 'more-horizontal'
  | 'more-vertical'
  | 'panel-left'
  | 'pen-line'
  | 'percent'
  | 'plus'
  | 'refresh-cw'
  | 'search'
  | 'settings'
  | 'shield'
  | 'sort-asc'
  | 'sort-desc'
  | 'star'
  | 'tag'
  | 'target'
  | 'trending-down'
  | 'trending-up'
  | 'trash'
  | 'triangle-alert'
  | 'user'
  | 'user-plus'
  | 'users'
  | 'x'
  | 'zap'

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon
      [img]="getIconComponent()"
      [class]="computedClass()"
    ></lucide-icon>
  `,
})
export class IconComponent {
  name = input.required<LucideIconName>()
  class = input<string | string[]>('')

  computedClass = computed(() => {
    const classInput = this.class()
    return Array.isArray(classInput) ? classInput.join(' ') : classInput
  })

  private readonly iconMap = {
    'activity': Activity,
    'alert-circle': AlertCircle,
    'archive': Archive,
    'arrow-down': ArrowDown,
    'arrow-left': ArrowLeft,
    'arrow-right': ArrowRight,
    'arrow-up': ArrowUp,
    'arrow-up-down': ArrowUpDown,
    'bar-chart-3': BarChart3,
    'bell': Bell,
    'calendar-days': CalendarDays,
    'check': Check,
    'check-circle': CheckCircle,
    'chevron-down': ChevronDown,
    'chevron-left': ChevronLeft,
    'chevron-right': ChevronRight,
    'chevron-up': ChevronUp,
    'circle': Circle,
    'circle-alert': CircleAlert,
    'clock': Clock,
    'clipboard-list': ClipboardList,
    'copy': Copy,
    'edit': Edit,
    'external-link': ExternalLink,
    'eye': Eye,
    'eye-off': EyeOff,
    'file-text': FileText,
    'filter': Filter,
    'flag': Flag,
    'folder': Folder,
    'git-branch': GitBranch,
    'hash': Hash,
    'history': History,
    'house': House,
    'inbox': Inbox,
    'info': Info,
    'layout-dashboard': LayoutDashboard,
    'line-chart': LineChart,
    'link': Link,
    'list': List,
    'list-todo': ListTodo,
    'loader-2': Loader2,
    'lock': Lock,
    'log-out': LogOut,
    'mail': Mail,
    'menu': Menu,
    'message-circle': MessageCircle,
    'more-horizontal': MoreHorizontal,
    'more-vertical': MoreVertical,
    'panel-left': PanelLeft,
    'pen-line': PenLine,
    'percent': Percent,
    'plus': Plus,
    'refresh-cw': RefreshCw,
    'search': Search,
    'settings': Settings,
    'shield': Shield,
    'sort-asc': SortAsc,
    'sort-desc': SortDesc,
    'star': Star,
    'tag': Tag,
    'target': Target,
    'trending-down': TrendingDown,
    'trending-up': TrendingUp,
    'trash': Trash,
    'triangle-alert': TriangleAlert,
    'user': User,
    'user-plus': UserPlus,
    'users': Users,
    'x': X,
    'zap': Zap,
  }

  getIconComponent() {
    return this.iconMap[this.name()]
  }
}
