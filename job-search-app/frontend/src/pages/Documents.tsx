import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Bot, FileText } from 'lucide-react'
import { documentsService, aiService, jobOffersService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'
import type { DocumentType, DocumentFormat, DocumentGenerateRequest } from '@/types'
import { format, parseISO } from 'date-fns'

const DOC_TYPES: DocumentType[] = ['CV', 'Lettre de motivation', 'Portfolio', 'Autre']

export default function DocumentsPage() {
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genForm, setGenForm] = useState<Partial<DocumentGenerateRequest>>({
    document_type: 'Lettre de motivation',
    format: 'markdown',
    language: 'fr',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.list({ page_size: 50 }),
  })

  const { data: offersData } = useQuery({
    queryKey: ['job-offers-for-docs'],
    queryFn: () => jobOffersService.list({ page_size: 100 }),
  })

  const generateMutation = useMutation({
    mutationFn: (req: DocumentGenerateRequest) => aiService.generateDocument(req),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setShowGenerateModal(false)
      toast.success('Document généré avec succès !')
    },
    onError: () => toast.error('Erreur lors de la génération'),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} document(s)</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
          <Bot size={16} /> Générer avec IA
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Chargement..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.items.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="card p-4 hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <FileText size={16} className="text-primary-600" />
                </div>
                <StatusBadge status={doc.status} size="sm" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm line-clamp-2">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{doc.document_type}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="badge badge-gray">{doc.format}</span>
                <span>v{doc.version}</span>
              </div>
              <p className="text-xs text-gray-400">
                {format(parseISO(doc.created_at), 'dd/MM/yyyy')}
                {doc.ai_tokens_used && ` · ${doc.ai_tokens_used.toLocaleString()} tokens`}
              </p>
            </Link>
          ))}
          {data?.items.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500">
              <Bot size={40} className="mx-auto text-gray-300 mb-3" />
              <p>Aucun document. Générez votre premier CV ou lettre de motivation !</p>
            </div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Générer un document avec Claude AI"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowGenerateModal(false)}>Annuler</button>
            <button
              className="btn-primary"
              onClick={() => genForm.job_offer_id && generateMutation.mutate(genForm as DocumentGenerateRequest)}
              disabled={!genForm.job_offer_id || generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Génération en cours...' : '✨ Générer'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type de document *</label>
              <select
                className="input"
                value={genForm.document_type || 'Lettre de motivation'}
                onChange={(e) => setGenForm({ ...genForm, document_type: e.target.value as DocumentType })}
              >
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Format</label>
              <select
                className="input"
                value={genForm.format || 'markdown'}
                onChange={(e) => setGenForm({ ...genForm, format: e.target.value as DocumentFormat })}
              >
                {(['markdown', 'html', 'txt'] as DocumentFormat[]).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Offre d'emploi *</label>
            <select
              className="input"
              value={genForm.job_offer_id || ''}
              onChange={(e) => setGenForm({ ...genForm, job_offer_id: e.target.value })}
            >
              <option value="">Sélectionner une offre...</option>
              {offersData?.items.map((o) => (
                <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Langue</label>
            <select
              className="input"
              value={genForm.language || 'fr'}
              onChange={(e) => setGenForm({ ...genForm, language: e.target.value as 'fr' | 'en' })}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="label">Instructions personnalisées</label>
            <textarea
              className="input min-h-[80px]"
              value={genForm.custom_instructions || ''}
              onChange={(e) => setGenForm({ ...genForm, custom_instructions: e.target.value })}
              placeholder="Ex: Mettre l'accent sur mon expérience AWS, ton décontracté, 300 mots max..."
            />
          </div>
          {generateMutation.isPending && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <p className="text-sm text-blue-800">Claude génère votre document... (10-30s)</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
