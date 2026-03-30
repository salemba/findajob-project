import { formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search, Sparkles, Send, Calendar, Trophy, X, Archive,
} from 'lucide-react'
import type { JobOffer, OfferStatus } from '@/types'
import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface EventMeta {
  label:    string
  Icon:     LucideIcon
  color:    string
  dotBg:    string
}

const EVENT: Record<OfferStatus, EventMeta> = {
  NEW:       { label: 'Offre trouvée',         Icon: Search,   color: 'text-info',       dotBg: 'bg-info' },
  ANALYZED:  { label: 'Analyse IA complétée',  Icon: Sparkles, color: 'text-blue-400',   dotBg: 'bg-blue-400' },
  APPLIED:   { label: 'Candidature envoyée',   Icon: Send,     color: 'text-warn',       dotBg: 'bg-warn' },
  INTERVIEW: { label: 'Entretien planifié',    Icon: Calendar, color: 'text-accent',     dotBg: 'bg-accent' },
  OFFER:     { label: 'Offre reçue 🎉',        Icon: Trophy,   color: 'text-ok',         dotBg: 'bg-ok' },
  REJECTED:  { label: 'Candidature refusée',   Icon: X,        color: 'text-fail',       dotBg: 'bg-fail' },
  ARCHIVED:  { label: 'Archivée',              Icon: Archive,  color: 'text-ink-faint',  dotBg: 'bg-ink-faint' },
}

interface ActivityTimelineProps {
  offers: JobOffer[]
}

export function ActivityTimeline({ offers }: ActivityTimelineProps) {
  const events = [...offers]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10)

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-outline flex-shrink-0">
        <p className="text-xs font-mono text-ink-muted uppercase tracking-widest">Activité récente</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {events.length === 0 ? (
          <p className="text-xs text-ink-faint font-mono text-center py-10">
            Aucune activité récente.
          </p>
        ) : (
          <ol className="relative border-l border-outline ml-2 space-y-5">
            {events.map((offer) => {
              const meta = EVENT[offer.status]
              const { Icon } = meta
              const date = offer.updated_at ?? offer.created_at

              return (
                <li key={offer.id} className="ml-5 relative">
                  {/* Timeline dot */}
                  <span
                    className={clsx(
                      'absolute -left-[25px] top-0.5 w-4 h-4 rounded-full',
                      'border-2 border-surface-1',
                      'flex items-center justify-center',
                      meta.dotBg,
                    )}
                  >
                    <Icon size={8} className="text-white" />
                  </span>

                  {/* Content */}
                  <p className={clsx('text-xs font-mono font-medium', meta.color)}>
                    {meta.label}
                  </p>
                  <p className="text-xs font-medium text-ink mt-0.5 leading-snug line-clamp-1">
                    {offer.title}
                    {offer.company && (
                      <span className="text-ink-muted font-normal"> — {offer.company}</span>
                    )}
                  </p>
                  {offer.compatibility_score != null && (
                    <p className="text-xs font-mono text-ink-faint mt-0.5">
                      Score {offer.compatibility_score}/100
                    </p>
                  )}
                  <time className="text-xs text-ink-faint font-mono">
                    {formatDistanceToNow(parseISO(date), { addSuffix: true, locale: fr })}
                  </time>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
