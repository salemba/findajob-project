import { useLocation, Link } from 'react-router-dom'

const ROUTE_META: Record<string, { title: string; breadcrumb?: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/offers':    { title: 'Offres d\'emploi' },
  '/offers/new':{ title: 'Nouvelle offre', breadcrumb: 'Offres' },
  '/kanban':    { title: 'Pipeline Kanban' },
  '/documents': { title: 'Documents' },
  '/alerts':    { title: 'Alertes' },
  '/settings':  { title: 'Paramètres' },
}

function getBreadcrumb(pathname: string) {
  if (pathname.startsWith('/offers/') && pathname !== '/offers/new') {
    return { title: 'Détail offre', breadcrumb: 'Offres' }
  }
  return ROUTE_META[pathname] ?? { title: pathname.split('/').pop() ?? '' }
}

export default function Header() {
  const { pathname } = useLocation()
  const meta = getBreadcrumb(pathname)

  return (
    <header className="flex items-center gap-3 h-12 px-5 border-b border-outline bg-surface flex-shrink-0">
      {meta.breadcrumb && (
        <>
          <Link
            to={`/${meta.breadcrumb.toLowerCase()}`}
            className="text-xs text-ink-muted hover:text-ink transition-colors font-mono"
          >
            {meta.breadcrumb}
          </Link>
          <span className="text-ink-faint text-xs">/</span>
        </>
      )}
      <h1 className="text-sm font-display font-semibold text-ink">{meta.title}</h1>
    </header>
  )
}
