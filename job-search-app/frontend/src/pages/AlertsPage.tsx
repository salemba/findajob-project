import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Play, Trash2, Pencil, ToggleLeft, ToggleRight, Clock, Tag, Globe } from 'lucide-react'
import { alertsService } from '@/services'
import { Button, Card, CardBody, CardHeader, CardTitle, FullPageSpinner, Modal } from '@/components/ui'
import type { AlertConfig, AlertConfigCreate, AlertMatch } from '@/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const PLATFORM_OPTIONS = ['LinkedIn', 'Indeed', 'Malt', 'Freelance.com', 'APEC', 'Welcome to the Jungle']

const DEFAULT_FORM: AlertConfigCreate = {
  keywords: [],
  platforms: [],
  min_tjm: undefined,
  remote_only: false,
  check_interval_hours: 24,
}

export default function AlertsPage() {
  const queryClient = useQueryClient()
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<AlertConfig | null>(null)
  const [resultsModal, setResultsModal] = useState<{ open: boolean; matches: AlertMatch[]; configId: string | null }>({
    open: false, matches: [], configId: null,
  })
  const [form, setForm] = useState<AlertConfigCreate>(DEFAULT_FORM)
  const [keywordInput, setKeywordInput] = useState('')

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsService.list,
  })

  const createMutation = useMutation({
    mutationFn: (data: AlertConfigCreate) => alertsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alerte créée')
      setCreateModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AlertConfig> }) =>
      alertsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alerte mise à jour')
      setEditModal(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alerte supprimée')
    },
  })

  const runMutation = useMutation({
    mutationFn: (id: string) => alertsService.run(id),
    onSuccess: (matches, id) => {
      setResultsModal({ open: true, matches, configId: id })
      toast.success(`${matches.length} offre(s) trouvée(s)`)
    },
    onError: () => toast.error("Erreur lors de l'exécution"),
  })

  const resetForm = () => {
    setForm(DEFAULT_FORM)
    setKeywordInput('')
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (!kw) return
    if (!form.keywords?.includes(kw)) {
      setForm((f) => ({ ...f, keywords: [...(f.keywords ?? []), kw] }))
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) =>
    setForm((f) => ({ ...f, keywords: f.keywords?.filter((k) => k !== kw) ?? [] }))

  const togglePlatform = (p: string) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms?.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...(f.platforms ?? []), p],
    }))

  const openEdit = (alert: AlertConfig) => {
    setForm({
      keywords: alert.keywords ?? [],
      platforms: alert.platforms ?? [],
      min_tjm: alert.min_tjm,
      remote_only: alert.remote_only,
      check_interval_hours: alert.check_interval_hours,
    })
    setEditModal(alert)
  }

  if (isLoading) return <FullPageSpinner text="Chargement des alertes…" />

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-ink">Alertes</h1>
          <p className="text-xs text-ink-muted font-mono">{alerts.length} configuration(s)</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setCreateModal(true) }}>
          <Plus size={14} /> Nouvelle alerte
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-ink-muted font-mono">Aucune alerte configurée.</p>
          <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>
            <Plus size={14} /> Créer la première alerte
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} padding="md">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5">
                      {alert.keywords?.map((kw) => (
                        <span key={kw} className="badge badge-accent flex items-center gap-1">
                          <Tag size={9} /> {kw}
                        </span>
                      ))}
                      {!alert.keywords?.length && (
                        <span className="text-xs text-ink-faint font-mono">Aucun mot-clé</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 text-xs font-mono text-ink-muted">
                      {alert.platforms?.length ? (
                        <span className="flex items-center gap-1">
                          <Globe size={11} /> {alert.platforms.join(', ')}
                        </span>
                      ) : null}
                      {alert.min_tjm != null && (
                        <span>TJM min: {alert.min_tjm}€/j</span>
                      )}
                      {alert.remote_only && (
                        <span className="badge badge-blue">Remote only</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {alert.check_interval_hours}h
                      </span>
                      {alert.last_checked_at && (
                        <span className="text-ink-faint">
                          Dernier run: {format(parseISO(alert.last_checked_at), 'dd/MM/yy HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateMutation.mutate({ id: alert.id, data: { is_active: !alert.is_active } })}
                      className={clsx('transition-colors', alert.is_active ? 'text-ok' : 'text-ink-faint hover:text-ok')}
                      title={alert.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {alert.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => runMutation.mutate(alert.id)}
                      loading={runMutation.isPending}
                      title="Lancer maintenant"
                    >
                      <Play size={13} className="text-accent" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => openEdit(alert)}
                      title="Modifier"
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => deleteMutation.mutate(alert.id)}
                      loading={deleteMutation.isPending}
                      title="Supprimer"
                    >
                      <Trash2 size={13} className="text-fail" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <AlertFormModal
        isOpen={createModal || !!editModal}
        onClose={() => { setCreateModal(false); setEditModal(null); resetForm() }}
        isEdit={!!editModal}
        form={form}
        setForm={setForm}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        addKeyword={addKeyword}
        removeKeyword={removeKeyword}
        togglePlatform={togglePlatform}
        onSubmit={() => {
          if (editModal) {
            updateMutation.mutate({ id: editModal.id, data: form })
          } else {
            createMutation.mutate(form)
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Results modal */}
      <Modal
        isOpen={resultsModal.open}
        onClose={() => setResultsModal({ open: false, matches: [], configId: null })}
        title={`Résultats — ${resultsModal.matches.length} offre(s) trouvée(s)`}
        size="lg"
      >
        {resultsModal.matches.length === 0 ? (
          <p className="text-sm text-ink-muted font-mono text-center py-6">Aucune offre ne correspond à cette alerte.</p>
        ) : (
          <div className="space-y-2">
            {resultsModal.matches.map((m) => (
              <div key={m.id} className="bg-surface-2 rounded px-3 py-2">
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink-muted font-mono">{m.company}</p>
                <div className="flex gap-2 mt-1 text-xs font-mono text-ink-faint">
                  {m.tjm_min != null && <span>{m.tjm_min}{m.tjm_max ? `–${m.tjm_max}` : '+'}€/j</span>}
                  {m.remote_type && <span>{m.remote_type}</span>}
                  {m.location && <span>{m.location}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function AlertFormModal({
  isOpen, onClose, isEdit, form, setForm,
  keywordInput, setKeywordInput, addKeyword, removeKeyword, togglePlatform,
  onSubmit, isPending,
}: {
  isOpen: boolean
  onClose: () => void
  isEdit: boolean
  form: AlertConfigCreate
  setForm: (fn: (f: AlertConfigCreate) => AlertConfigCreate) => void
  keywordInput: string
  setKeywordInput: (v: string) => void
  addKeyword: () => void
  removeKeyword: (kw: string) => void
  togglePlatform: (p: string) => void
  onSubmit: () => void
  isPending: boolean
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier l\'alerte' : 'Nouvelle alerte'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="primary" size="sm" onClick={onSubmit} loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Keywords */}
        <div>
          <label className="label">Mots-clés</label>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-xs"
              placeholder="Ex: React, Python, Data…"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <Button variant="secondary" size="sm" onClick={addKeyword}>+</Button>
          </div>
          {form.keywords && form.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.keywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => removeKeyword(kw)}
                  className="badge badge-blue cursor-pointer hover:opacity-70 transition-opacity"
                >
                  {kw} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Platforms */}
        <div>
          <label className="label">Plateformes</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={clsx(
                  'text-xs px-2.5 py-1 rounded border transition-colors font-mono',
                  form.platforms?.includes(p)
                    ? 'bg-accent border-accent text-white'
                    : 'border-outline text-ink-muted hover:border-ink-muted'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* TJM + interval */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">TJM min (€/jour)</label>
            <input
              className="input w-full font-mono"
              type="number"
              placeholder="500"
              value={form.min_tjm ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, min_tjm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="label">Intervalle (heures)</label>
            <input
              className="input w-full font-mono"
              type="number"
              min={1}
              placeholder="24"
              value={form.check_interval_hours ?? 24}
              onChange={(e) => setForm((f) => ({ ...f, check_interval_hours: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Remote only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-accent"
            checked={form.remote_only ?? false}
            onChange={(e) => setForm((f) => ({ ...f, remote_only: e.target.checked }))}
          />
          <span className="text-sm text-ink-muted font-mono">Remote uniquement</span>
        </label>
      </div>
    </Modal>
  )
}
