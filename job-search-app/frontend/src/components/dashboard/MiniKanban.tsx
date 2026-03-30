import { useNavigate } from 'react-router-dom'
import { ScoreBadge } from '@/components/ui'
import type { JobOffer, OfferStatus } from '@/types'
import { clsx } from 'clsx'

const COLS: { status: OfferStatus; label: string; border: string }[] = [
  { status: 'NEW',       label: 'Nouvelles',  border: 'border-info/60' },
  { status: 'ANALYZED',  label: 'Analysées',  border: 'border-blue-400/60' },
  { status: 'APPLIED',   label: 'Postulées',  border: 'border-warn/60' },
  { status: 'INTERVIEW', label: 'Entretien',  border: 'border-accent/60' },
  { status: 'OFFER',     label: 'Offre',      border: 'border-ok/60' },
]

interface MiniKanbanProps {
  offers: JobOffer[]
}

export function MiniKanban({ offers }: MiniKanbanProps) {
  const navigate = useNavigate()

  return (
    <div className="card p-4">
      <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-4">Pipeline</p>

      <div className="grid grid-cols-5 gap-3">
        {COLS.map(({ status, label, border }) => {
          const all   = offers.filter((o) => o.status === status)
          const shown = all.slice(0, 3)

          return (
            <div key={status} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={clsx('border-t-2 pt-2 flex items-center justify-between', border)}>
                <span className="text-xs font-mono font-semibold text-ink truncate">{label}</span>
                <span className="text-xs font-mono text-ink-faint bg-surface-2 rounded-full px-1.5">
                  {all.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-1.5 min-h-[72px]">
                {shown.map((offer) => (
                  <button
                    key={offer.id}
                    onClick={() => navigate(`/offers/${offer.id}`)}
                    className="w-full text-left bg-surface-2 border border-outline hover:border-outline-bold
                               rounded p-2 transition-colors group"
                  >
                    <p className="text-xs font-medium text-ink group-hover:text-accent transition-colors
                                  leading-snug line-clamp-2">
                      {offer.title}
                    </p>
                    <p className="text-xs text-ink-muted font-mono mt-0.5 truncate">{offer.company}</p>
                    {offer.compatibility_score != null && (
                      <div className="mt-1.5">
                        <ScoreBadge score={offer.compatibility_score} />
                      </div>
                    )}
                  </button>
                ))}
                {shown.length === 0 && (
                  <p className="text-xs text-ink-faint font-mono text-center py-3">—</p>
                )}
                {all.length > 3 && (
                  <p className="text-xs text-ink-faint font-mono text-center">
                    +{all.length - 3} autres
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
