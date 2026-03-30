import { useQuery } from '@tanstack/react-query'
import { Briefcase, Send, CalendarCheck, BarChart2 } from 'lucide-react'
import { subDays, isAfter, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { jobOffersService } from '@/services'
import { FullPageSpinner } from '@/components/ui'
import {
  KpiCard, CompatibilityGauge, MiniKanban, OffersTable, ActivityTimeline,
} from '@/components/dashboard'
import { OFFER_STATUS_LABELS } from '@/types'
import type { OfferStatus } from '@/types'

const STATUS_COLORS: Record<OfferStatus, string> = {
  NEW:       '#60a5fa',
  ANALYZED:  '#818cf8',
  APPLIED:   '#f59e0b',
  INTERVIEW: '#c9462a',
  OFFER:     '#22c55e',
  REJECTED:  '#ef4444',
  ARCHIVED:  '#404040',
}

const CHART_STATUSES: OfferStatus[] = ['NEW', 'ANALYZED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']

export default function DashboardPage() {
  /* ── Data ─────────────────────────────────────────────── */
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['offers-stats'],
    queryFn: jobOffersService.getStats,
  })

  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['offers-pipeline'],
    queryFn: () =>
      jobOffersService.list({ page_size: 100, order_by: 'created_at', order_desc: true }),
  })

  if (statsLoading || pipelineLoading) {
    return <FullPageSpinner text="Chargement du tableau de bord…" />
  }

  /* ── Derived values ───────────────────────────────────── */
  const offers      = pipelineData?.items ?? []
  const total       = stats?.total ?? 0
  const avgScore    = stats?.average_score != null ? Math.round(stats.average_score) : null
  const applied     = stats?.by_status?.APPLIED    ?? 0
  const interviews  = stats?.by_status?.INTERVIEW  ?? 0
  const conversion  = applied > 0 ? Math.round((interviews / applied) * 100) : 0

  // Week-over-week trend
  const now         = new Date()
  const weekAgo     = subDays(now, 7)
  const twoWeeksAgo = subDays(now, 14)
  const thisWeek    = offers.filter((o) => isAfter(parseISO(o.created_at), weekAgo)).length
  const lastWeek    = offers.filter((o) => {
    const d = parseISO(o.created_at)
    return isAfter(d, twoWeeksAgo) && !isAfter(d, weekAgo)
  }).length
  const weekTrend   = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null

  // Bar chart data
  const chartData = CHART_STATUSES.map((s) => ({
    status: s,
    label:  OFFER_STATUS_LABELS[s],
    count:  stats?.by_status?.[s] ?? 0,
    color:  STATUS_COLORS[s],
  }))

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto scrollbar-thin">

      {/* ── Section 1: KPIs ─────────────────────────────── */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total offres"
          value={total}
          subtitle={`${thisWeek} cette semaine`}
          icon={<Briefcase size={15} />}
          trend={weekTrend}
          trendLabel="vs S-1"
        />

        <KpiCard
          title="Score moyen"
          value={avgScore != null ? `${avgScore}/100` : '—'}
          subtitle="Compatibilité IA"
          icon={<BarChart2 size={15} />}
          accent
        >
          <div className="flex justify-center pt-1">
            <CompatibilityGauge score={avgScore} size={84} />
          </div>
        </KpiCard>

        <KpiCard
          title="Candidatures"
          value={applied}
          subtitle={`dont ${interviews} en entretien`}
          icon={<Send size={15} />}
        />

        <KpiCard
          title="Entretiens"
          value={interviews}
          subtitle={applied > 0 ? `Conversion: ${conversion}%` : 'Aucune candidature'}
          icon={<CalendarCheck size={15} />}
          trend={conversion > 0 ? conversion : null}
          trendLabel="conv."
        />
      </section>

      {/* ── Status distribution bar chart ───────────────── */}
      <section className="card p-4">
        <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-3">
          Distribution par statut
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={34} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#7f7f7f', fontSize: 10, fontFamily: 'DM Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#7f7f7f', fontSize: 10, fontFamily: 'DM Mono' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#242424',
                border: '1px solid #2c2c2c',
                borderRadius: '8px',
                fontSize: 11,
                fontFamily: 'DM Mono',
              }}
              labelStyle={{ color: '#ebebeb' }}
              itemStyle={{ color: '#7f7f7f' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── Section 2: Pipeline kanban ───────────────────── */}
      <section>
        <MiniKanban offers={offers} />
      </section>

      {/* ── Section 3 + 4: Table & Activity ─────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4 pb-6">
        <div className="xl:col-span-3" style={{ minHeight: 440 }}>
          <OffersTable />
        </div>
        <div className="xl:col-span-2" style={{ minHeight: 440 }}>
          <ActivityTimeline offers={offers} />
        </div>
      </section>

    </div>
  )
}
