import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Send,
  FileText,
  Bot,
  Bell,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react'
import { useUIStore } from '@/stores'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { alertsService } from '@/services'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/job-offers', label: 'Offres', icon: Briefcase },
  { to: '/applications', label: 'Candidatures', icon: Send },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/ai-tools', label: 'Outils IA', icon: Bot },
  { to: '/alerts', label: 'Alertes', icon: Bell },
]

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { data: alertsSummary } = useQuery({
    queryKey: ['alerts-summary'],
    queryFn: alertsService.getSummary,
    refetchInterval: 1000 * 60 * 5, // every 5min
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-20',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 whitespace-nowrap">Job Search</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">Architecte IT</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'sidebar-link',
                  isActive && 'active',
                  !sidebarOpen && 'justify-center px-2'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} />
                {to === '/alerts' && alertsSummary && alertsSummary.total > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {alertsSummary.total > 9 ? '9+' : alertsSummary.total}
                  </span>
                )}
              </div>
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
