import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Info, Calendar, Clock, CheckCircle } from 'lucide-react'
import { alertsService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Alert } from '@/types'

const SEVERITY_CONFIG = {
  high: { label: 'Haute priorité', icon: <AlertTriangle size={16} />, classes: 'bg-red-50 border-red-200 text-red-800' },
  medium: { label: 'Priorité moyenne', icon: <Bell size={16} />, classes: 'bg-orange-50 border-orange-200 text-orange-800' },
  low: { label: 'Faible priorité', icon: <Info size={16} />, classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  follow_up_overdue: <Clock size={16} />,
  next_step_upcoming: <Calendar size={16} />,
  stale_application: <AlertTriangle size={16} />,
  offer_expiring: <Bell size={16} />,
}

export default function AlertsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsService.getAlerts(),
  })

  const { data: summary } = useQuery({
    queryKey: ['alerts-summary'],
    queryFn: () => alertsService.getSummary(),
  })

  if (isLoading) return <LoadingSpinner fullPage text="Chargement des alertes..." />

  const groupedAlerts = data?.reduce<Record<string, Alert[]>>((acc, alert) => {
    const key = alert.severity || 'low'
    if (!acc[key]) acc[key] = []
    acc[key].push(alert)
    return acc
  }, {}) || {}

  const totalAlerts = data?.length || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell size={22} />
          Alertes
          {totalAlerts > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {totalAlerts}
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Suivi des actions requises</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Haute priorité', value: summary.high, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Priorité moyenne', value: summary.medium, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Faible priorité', value: summary.low, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total', value: summary.total, color: 'text-gray-700', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {totalAlerts === 0 ? (
        <div className="card py-20 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-lg font-medium text-gray-700">Aucune alerte !</p>
          <p className="text-sm text-gray-500 mt-1">Toutes vos candidatures sont à jour.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['high', 'medium', 'low'] as const).map((severity) => {
            const alerts = groupedAlerts[severity]
            if (!alerts?.length) return null
            const config = SEVERITY_CONFIG[severity]
            return (
              <div key={severity}>
                <h2 className={`text-sm font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mb-3 border ${config.classes}`}>
                  {config.icon} {config.label} ({alerts.length})
                </h2>
                <div className="space-y-2">
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 flex items-start gap-3 ${config.classes}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {TYPE_ICON[alert.type] || <Bell size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="text-xs mt-0.5 opacity-80">{alert.description}</p>
                        {alert.due_date && (
                          <p className="text-xs mt-1 flex items-center gap-1 opacity-70">
                            <Calendar size={11} />
                            {alert.due_date}
                          </p>
                        )}
                      </div>
                      {alert.application_id && (
                        <Link
                          to={`/applications/${alert.application_id}`}
                          className="flex-shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
                        >
                          Voir →
                        </Link>
                      )}
                      {alert.job_offer_id && (
                        <Link
                          to={`/job-offers/${alert.job_offer_id}`}
                          className="flex-shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
                        >
                          Voir offre →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
