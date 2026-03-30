import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Trello, FileText, Bell, Settings,
  Menu, X, Zap, Star,
} from 'lucide-react'
import { useUIStore } from '@/stores'
import { useQuery } from '@tanstack/react-query'
import { jobOffersService } from '@/services'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/offers',    label: 'Offres',        icon: Briefcase,       badge: 'new-offers' },
  { to: '/kanban',    label: 'Pipeline',      icon: Trello },
  { to: '/documents', label: 'Documents',     icon: FileText },
  { to: '/alerts',    label: 'Alertes',       icon: Bell },
  { to: '/settings',  label: 'Paramètres',    icon: Settings },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()

  const { data: stats } = useQuery({
    queryKey: ['offers-stats'],
    queryFn: jobOffersService.getStats,
    refetchInterval: 1000 * 60 * 5,
  })

  const newCount = stats?.by_status?.NEW ?? 0

  return (
    <aside
      className={clsx(
        'flex flex-col bg-surface-1 border-r border-outline transition-all duration-300 ease-in-out z-20 flex-shrink-0',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 border-b border-outline',
        sidebarOpen ? 'px-4 py-4' : 'px-3 py-4 justify-center'
      )}>
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden min-w-0">
            <p className="text-sm font-display font-bold text-ink whitespace-nowrap leading-tight">Nexply</p>
            <p className="text-[10px] text-ink-muted whitespace-nowrap font-mono">Architecte IA/Data</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => {
          const count = badge === 'new-offers' ? newCount : 0

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active', !sidebarOpen && 'justify-center px-2')
              }
              title={!sidebarOpen ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={16} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-accent text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5 font-mono">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              {sidebarOpen && <span className="truncate text-[13px]">{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-outline">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
          aria-label={sidebarOpen ? 'Réduire la sidebar' : 'Ouvrir la sidebar'}
        >
          {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
        </button>
      </div>
    </aside>
  )
}
