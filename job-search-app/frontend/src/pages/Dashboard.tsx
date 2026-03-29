import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Briefcase, Send, FileText, Bell, TrendingUp, Star,
  ArrowRight, Clock, AlertTriangle
} from 'lucide-react'
import { jobOffersService, applicationsService, alertsService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import ScoreBadge from '@/components/ScoreBadge'
import StatusBadge from '@/components/StatusBadge'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['job-offers-stats'],
    queryFn: jobOffersService.getStats,
  })

  const { data: recentOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['job-offers-recent'],
    queryFn: () => jobOffersService.list({ page_size: 5, order_by: 'created_at', order_desc: true }),
  })

  const { data: pipeline } = useQuery({
    queryKey: ['applications-pipeline'],
    queryFn: applicationsService.getPipeline,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsService.getAlerts(7),
  })

  if (statsLoading || offersLoading) return <LoadingSpinner fullPage text="Chargement du dashboard..." />

  const byStatus = stats?.by_status || {}
  const statusChartData = Object.entries(byStatus).map(([status, count]) => ({ status, count }))
  const pipelineData = Object.entries(pipeline?.pipeline || {}).map(([status, count]) => ({ status, count }))

  const kpis = [
    { label: 'Offres totales', value: stats?.total ?? 0, icon: Briefcase, color: 'text-blue-600 bg-blue-100' },
    { label: 'Nouvelles', value: byStatus['Nouvelle'] ?? 0, icon: Star, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Candidatures', value: byStatus['Candidatée'] ?? 0, icon: Send, color: 'text-green-600 bg-green-100' },
    { label: 'Score moyen IA', value: stats?.average_ai_score ? `${stats.average_ai_score.toFixed(0)}` : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Alerts banner */}
      {alerts && alerts.filter(a => a.severity === 'high').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">
              {alerts.filter(a => a.severity === 'high').length} alerte(s) urgente(s)
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              {alerts.filter(a => a.severity === 'high')[0]?.description}
            </p>
          </div>
          <Link to="/alerts" className="btn-secondary text-xs">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution chart */}
        {statusChartData.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Offres par statut</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pipeline */}
        {pipelineData.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Pipeline candidatures</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ status, count }) => `${count}`}
                >
                  {pipelineData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent offers */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Offres récentes</h2>
          <Link to="/job-offers" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOffers?.items.map((offer) => (
            <Link
              key={offer.id}
              to={`/job-offers/${offer.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{offer.title}</p>
                <p className="text-sm text-gray-500">{offer.company} {offer.location && `· ${offer.location}`}</p>
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <ScoreBadge score={offer.ai_score} size="sm" />
                <StatusBadge status={offer.status} size="sm" />
              </div>
            </Link>
          ))}
          {!recentOffers?.items.length && (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              Aucune offre pour l'instant. <Link to="/job-offers" className="text-primary-600">Ajouter une offre</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
