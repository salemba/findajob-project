import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bot, Search, Building2, Star, FileText, Mic, Loader2 } from 'lucide-react'
import { aiService, jobOffersService } from '@/services'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

type Tool = 'parse' | 'score' | 'company' | 'document' | 'interview'

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'parse', label: "Analyser une offre", icon: <Search size={18} />, description: "Extrait les informations structurées d'une offre brute" },
  { id: 'score', label: "Scorer une offre", icon: <Star size={18} />, description: "Évalue une offre selon votre profil avec l'IA" },
  { id: 'company', label: "Analyser entreprise", icon: <Building2 size={18} />, description: "Analyse la réputation et la culture d'une entreprise" },
  { id: 'document', label: "Générer document", icon: <FileText size={18} />, description: "Génère un CV ou une lettre de motivation" },
  { id: 'interview', label: "Préparer entretien", icon: <Mic size={18} />, description: "Questions probables et conseils pour un entretien" },
]

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('parse')
  const [result, setResult] = useState<string | null>(null)
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [offerText, setOfferText] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [docType, setDocType] = useState<'CV' | 'Lettre de motivation'>('Lettre de motivation')
  const [customInstructions, setCustomInstructions] = useState('')

  const { data: offersData } = useQuery({
    queryKey: ['job-offers-ai'],
    queryFn: () => jobOffersService.list({ page_size: 100 }),
  })

  const [loading, setLoading] = useState(false)

  const runTool = async () => {
    setResult(null)
    setLoading(true)
    try {
      switch (activeTool) {
        case 'parse': {
          if (!offerText.trim()) { toast.error('Collez le texte d\'une offre'); return }
          const res = await aiService.parseJobOffer(offerText)
          setResult('```json\n' + JSON.stringify(res, null, 2) + '\n```')
          break
        }
        case 'score': {
          if (!selectedOfferId) { toast.error('Sélectionnez une offre'); return }
          const res = await aiService.scoreOffer(selectedOfferId)
          setResult(`**Score IA: ${res.ai_score}/100**\n\n` +
            (res.ai_score_details
              ? `**Forces:**\n${(res.ai_score_details.strengths || []).map((s: string) => `- ${s}`).join('\n')}\n\n**Faiblesses:**\n${(res.ai_score_details.weaknesses || []).map((w: string) => `- ${w}`).join('\n')}\n\n**Recommandation:** ${res.ai_score_details.recommendation || ''}`
              : JSON.stringify(res, null, 2)))
          break
        }
        case 'company': {
          if (!companyName.trim()) { toast.error('Entrez le nom de l\'entreprise'); return }
          const res = await aiService.analyzeCompany(companyName, position || undefined)
          setResult(res.analysis)
          break
        }
        case 'document': {
          if (!selectedOfferId) { toast.error('Sélectionnez une offre'); return }
          const res = await aiService.generateDocument({
            job_offer_id: selectedOfferId,
            document_type: docType,
            format: 'markdown',
            language: 'fr',
            custom_instructions: customInstructions || undefined,
          })
          setResult(res.content || JSON.stringify(res, null, 2))
          break
        }
        case 'interview': {
          if (!selectedOfferId) { toast.error('Sélectionnez une offre'); return }
          const res = await aiService.prepareInterview(selectedOfferId)
          setResult(res.preparation)
          break
        }
      }
      toast.success('Analyse terminée')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const selectedTool = TOOLS.find((t) => t.id === activeTool)!

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot size={24} className="text-primary-600" /> Outils IA
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Propulsés par Claude</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tool selector */}
        <div className="card p-3 space-y-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setResult(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTool === tool.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={activeTool === tool.id ? 'text-primary-600' : 'text-gray-400'}>
                {tool.icon}
              </span>
              {tool.label}
            </button>
          ))}
        </div>

        {/* Tool workspace */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">{selectedTool.label}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedTool.description}</p>
            </div>

            {/* Parse offer */}
            {activeTool === 'parse' && (
              <div>
                <label className="label">Texte de l'offre *</label>
                <textarea
                  className="input min-h-[200px] font-mono text-sm"
                  placeholder="Collez ici le texte brut de l'offre d'emploi..."
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                />
              </div>
            )}

            {/* Score offer */}
            {activeTool === 'score' && (
              <div>
                <label className="label">Offre à scorer *</label>
                <select
                  className="input"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  <option value="">Sélectionner une offre...</option>
                  {offersData?.items.map((o) => (
                    <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Company analysis */}
            {activeTool === 'company' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom de l'entreprise *</label>
                  <input
                    className="input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Airbus, BNP Paribas..."
                  />
                </div>
                <div>
                  <label className="label">Poste visé</label>
                  <input
                    className="input"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Ex: Architecte IT Senior"
                  />
                </div>
              </div>
            )}

            {/* Generate document */}
            {activeTool === 'document' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Offre *</label>
                    <select
                      className="input"
                      value={selectedOfferId}
                      onChange={(e) => setSelectedOfferId(e.target.value)}
                    >
                      <option value="">Sélectionner une offre...</option>
                      {offersData?.items.map((o) => (
                        <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Type de document</label>
                    <select
                      className="input"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as typeof docType)}
                    >
                      <option>Lettre de motivation</option>
                      <option>CV</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Instructions personnalisées</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Ex: Ton formel, maximum 300 mots, mettre l'accent sur AWS..."
                  />
                </div>
              </div>
            )}

            {/* Interview prep */}
            {activeTool === 'interview' && (
              <div>
                <label className="label">Offre *</label>
                <select
                  className="input"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  <option value="">Sélectionner une offre...</option>
                  {offersData?.items.map((o) => (
                    <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="btn-primary w-full justify-center"
              onClick={runTool}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyse en cours... (peut prendre 10-30s)
                </>
              ) : (
                <><Bot size={16} /> Lancer l'analyse</>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Résultat</h3>
              <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <button
                className="btn-secondary text-xs mt-3"
                onClick={() => navigator.clipboard.writeText(result).then(() => toast.success('Copié !'))}
              >
                Copier le résultat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
