import { clsx } from 'clsx'
import { CompatibilityGauge } from '@/components/dashboard'

// Known score_details keys → French labels
const SCORE_LABELS: Record<string, string> = {
  ai_llm:           'IA / LLM',
  big_data:         'Big Data',
  cloud:            'Cloud',
  security:         'Sécurité',
  soft_skills:      'Soft Skills',
  technical_match:  'Compétences tech.',
  experience_match: 'Expérience',
  domain_match:     'Domaine',
  salary_match:     'TJM / Salaire',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-ink-muted">{label}</span>
        <span className={clsx('font-semibold tabular-nums',
          pct >= 80 ? 'text-ok' : pct >= 60 ? 'text-warn' : 'text-fail')}>
          {Math.round(pct)}
        </span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700',
            pct >= 80 ? 'bg-ok' : pct >= 60 ? 'bg-warn' : 'bg-fail')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Skeleton while Claude is analyzing ──────────────────────────────────────

export function AnalysisSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Analyse en cours…">
      {/* Gauge + label */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-surface-3 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-surface-3 rounded w-36" />
          <div className="h-3 bg-surface-3 rounded w-24" />
        </div>
      </div>
      {/* Score bars */}
      <div className="space-y-1 text-xs font-mono text-ink-faint uppercase tracking-widest">
        <div className="h-3 bg-surface-3 rounded w-24 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5 pb-1">
            <div className="flex justify-between">
              <div className="h-3 bg-surface-3 rounded w-28" />
              <div className="h-3 bg-surface-3 rounded w-8" />
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full" />
          </div>
        ))}
      </div>
      {/* Keyword pills */}
      <div className="flex flex-wrap gap-1.5">
        {[10, 14, 9, 12, 8, 11, 13].map((w, i) => (
          <div key={i} className="h-5 bg-surface-3 rounded" style={{ width: `${w * 6}px` }} />
        ))}
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface AnalysisPanelProps {
  score:         number | null
  score_details?: Record<string, unknown>
  keywords?:     string[]
  strengths?:    string[]
  warnings?:     string[]
}

export function AnalysisPanel({
  score, score_details, keywords, strengths, warnings,
}: AnalysisPanelProps) {

  // Normalize score_details: filter numeric values, convert 0-1 range to 0-100
  const bars = Object.entries(score_details ?? {})
    .filter(([k, v]) => typeof v === 'number' && !['total', 'overall', 'score'].includes(k))
    .map(([k, v]) => {
      const raw   = v as number
      const value = raw <= 1 ? raw * 100 : raw
      return { key: k, label: SCORE_LABELS[k] ?? k.replace(/_/g, ' '), value }
    })

  return (
    <div className="space-y-5">

      {/* Score gauge */}
      <div className="flex items-center gap-4">
        <CompatibilityGauge score={score} size={88} />
        <div>
          <p className="text-sm font-display font-semibold text-ink">Compatibilité</p>
          <p className={clsx('text-xs font-mono mt-0.5',
            score == null ? 'text-ink-faint' :
            score >= 80   ? 'text-ok' :
            score >= 60   ? 'text-warn' : 'text-fail')}>
            {score == null        ? '—'
              : score >= 80      ? '✓ Très bon match'
              : score >= 60      ? '~ Match partiel'
              : '✗ Match faible'}
          </p>
          {score != null && (
            <p className="text-xs text-ink-faint font-mono mt-0.5">
              {score >= 80 ? 'Candidate sans hésiter'
                : score >= 60 ? 'Quelques ajustements à prévoir'
                : 'Beaucoup de points manquants'}
            </p>
          )}
        </div>
      </div>

      {/* Category bars */}
      {bars.length > 0 && (
        <div>
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-3">Détail des scores</p>
          <div className="space-y-2.5">
            {bars.map(({ key, label, value }) => (
              <ScoreBar key={key} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {keywords && keywords.length > 0 && (
        <div>
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">Mots-clés prioritaires</p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span key={kw} className="badge badge-accent">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div>
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">Points forts</p>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-muted leading-relaxed">
                <span className="text-ok flex-shrink-0 mt-0.5">●</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div>
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">Points d'attention</p>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-muted leading-relaxed">
                <span className="text-warn flex-shrink-0 mt-0.5">●</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
