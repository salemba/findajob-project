import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, Trash2, Send, Bot, ExternalLink,
  MapPin, Briefcase, Monitor, DollarSign, Calendar, Tag
} from 'lucide-react'
import { jobOffersService, aiService, applicationsService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import ScoreBadge from '@/components/ScoreBadge'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import type { JobOfferUpdate, ApplicationCreate } from '@/types'

export default function JobOfferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiResult, setAIResult] = useState<Record<string, unknown> | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const { data: offer, isLoading } = useQuery({
    queryKey: ['job-offer', id],
    queryFn: () => jobOffersService.get(id!),
    enabled: !!id,
  })

  const scoreMutation = useMutation({
    mutationFn: () => jobOffersService.score(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offer', id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => jobOffersService.delete(id!),
    onSuccess: () => {
      toast.success('Offre supprimée')
      navigate('/job-offers')
    },
  })

  const applyMutation = useMutation({
    mutationFn: (data: ApplicationCreate) => applicationsService.create(data),
    onSuccess: (app) => {
      toast.success('Candidature créée !')
      setShowApplyModal(false)
      navigate(`/applications/${app.id}`)
    },
  })

  const handleAIScore = async () => {
    setIsAiLoading(true)
    setShowAIModal(true)
    try {
      const result = await aiService.scoreOffer(id!)
      setAIResult(result)
      queryClient.invalidateQueries({ queryKey: ['job-offer', id] })
    } catch {
      toast.error('Erreur lors du scoring IA')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleAIInterview = async () => {
    setIsAiLoading(true)
    setShowAIModal(true)
    try {
      const result = await aiService.prepareInterview(id!)
      setAIResult(result)
    } catch {
      toast.error('Erreur lors de la préparation entretien')
    } finally {
      setIsAiLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner fullPage text="Chargement..." />
  if (!offer) return <div className="p-6">Offre non trouvée</div>

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{offer.title}</h1>
            <p className="text-lg text-gray-600 mt-0.5">{offer.company}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={offer.status} />
              <ScoreBadge score={offer.ai_score} showLabel size="md" />
              {offer.contract_type && <span className="badge badge-gray">{offer.contract_type}</span>}
              {offer.work_mode && <span className="badge badge-blue">{offer.work_mode}</span>}
              {offer.seniority_level && <span className="badge badge-purple">{offer.seniority_level}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button onClick={handleAIScore} className="btn-secondary text-sm" disabled={scoreMutation.isPending}>
            <Bot size={15} /> Score IA
          </button>
          <button onClick={handleAIInterview} className="btn-secondary text-sm">
            <Bot size={15} /> Prép. entretien
          </button>
          <button onClick={() => setShowApplyModal(true)} className="btn-primary text-sm">
            <Send size={15} /> Créer candidature
          </button>
          <button
            onClick={() => { if (confirm('Supprimer cette offre ?')) deleteMutation.mutate() }}
            className="btn-danger text-sm"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {offer.description && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{offer.description}</ReactMarkdown>
              </div>
            </div>
          )}

          {offer.requirements && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Exigences</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{offer.requirements}</ReactMarkdown>
              </div>
            </div>
          )}

          {offer.tech_stack && offer.tech_stack.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag size={16} /> Stack technique
              </h2>
              <div className="flex flex-wrap gap-2">
                {offer.tech_stack.map((tech) => (
                  <span key={tech} className="badge bg-blue-50 text-blue-800 font-mono text-xs">{tech}</span>
                ))}
              </div>
            </div>
          )}

          {offer.ai_score_details && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Bot size={16} /> Analyse IA
              </h2>
              <div className="space-y-3">
                {offer.ai_score_details.overall_comment && (
                  <p className="text-sm text-gray-700 italic">"{offer.ai_score_details.overall_comment}"</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {offer.ai_score_details.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
                      <span className="text-green-500 mt-0.5">✓</span> {s}
                    </div>
                  ))}
                  {offer.ai_score_details.weaknesses?.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-2">
                      <span className="text-red-500 mt-0.5">✗</span> {w}
                    </div>
                  ))}
                </div>
                {offer.ai_score_details.missing_skills && offer.ai_score_details.missing_skills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Compétences manquantes</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.ai_score_details.missing_skills.map((s, i) => (
                        <span key={i} className="badge badge-red text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Informations</h2>
            {offer.location && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin size={15} className="text-gray-400" /> {offer.location}
              </div>
            )}
            {(offer.salary_min || offer.salary_max) && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <DollarSign size={15} className="text-gray-400" />
                {offer.salary_min && `${offer.salary_min.toLocaleString('fr-FR')} €`}
                {offer.salary_min && offer.salary_max && ' — '}
                {offer.salary_max && `${offer.salary_max.toLocaleString('fr-FR')} €`}
              </div>
            )}
            {offer.posting_date && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar size={15} className="text-gray-400" />
                Publiée le {new Date(offer.posting_date).toLocaleDateString('fr-FR')}
              </div>
            )}
            {offer.source_platform && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Briefcase size={15} className="text-gray-400" /> {offer.source_platform}
              </div>
            )}
            {offer.source_url && (
              <a
                href={offer.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <ExternalLink size={15} /> Voir l'offre originale
              </a>
            )}
          </div>

          {offer.contact_name && (
            <div className="card p-5 space-y-2">
              <h2 className="font-semibold text-gray-900">Contact</h2>
              <p className="text-sm font-medium text-gray-800">{offer.contact_name}</p>
              {offer.contact_email && <p className="text-sm text-gray-600">{offer.contact_email}</p>}
              {offer.contact_phone && <p className="text-sm text-gray-600">{offer.contact_phone}</p>}
            </div>
          )}

          {offer.domains && offer.domains.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Domaines</h2>
              <div className="flex flex-wrap gap-2">
                {offer.domains.map((d) => (
                  <span key={d} className="badge badge-purple">{d}</span>
                ))}
              </div>
            </div>
          )}

          <Link to={`/documents?job_offer_id=${id}`} className="card p-5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <Bot size={18} className="text-primary-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Générer des documents</p>
              <p className="text-xs text-gray-500">CV & lettre de motivation avec IA</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Create Application Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Créer une candidature"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowApplyModal(false)}>Annuler</button>
            <button
              className="btn-primary"
              onClick={() => applyMutation.mutate({ job_offer_id: id!, status: 'Brouillon', priority: 'Moyenne' })}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Création...' : 'Créer la candidature'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Créer une candidature pour <strong>{offer.title}</strong> chez <strong>{offer.company}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          La candidature sera créée en statut "Brouillon". Vous pourrez la compléter et modifier son statut ensuite.
        </p>
      </Modal>

      {/* AI Result Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="Résultat IA" size="lg">
        {isAiLoading ? (
          <LoadingSpinner text="Analyse en cours..." />
        ) : aiResult ? (
          <div className="space-y-4 text-sm">
            <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
