import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, FileCheck2, Download, Trash2, RefreshCcw, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { jobOffersService } from '@/services'
import { useDocumentsStore } from '@/stores'
import { Button, Card, CardBody, CardHeader, CardTitle, ValidatedBadge, FullPageSpinner, Modal } from '@/components/ui'
import type { JobOffer } from '@/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const { fetchByOffer, generateCV, generateCoverLetter, exportDocument, validateDocument, deleteDocument, regenerate, isGenerating, byOffer } = useDocumentsStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [exportModal, setExportModal] = useState<{ open: boolean; docId: string | null }>({ open: false, docId: null })

  const { data, isLoading } = useQuery({
    queryKey: ['offers-all'],
    queryFn: () => jobOffersService.list({ page_size: 200, order_by: 'created_at', order_desc: true }),
  })

  const offers = data?.items ?? []

  const toggleExpand = async (offerId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(offerId)) {
        next.delete(offerId)
      } else {
        next.add(offerId)
        if (!byOffer[offerId]) {
          fetchByOffer(offerId)
        }
      }
      return next
    })
  }

  const handleGenerateCV = async (offer: JobOffer) => {
    await generateCV(offer.id)
    setExpanded((prev) => new Set(prev).add(offer.id))
  }

  const handleGenerateLetter = async (offer: JobOffer) => {
    await generateCoverLetter(offer.id)
    setExpanded((prev) => new Set(prev).add(offer.id))
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!exportModal.docId) return
    await exportDocument(exportModal.docId, format)
    setExportModal({ open: false, docId: null })
  }

  if (isLoading) return <FullPageSpinner text="Chargement…" />

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-bold text-ink">Documents</h1>
        <p className="text-xs text-ink-muted font-mono">{offers.length} offres</p>
      </div>

      {offers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-muted font-mono">Aucune offre.</p>
          <Link to="/offers/new">
            <Button variant="primary" size="sm">+ Nouvelle offre</Button>
          </Link>
        </div>
      )}

      {offers.map((offer) => {
        const isOpen = expanded.has(offer.id)
        const docs = byOffer[offer.id] ?? []

        return (
          <Card key={offer.id} padding={false}>
            {/* Offer row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => toggleExpand(offer.id)}
            >
              <span className="text-ink-muted transition-transform">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{offer.title}</p>
                <p className="text-xs text-ink-muted font-mono">{offer.company}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-mono text-ink-faint">
                  {docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? 's' : ''}` : ''}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleGenerateCV(offer)}
                  loading={isGenerating}
                  title="Générer CV"
                >
                  <FileText size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleGenerateLetter(offer)}
                  loading={isGenerating}
                  title="Générer LM"
                >
                  <FileCheck2 size={12} />
                </Button>
                <Link to={`/offers/${offer.id}`}>
                  <Button variant="ghost" size="xs" title="Voir l'offre">→</Button>
                </Link>
              </div>
            </div>

            {/* Documents list */}
            {isOpen && (
              <div className="border-t border-outline px-4 py-3 space-y-2">
                {docs.length === 0 ? (
                  <p className="text-xs text-ink-faint font-mono py-2 text-center">
                    Aucun document — cliquez sur <FileText size={11} className="inline" /> ou <FileCheck2 size={11} className="inline" /> pour générer
                  </p>
                ) : docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 bg-surface-2 rounded px-3 py-2">
                    <span className={clsx('badge text-xs', doc.type === 'CV' ? 'badge-blue' : 'badge-purple')}>
                      {doc.type === 'CV' ? 'CV' : 'LM'}
                    </span>
                    <span className="text-xs font-mono text-ink-faint">v{doc.version}</span>
                    <ValidatedBadge validated={doc.is_validated} />
                    {doc.model_used && (
                      <span className="text-xs font-mono text-ink-faint hidden sm:inline">{doc.model_used}</span>
                    )}
                    <span className="text-xs font-mono text-ink-faint flex-1">
                      {format(parseISO(doc.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                    </span>
                    <div className="flex gap-1">
                      {!doc.is_validated && (
                        <button
                          onClick={() => validateDocument(doc.id, offer.id)}
                          className="p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-ok transition-colors"
                          title="Valider"
                        >
                          <CheckCircle2 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => regenerate(doc.id, offer.id)}
                        className="p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors"
                        title="Régénérer"
                      >
                        <RefreshCcw size={13} />
                      </button>
                      <button
                        onClick={() => setExportModal({ open: true, docId: doc.id })}
                        className="p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors"
                        title="Exporter"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id, offer.id)}
                        className="p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-fail transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {/* Export modal */}
      <Modal
        isOpen={exportModal.open}
        onClose={() => setExportModal({ open: false, docId: null })}
        title="Format d'export"
        size="sm"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setExportModal({ open: false, docId: null })}>
            Annuler
          </Button>
        }
      >
        <div className="flex gap-3">
          <Button variant="primary" size="md" className="flex-1" onClick={() => handleExport('pdf')}>
            <Download size={14} /> PDF
          </Button>
          <Button variant="secondary" size="md" className="flex-1" onClick={() => handleExport('docx')}>
            <Download size={14} /> DOCX
          </Button>
        </div>
      </Modal>
    </div>
  )
}
