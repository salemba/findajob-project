import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { jobOffersService, aiService } from '@/services'
import { Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { AnalysisPanel, AnalysisSkeleton } from '@/components/offer'
import type { OfferType, RemoteType, AnalyzeResult } from '@/types'
import toast from 'react-hot-toast'

const SOURCES = ['LinkedIn', 'Indeed', 'Malt', 'Freelance.com', 'APEC', 'Welcome to the Jungle', 'Autre']

// ── Right panel states ────────────────────────────────────────────────────────

function EmptyRightPanel() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-4 text-center
                    border-2 border-dashed border-outline rounded-xl p-8">
      <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
        <Sparkles size={20} className="text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-muted">L'analyse Claude s'affichera ici</p>
        <p className="text-xs text-ink-faint font-mono mt-1">
          Collez une offre et cliquez « Analyser »
        </p>
      </div>
    </div>
  )
}

function AnalyzingPanel() {
  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-outline">
        <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
        <p className="text-xs font-mono text-accent">Claude analyse votre offre…</p>
        <span className="text-xs text-ink-faint font-mono ml-auto">~5–10 s</span>
      </div>
      <AnalysisSkeleton />
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewOfferPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const [rawText,    setRawText]    = useState('')
  const [showFields, setShowFields] = useState(false)
  const [title,      setTitle]      = useState('')
  const [company,    setCompany]    = useState('')
  const [source,     setSource]     = useState('LinkedIn')
  const [sourceUrl,  setSourceUrl]  = useState('')
  const [type,       setType]       = useState<OfferType>('FREELANCE')
  const [remoteType, setRemoteType] = useState<RemoteType>('FULL_REMOTE')
  const [location,   setLocation]   = useState('')
  const [tjmMin,     setTjmMin]     = useState('')
  const [tjmMax,     setTjmMax]     = useState('')

  const [result,    setResult]    = useState<AnalyzeResult | null>(null)
  const [savedId,   setSavedId]   = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const createMutation = useMutation({
    mutationFn: () =>
      jobOffersService.create({
        title:       title.trim()   || 'Sans titre',
        company:     company.trim() || '—',
        raw_text:    rawText,
        source,
        source_url:  sourceUrl.trim() || undefined,
        type,
        remote_type: remoteType,
        location:    location.trim() || undefined,
        tjm_min:     tjmMin ? Number(tjmMin) : undefined,
        tjm_max:     tjmMax ? Number(tjmMax) : undefined,
      }),
  })

  const handleAnalyze = async () => {
    if (!rawText.trim() && !title.trim()) {
      toast.error("Collez le texte de l'offre ou renseignez le titre")
      return
    }
    setAnalyzing(true)
    setResult(null)
    try {
      const offer = await createMutation.mutateAsync()
      setSavedId(offer.id)
      const res = await aiService.analyze(offer.id)
      setResult(res)
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['offers-stats'] })
      toast.success('Analyse terminée !')
    } catch {
      toast.error("Erreur lors de l'analyse IA")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setRawText('')
    setTitle(''); setCompany(''); setSource('LinkedIn'); setSourceUrl('')
    setType('FREELANCE'); setRemoteType('FULL_REMOTE')
    setLocation(''); setTjmMin(''); setTjmMax('')
    setResult(null); setSavedId(null)
  }

  return (
    <div className="p-6 h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/offers')}
          className="p-1.5 rounded hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-display font-bold text-ink">Nouvelle offre</h1>
          <p className="text-xs text-ink-muted font-mono">Collez et laissez Claude analyser</p>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-6xl">

        {/* ── Left : input ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Raw text */}
          <Card padding={false}>
            <CardHeader>
              <CardTitle>Texte de l'offre</CardTitle>
              <span className="text-xs text-ink-faint font-mono">{rawText.length} car.</span>
            </CardHeader>
            <CardBody>
              <textarea
                className="input w-full resize-none font-mono text-xs leading-relaxed"
                rows={18}
                placeholder={`Collez ici le texte complet de l'offre…\n\nExemple :\nArchitecte Data Senior — Acme Corp\nTJM : 600–750 €/j — Full remote\n…`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </CardBody>
          </Card>

          {/* Extra fields (collapsible) */}
          <Card padding={false}>
            <button
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors"
              onClick={() => setShowFields((v) => !v)}
            >
              <span className="text-sm font-medium text-ink-muted">Informations complémentaires</span>
              {showFields
                ? <ChevronUp size={14} className="text-ink-muted" />
                : <ChevronDown size={14} className="text-ink-muted" />}
            </button>
            {showFields && (
              <CardBody className="border-t border-outline pt-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Titre du poste</label>
                  <input className="input w-full text-sm" placeholder="Architecte IA Senior" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="label">Entreprise</label>
                  <input className="input w-full text-sm" placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div>
                  <label className="label">Source</label>
                  <select className="input w-full text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input w-full text-sm" value={type} onChange={(e) => setType(e.target.value as OfferType)}>
                    <option value="FREELANCE">Freelance</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                  </select>
                </div>
                <div>
                  <label className="label">Remote</label>
                  <select className="input w-full text-sm" value={remoteType} onChange={(e) => setRemoteType(e.target.value as RemoteType)}>
                    <option value="FULL_REMOTE">Full remote</option>
                    <option value="HYBRID">Hybride</option>
                    <option value="ON_SITE">Présentiel</option>
                  </select>
                </div>
                <div>
                  <label className="label">TJM min (€)</label>
                  <input className="input w-full font-mono text-sm" type="number" placeholder="500" value={tjmMin} onChange={(e) => setTjmMin(e.target.value)} />
                </div>
                <div>
                  <label className="label">TJM max (€)</label>
                  <input className="input w-full font-mono text-sm" type="number" placeholder="700" value={tjmMax} onChange={(e) => setTjmMax(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Localisation</label>
                  <input className="input w-full text-sm" placeholder="Paris, Lyon, Remote…" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">URL de l'offre</label>
                  <input className="input w-full text-xs font-mono" placeholder="https://…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                </div>
              </CardBody>
            )}
          </Card>

          {/* CTA */}
          <Button
            variant="primary"
            size="md"
            className="w-full"
            loading={analyzing}
            disabled={analyzing || !!result}
            onClick={handleAnalyze}
          >
            <Sparkles size={15} />
            {analyzing ? 'Analyse en cours…' : result ? 'Analysé ✓' : 'Analyser avec Claude'}
          </Button>
        </div>

        {/* ── Right : results ──────────────────────────────────────────────── */}
        <div>
          {!analyzing && !result && <EmptyRightPanel />}
          {analyzing && <AnalyzingPanel />}
          {result && !analyzing && (
            <div className="flex flex-col gap-4">
              {/* Metadata card */}
              <Card padding="md">
                <h2 className="font-display font-semibold text-ink text-sm">
                  {title || 'Offre analysée'}
                </h2>
                {company && <p className="text-xs text-ink-muted font-mono mt-0.5">{company}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="badge badge-gray font-mono">{type}</span>
                  <span className="badge badge-gray font-mono">{remoteType.replace('_', ' ')}</span>
                  {tjmMin && (
                    <span className="badge badge-purple font-mono">
                      {tjmMin}{tjmMax ? `–${tjmMax}` : '+'}€/j
                    </span>
                  )}
                  {location && <span className="badge badge-gray">{location}</span>}
                  {sourceUrl && (
                    <a href={sourceUrl} target="_blank" rel="noreferrer" className="badge badge-blue gap-1">
                      <ExternalLink size={9} /> {source}
                    </a>
                  )}
                </div>
              </Card>

              {/* Analysis panel */}
              <Card padding="md">
                <CardHeader>
                  <CardTitle>Analyse IA</CardTitle>
                  <span className="text-xs text-info font-mono">Claude Sonnet</span>
                </CardHeader>
                <CardBody>
                  <AnalysisPanel
                    score={result.score}
                    score_details={result.score_details as Record<string, unknown>}
                    keywords={result.keywords}
                    strengths={result.strengths}
                    warnings={result.warnings}
                  />
                </CardBody>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => savedId && navigate(`/offers/${savedId}`)}
                >
                  Voir le détail complet →
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Analyser une autre
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}