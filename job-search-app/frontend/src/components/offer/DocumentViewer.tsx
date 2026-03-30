import { useState } from 'react'
import type { ReactNode } from 'react'
import { Copy, Download, RefreshCcw, CheckCircle2, FileText } from 'lucide-react'
import { useDocumentsStore } from '@/stores'
import { Button, ValidatedBadge } from '@/components/ui'
import type { Document, DocumentType } from '@/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ── Keyword highlighter ──────────────────────────────────────────────────────

function highlightKeywords(text: string, keywords: string[]): ReactNode {
  if (!keywords.length) return text
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(pattern).map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-yellow-400/20 text-yellow-300 rounded-sm px-0.5 not-italic">{part}</mark>
      : part
  )
}

// ── Skeleton during generation ───────────────────────────────────────────────

function DocSkeleton({ type }: { type: DocumentType }) {
  return (
    <div className="bg-surface-2 rounded-lg border border-outline p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-outline">
        <div className="w-4 h-4 rounded-full bg-accent animate-pulse" />
        <p className="text-xs font-mono text-accent animate-pulse">
          Claude génère {type === 'CV' ? 'votre CV' : 'votre lettre'}…
        </p>
      </div>
      <div className="animate-pulse space-y-2.5">
        {[95, 80, 88, 72, 90, 65, 85, 78, 60, 92, 70, 83].map((w, i) => (
          <div key={i} className="h-2.5 bg-surface-3 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="text-xs text-ink-faint font-mono text-center pt-2">
        Environ 5–10 secondes…
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface DocumentViewerProps {
  offerId:      string
  type:         DocumentType
  docs:         Document[]
  keywords?:    string[]
  serif?:       boolean
  onGenerate:   () => Promise<void>
  isGenerating: boolean
}

export function DocumentViewer({
  offerId, type, docs, keywords = [], serif = false, onGenerate, isGenerating,
}: DocumentViewerProps) {
  const { exportDocument, validateDocument, deleteDocument, regenerate } = useDocumentsStore()
  const [selId, setSelId] = useState<string | null>(null)

  const sorted = [...docs]
    .filter((d) => d.type === type)
    .sort((a, b) => b.version - a.version)

  const doc = sorted.find((d) => d.id === selId) ?? sorted[0]

  const handleCopy = () => {
    if (doc?.content) {
      navigator.clipboard.writeText(doc.content)
      toast.success('Copié dans le presse-papier')
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (sorted.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-outline flex items-center justify-center">
          <FileText size={20} className="text-ink-faint" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-muted">
            {type === 'CV' ? 'Aucun CV généré pour cette offre' : 'Aucune lettre générée pour cette offre'}
          </p>
          <p className="text-xs text-ink-faint font-mono mt-1">Claude adaptera le contenu à l'offre</p>
        </div>
        <Button variant="primary" size="sm" onClick={onGenerate}>
          ✦ {type === 'CV' ? 'Générer le CV' : 'Générer la lettre'} avec Claude
        </Button>
      </div>
    )
  }

  // ── Generating state ─────────────────────────────────────────────────────

  if (isGenerating && sorted.length === 0) {
    return <DocSkeleton type={type} />
  }

  // ── Document display ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-outline">
        {/* Version selector */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-ink-muted flex-shrink-0">Version :</span>
          <select
            className="input h-7 text-xs w-auto"
            value={doc?.id ?? ''}
            onChange={(e) => setSelId(e.target.value)}
          >
            {sorted.map((d) => (
              <option key={d.id} value={d.id}>
                v{d.version} — {format(parseISO(d.created_at), 'dd/MM HH:mm', { locale: fr })}
                {d.is_validated ? ' ✓' : ''}
              </option>
            ))}
          </select>
          {doc && doc.file_path && !doc.is_validated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium border bg-purple-500/10 text-purple-400 border-purple-500/20">
              🤖 Généré par agent IA
            </span>
          ) : doc ? (
            <ValidatedBadge validated={doc.is_validated} />
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {doc && !doc.is_validated && (
          <Button
            variant="ghost" size="xs"
            onClick={() => validateDocument(doc.id, offerId)}
            title="Marquer comme validé"
          >
            <CheckCircle2 size={13} className="text-ok" />
            Valider
          </Button>
        )}
        {doc?.file_path && (
          <a
            href={`/api/v1/documents/${doc.id}/download`}
            download
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink border border-outline transition-colors"
            title="Télécharger le fichier généré"
          >
            <Download size={12} />
            Télécharger
          </a>
        )}
        <Button
          variant="ghost" size="xs"
          onClick={() => doc && regenerate(doc.id, offerId)}
          loading={isGenerating}
          title="Régénérer"
        >
          <RefreshCcw size={13} />
        </Button>
        <Button variant="ghost" size="xs" onClick={handleCopy} title="Copier">
          <Copy size={13} />
        </Button>
        <Button
          variant="ghost" size="xs"
          onClick={() => doc && exportDocument(doc.id, 'pdf')}
          title="Exporter en PDF"
        >
          <Download size={13} />
          <span className="font-mono">PDF</span>
        </Button>
        <Button
          variant="ghost" size="xs"
          onClick={() => doc && exportDocument(doc.id, 'docx')}
          title="Exporter en DOCX"
        >
          <Download size={13} />
          <span className="font-mono">DOCX</span>
        </Button>
        <Button
          variant="ghost" size="xs"
          onClick={() => doc && deleteDocument(doc.id, offerId)}
          title="Supprimer cette version"
          className="text-fail"
        >
          ×
        </Button>
      </div>

      {/* Content area */}
      {isGenerating ? (
        <DocSkeleton type={type} />
      ) : (
        <div className={clsx(
          'bg-surface-2 border border-outline rounded-lg overflow-y-auto scrollbar-thin',
          'p-6 max-h-[560px]',
        )}>
          {doc?.content ? (
            <pre className={clsx(
              'whitespace-pre-wrap text-ink-muted leading-relaxed',
              serif ? 'font-sans text-sm' : 'font-mono text-xs',
            )}>
              {keywords.length > 0
                ? highlightKeywords(doc.content, keywords)
                : doc.content}
            </pre>
          ) : (
            <p className="text-xs text-ink-faint font-mono">Contenu vide.</p>
          )}
        </div>
      )}

      {/* Generate new version */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-ink-faint font-mono">
          {sorted.length} version{sorted.length > 1 ? 's' : ''} — modèle : {doc?.model_used ?? '—'}
        </p>
        <Button variant="ghost" size="xs" onClick={onGenerate} loading={isGenerating}>
          <RefreshCcw size={11} />
          Nouvelle version
        </Button>
      </div>
    </div>
  )
}
