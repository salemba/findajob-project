import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Star, Sparkles, ExternalLink, Trash2,
  CheckCircle2, Clock, MessageSquare, FileText, FileCheck2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { jobOffersService, aiService } from '@/services'
import { useDocumentsStore } from '@/stores'
import {
  Button, Card, CardBody, CardHeader, CardTitle,
  OfferStatusBadge, ScoreBadge, RemoteBadge, OfferTypeBadge,
  FullPageSpinner,
} from '@/components/ui'
import { AnalysisPanel, AnalysisSkeleton, DocumentViewer } from '@/components/offer'
import { OFFER_STATUS_LABELS, type OfferStatus, type JobOffer } from '@/types'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

type Tab = 'offre' | 'cv' | 'lettre' | 'historique'

const TAB_LABELS: Record<Tab, string> = {
  offre:      'Offre',
  cv:         'CV Adapté',
  lettre:     'Lettre de Motivation',
  historique: 'Historique',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NoAnalysis({ onAnalyze, loading }: { onAnalyze: () => void; loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
        <Sparkles size={18} className="text-ink-faint" />
      </div>
      <p className="text-sm text-ink-muted font-mono">Aucune analyse disponible</p>
      <Button variant="primary" size="sm" onClick={onAnalyze} loading={loading}>
        <Sparkles size={13} /> Lancer l'analyse IA
      </Button>
    </div>
  )
}

type TimelineEvent = { label: string; date: string; icon: LucideIcon; color: string }

function HistoryTab({
  offer, notes, onNotesChange, onNotesSave, saving,
}: {
  offer: JobOffer
  notes: string
  onNotesChange: (v: string) => void
  onNotesSave: () => void
  saving: boolean
}) {
  const events: TimelineEvent[] = [
    { label: 'Offre découverte', date: offer.found_at || offer.created_at, icon: Clock, color: 'text-info' },
  ]

  const STATUS_EVENTS: Partial<Record<OfferStatus, { label: string; icon: LucideIcon; color: string }>> = {
    ANALYZED:  { label: 'Analysée par IA',     icon: Sparkles,      color: 'text-info'      },
    APPLIED:   { label: 'Candidature envoyée', icon: CheckCircle2,  color: 'text-ok'        },
    INTERVIEW: { label: 'Entretien planifié',  icon: MessageSquare, color: 'text-warn'      },
    OFFER:     { label: 'Offre reçue 🎉',      icon: FileCheck2,    color: 'text-ok'        },
    REJECTED:  { label: 'Candidature refusée', icon: Trash2,        color: 'text-fail'      },
    ARCHIVED:  { label: 'Archivée',            icon: FileText,      color: 'text-ink-faint' },
  }

  const ev = STATUS_EVENTS[offer.status]
  if (ev) events.push({ ...ev, date: offer.updated_at })
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Timeline */}
      <Card padding="md">
        <CardHeader><CardTitle>Chronologie</CardTitle></CardHeader>
        <CardBody>
          <ol className="relative border-l border-outline ml-2 space-y-6">
            {events.map((e, i) => {
              const Icon = e.icon
              return (
                <li key={i} className="ml-5">
                  <span className={clsx(
                    'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full',
                    'bg-surface-2 ring-2 ring-surface', e.color
                  )}>
                    <Icon size={12} />
                  </span>
                  <p className="text-xs font-medium text-ink">{e.label}</p>
                  <time className="block text-xs text-ink-faint font-mono mt-0.5">
                    {format(parseISO(e.date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    <span className="ml-2 text-ink-faint/60">
                      ({formatDistanceToNow(parseISO(e.date), { addSuffix: true, locale: fr })})
                    </span>
                  </time>
                </li>
              )
            })}
          </ol>
        </CardBody>
      </Card>

      {/* Notes */}
      <Card padding="md">
        <CardHeader><CardTitle>Notes privées</CardTitle></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <textarea
            className="input w-full resize-none text-sm leading-relaxed"
            rows={10}
            placeholder="Remarques, contacts, impressions sur l'entretien…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
          <Button variant="secondary" size="sm" className="self-end" onClick={onNotesSave} loading={saving}>
            Sauvegarder les notes
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OfferDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { fetchByOffer, generateCV, generateCoverLetter, isGenerating, byOffer } = useDocumentsStore()

  const [activeTab,   setActiveTab]   = useState<Tab>('offre')
  const [notes,       setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn:  () => jobOffersService.get(id!),
    enabled:  !!id,
  })

  useQuery({
    queryKey: ['docs', id],
    queryFn:  () => fetchByOffer(id!),
    enabled:  !!id,
  })

  useEffect(() => {
    if (offer?.notes) setNotes(offer.notes)
  }, [offer?.notes])

  const docs       = id ? (byOffer[id] ?? []) : []
  const cvDocs     = docs.filter((d) => d.type === 'CV')
  const letterDocs = docs.filter((d) => d.type === 'COVER_LETTER')

  // ── Mutations ─────────────────────────────────────────────────────────────

  const favMutation = useMutation({
    mutationFn: () => jobOffersService.toggleFavorite(id!),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['offer', id] }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: OfferStatus) => jobOffersService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => jobOffersService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Offre supprimée')
      navigate('/offers')
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: () => aiService.analyze(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      toast.success('Analyse terminée !')
    },
    onError: () => toast.error("Erreur lors de l'analyse"),
  })

  const handleGenerateCV = async () => {
    await generateCV(id!)
    queryClient.invalidateQueries({ queryKey: ['docs', id] })
    setActiveTab('cv')
    toast.success('CV généré !')
  }

  const handleGenerateLetter = async () => {
    await generateCoverLetter(id!)
    queryClient.invalidateQueries({ queryKey: ['docs', id] })
    setActiveTab('lettre')
    toast.success('Lettre générée !')
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await jobOffersService.update(id!, { notes })
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      toast.success('Notes sauvegardées')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingNotes(false)
    }
  }

  const STATUSES: OfferStatus[] = ['NEW', 'ANALYZED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED']

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoading) return <FullPageSpinner text="Chargement de l'offre…" />
  if (!offer) return (
    <div className="p-6 flex flex-col items-center gap-3 pt-20 text-center">
      <p className="text-ink-muted font-mono text-sm">Offre introuvable</p>
      <Button variant="ghost" size="sm" onClick={() => navigate('/offers')}>← Retour aux offres</Button>
    </div>
  )

  const hasAnalysis = !!(offer.compatibility_score || offer.keywords?.length)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-surface border-b border-outline px-6 py-4">

        {/* Row 1: back + title + fav + actions */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/offers')}
            className="p-1.5 mt-0.5 rounded hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-display font-bold text-ink leading-tight truncate">{offer.title}</h1>
              <button
                onClick={() => favMutation.mutate()}
                className={clsx('transition-colors flex-shrink-0',
                  offer.is_favorite ? 'text-yellow-400' : 'text-ink-faint hover:text-yellow-400')}
                title={offer.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Star size={15} fill={offer.is_favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p className="text-xs text-ink-muted font-mono mt-0.5">{offer.company}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 items-center">
            {offer.source_url && (
              <a href={offer.source_url} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" title="Voir l'offre originale"><ExternalLink size={13} /></Button>
              </a>
            )}
            <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending} title="Supprimer">
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        {/* Row 2: badges + status + AI button */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <OfferStatusBadge status={offer.status} />
          <OfferTypeBadge   type={offer.type} />
          <RemoteBadge      remote_type={offer.remote_type} />
          <ScoreBadge       score={offer.compatibility_score} />
          {offer.location && <span className="badge badge-gray text-xs">{offer.location}</span>}
          {offer.tjm_min != null && (
            <span className="badge badge-purple font-mono text-xs">
              {offer.tjm_min}{offer.tjm_max ? `–${offer.tjm_max}` : '+'}€/j
            </span>
          )}
          <div className="flex-1" />
          <select
            className="input h-7 text-xs w-auto"
            value={offer.status}
            onChange={(e) => statusMutation.mutate(e.target.value as OfferStatus)}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABELS[s]}</option>)}
          </select>
          <Button variant="secondary" size="sm" onClick={() => analyzeMutation.mutate()} loading={analyzeMutation.isPending}>
            <Sparkles size={12} /> {hasAnalysis ? 'Ré-analyser' : 'Analyser'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 -mb-px">
          {(['offre', 'cv', 'lettre', 'historique'] as Tab[]).map((tab) => {
            const count = tab === 'cv' ? cvDocs.length : tab === 'lettre' ? letterDocs.length : null
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-2 text-xs font-mono border-b-2 -mb-px transition-colors',
                  activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
                )}
              >
                {TAB_LABELS[tab]}
                {count !== null && count > 0 && (
                  <span className={clsx(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === tab ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-ink-muted'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">

        {/* Tab: Offre */}
        {activeTab === 'offre' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-6xl">
            {/* Raw text */}
            <Card padding="md" className="flex flex-col">
              <CardHeader>
                <CardTitle>Texte brut</CardTitle>
                {offer.raw_text && (
                  <span className="text-xs text-ink-faint font-mono">{offer.raw_text.length} car.</span>
                )}
              </CardHeader>
              <CardBody className="flex-1">
                {offer.raw_text ? (
                  <pre className="text-xs font-mono text-ink-muted whitespace-pre-wrap leading-relaxed
                                  max-h-[600px] overflow-y-auto scrollbar-thin">
                    {offer.raw_text}
                  </pre>
                ) : (
                  <p className="text-sm text-ink-faint font-mono italic">Aucun texte brut enregistré.</p>
                )}
              </CardBody>
            </Card>

            {/* Analysis */}
            <div>
              {analyzeMutation.isPending ? (
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b border-outline">
                    <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <p className="text-xs font-mono text-accent">Analyse en cours…</p>
                    <span className="text-xs text-ink-faint font-mono ml-auto">~5–10 s</span>
                  </div>
                  <AnalysisSkeleton />
                </Card>
              ) : hasAnalysis ? (
                <Card padding="md">
                  <CardHeader>
                    <CardTitle>Analyse IA</CardTitle>
                    <span className="text-xs text-info font-mono">Claude Sonnet</span>
                  </CardHeader>
                  <CardBody>
                    <AnalysisPanel
                      score={offer.compatibility_score ?? null}
                      score_details={(offer.score_details ?? {}) as Record<string, unknown>}
                      keywords={offer.keywords ?? []}
                      strengths={offer.strengths ?? []}
                      warnings={offer.warnings ?? []}
                    />
                  </CardBody>
                </Card>
              ) : (
                <Card padding="md">
                  <NoAnalysis onAnalyze={() => analyzeMutation.mutate()} loading={analyzeMutation.isPending} />
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Tab: CV Adapté */}
        {activeTab === 'cv' && (
          <div className="max-w-4xl">
            <DocumentViewer
              offerId={id!}
              type="CV"
              docs={cvDocs}
              keywords={offer.keywords ?? []}
              serif={false}
              onGenerate={handleGenerateCV}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {/* Tab: Lettre de Motivation */}
        {activeTab === 'lettre' && (
          <div className="max-w-4xl">
            <DocumentViewer
              offerId={id!}
              type="COVER_LETTER"
              docs={letterDocs}
              keywords={offer.keywords ?? []}
              serif={true}
              onGenerate={handleGenerateLetter}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {/* Tab: Historique */}
        {activeTab === 'historique' && (
          <div className="max-w-5xl">
            <HistoryTab
              offer={offer}
              notes={notes}
              onNotesChange={setNotes}
              onNotesSave={handleSaveNotes}
              saving={savingNotes}
            />
          </div>
        )}
      </div>
    </div>
  )
}