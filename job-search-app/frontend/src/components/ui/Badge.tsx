import { clsx } from 'clsx'
import type {
  OfferStatus, RemoteType, OfferType,
  OFFER_STATUS_LABELS, REMOTE_TYPE_LABELS, OFFER_TYPE_LABELS,
} from '@/types'

// ── Offer status badge ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<OfferStatus, string> = {
  NEW:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ANALYZED:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  APPLIED:   'bg-accent-ghost text-accent border-accent/20',
  INTERVIEW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  REJECTED:  'bg-red-500/10 text-red-400 border-red-500/20',
  OFFER:     'bg-green-500/10 text-green-400 border-green-500/20',
  ARCHIVED:  'bg-surface-3 text-ink-muted border-outline-bold',
}

const STATUS_LABELS: Record<OfferStatus, string> = {
  NEW:       'Nouveau',
  ANALYZED:  'Analysé',
  APPLIED:   'Candidaté',
  INTERVIEW: 'Entretien',
  REJECTED:  'Refusé',
  OFFER:     'Offre',
  ARCHIVED:  'Archivé',
}

export function OfferStatusBadge({ status, className }: { status: OfferStatus; className?: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border',
      STATUS_STYLES[status], className
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Compatibility score badge ─────────────────────────────────────────────────
export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score === null) return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border bg-surface-3 text-ink-faint border-outline', className)}>
      —
    </span>
  )
  const color =
    score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
    score >= 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border', color, className)}>
      {score}%
    </span>
  )
}

// ── Remote type badge ─────────────────────────────────────────────────────────
const REMOTE_LABELS: Record<RemoteType, string> = {
  FULL_REMOTE: 'Remote',
  HYBRID: 'Hybride',
  ON_SITE: 'Présentiel',
}
const REMOTE_STYLES: Record<RemoteType, string> = {
  FULL_REMOTE: 'bg-green-500/10 text-green-400 border-green-500/20',
  HYBRID:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ON_SITE:     'bg-surface-3 text-ink-muted border-outline-bold',
}

export function RemoteBadge({ remote_type, className }: { remote_type: RemoteType; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border', REMOTE_STYLES[remote_type], className)}>
      {REMOTE_LABELS[remote_type]}
    </span>
  )
}

// ── Offer type badge ──────────────────────────────────────────────────────────
export function OfferTypeBadge({ type, className }: { type: OfferType; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border bg-surface-3 text-ink-muted border-outline-bold', className)}>
      {type}
    </span>
  )
}

// ── Validated badge ───────────────────────────────────────────────────────────
export function ValidatedBadge({ validated }: { validated: boolean }) {
  return validated ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border bg-green-500/10 text-green-400 border-green-500/20">
      ✓ Validé
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border bg-surface-3 text-ink-muted border-outline-bold">
      Brouillon
    </span>
  )
}

// ── Generic badge ─────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'accent' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-surface-3 text-ink-muted border-outline-bold',
  accent:  'bg-accent-ghost text-accent border-accent/20',
  green:   'bg-green-500/10 text-green-400 border-green-500/20',
  yellow:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  red:     'bg-red-500/10 text-red-400 border-red-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border',
      BADGE_STYLES[variant],
      className
    )}>
      {children}
    </span>
  )
}
