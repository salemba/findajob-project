import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: number | null
  trendLabel?: string
  accent?: boolean
  children?: ReactNode
}

export function KpiCard({
  title, value, subtitle, icon, trend, trendLabel, accent, children,
}: KpiCardProps) {
  const hasTrend = trend != null
  const up   = hasTrend && trend! > 0
  const down = hasTrend && trend! < 0
  const trendColor = up ? 'text-ok' : down ? 'text-fail' : 'text-ink-muted'
  const TrendIcon  = up ? TrendingUp : down ? TrendingDown : Minus

  return (
    <div className={clsx('card p-5 flex flex-col gap-2', accent && 'border-accent/30')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-mono text-ink-muted uppercase tracking-widest leading-tight">
          {title}
        </p>
        {icon && <span className="text-ink-faint flex-shrink-0">{icon}</span>}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={clsx(
            'text-2xl font-display font-bold tracking-tight',
            accent ? 'text-accent' : 'text-ink',
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-ink-muted font-mono mt-0.5">{subtitle}</p>
          )}
        </div>
        {hasTrend && (
          <div className={clsx('flex items-center gap-1 text-xs font-mono pb-0.5', trendColor)}>
            <TrendIcon size={12} />
            <span>{Math.abs(trend!)}%</span>
            {trendLabel && <span className="text-ink-faint ml-0.5">{trendLabel}</span>}
          </div>
        )}
      </div>

      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}
