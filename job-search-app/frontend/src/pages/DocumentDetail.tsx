import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, Bot, Download, Edit2, Save } from 'lucide-react'
import { documentsService, aiService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import type { DocumentFormat } from '@/types'

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [improveInstructions, setImproveInstructions] = useState('')
  const [showImprove, setShowImprove] = useState(false)

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsService.get(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: () => documentsService.update(id!, { content: editContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      setIsEditing(false)
      toast.success('Document sauvegardé')
    },
  })

  const improveMutation = useMutation({
    mutationFn: () => aiService.improveDocument(id!, improveInstructions || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      setShowImprove(false)
      toast.success('Document amélioré par IA !')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => documentsService.delete(id!),
    onSuccess: () => {
      toast.success('Document supprimé')
      navigate('/documents')
    },
  })

  const handleExport = async (format: DocumentFormat) => {
    try {
      const blob = await documentsService.exportDocument(id!, format)
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc?.title}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  if (isLoading) return <LoadingSpinner fullPage text="Chargement..." />
  if (!doc) return <div className="p-6">Document non trouvé</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={doc.status} size="sm" />
              <span className="badge badge-gray text-xs">{doc.document_type}</span>
              <span className="badge badge-gray text-xs">{doc.format}</span>
              <span className="text-xs text-gray-400">v{doc.version}</span>
              {doc.ai_tokens_used && (
                <span className="text-xs text-gray-400">· {doc.ai_tokens_used.toLocaleString()} tokens</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => { setEditContent(doc.content || ''); setIsEditing(true) }}
                className="btn-secondary text-sm"
              >
                <Edit2 size={14} /> Éditer
              </button>
              <button onClick={() => setShowImprove(!showImprove)} className="btn-secondary text-sm">
                <Bot size={14} /> Améliorer IA
              </button>
              <div className="relative group">
                <button className="btn-secondary text-sm">
                  <Download size={14} /> Export
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
                  {(['markdown', 'html', 'txt'] as DocumentFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => handleExport(f)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { if (confirm('Supprimer ce document ?')) deleteMutation.mutate() }}
                className="btn-danger text-sm"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary text-sm" onClick={() => setIsEditing(false)}>Annuler</button>
              <button
                className="btn-primary text-sm"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                <Save size={14} /> Sauvegarder
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Improve panel */}
      {showImprove && (
        <div className="card p-4 space-y-3 border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-900">Améliorer avec Claude</p>
          <textarea
            className="input min-h-[60px]"
            placeholder="Instructions d'amélioration (ex: rends le plus percutant, ajoute des métriques...)"
            value={improveInstructions}
            onChange={(e) => setImproveInstructions(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowImprove(false)}>Annuler</button>
            <button
              className="btn-primary text-sm"
              onClick={() => improveMutation.mutate()}
              disabled={improveMutation.isPending}
            >
              {improveMutation.isPending ? 'Amélioration...' : '✨ Améliorer'}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="card">
        {isEditing ? (
          <textarea
            className="w-full p-6 min-h-[600px] font-mono text-sm text-gray-800 resize-y border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        ) : doc.content ? (
          <div className="p-6 prose prose-sm max-w-none">
            <ReactMarkdown>{doc.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 py-16">
            <Bot size={40} className="mx-auto text-gray-300 mb-3" />
            <p>Ce document n'a pas encore de contenu.</p>
          </div>
        )}
      </div>
    </div>
  )
}
