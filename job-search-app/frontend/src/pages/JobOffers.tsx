import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, RefreshCw, Star } from 'lucide-react'
import { jobOffersService } from '@/services'
import { useJobOfferStore } from '@/stores'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import ScoreBadge from '@/components/ScoreBadge'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import type { JobOfferCreate, ContractType, WorkMode, SeniorityLevel } from '@/types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const CONTRACT_TYPES: ContractType[] = ['CDI', 'CDD', 'Freelance', 'Intérim', 'Alternance', 'Stage', 'Autre']
const WORK_MODES: WorkMode[] = ['Présentiel', 'Télétravail', 'Hybride']
const SENIORITY_LEVELS: SeniorityLevel[] = ['Junior', 'Confirmé', 'Senior', 'Lead', 'Principal', 'Architecte', 'Directeur']

export default function JobOffersPage() {
  const { filters, setFilters } = useJobOfferStore()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['job-offers', filters, search],
    queryFn: () => jobOffersService.list({ ...filters, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: jobOffersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] })
      setShowModal(false)
      toast.success('Offre ajoutée !')
    },
  })

  const [form, setForm] = useState<Partial<JobOfferCreate>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.company) return
    createMutation.mutate(form as JobOfferCreate)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offres d'emploi</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} offre(s)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Ajouter une offre
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.status || ''}
          onChange={(e) => setFilters({ status: e.target.value as never || undefined })}
        >
          <option value="">Tous les statuts</option>
          {['Nouvelle', 'Sauvegardée', 'Candidatée', 'Ignorée', 'Expirée'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.work_mode || ''}
          onChange={(e) => setFilters({ work_mode: e.target.value || undefined })}
        >
          <option value="">Mode de travail</option>
          {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          className="input w-auto"
          value={filters.contract_type || ''}
          onChange={(e) => setFilters({ contract_type: e.target.value || undefined })}
        >
          <option value="">Type de contrat</option>
          {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="input w-auto"
          value={filters.order_by || 'created_at'}
          onChange={(e) => setFilters({ order_by: e.target.value })}
        >
          <option value="created_at">Plus récentes</option>
          <option value="ai_score">Score IA</option>
          <option value="company">Entreprise</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner text="Chargement des offres..." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Poste / Entreprise</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Localisation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Contrat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Score IA</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ajoutée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items.map((offer) => (
                <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/job-offers/${offer.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                      {offer.title}
                    </Link>
                    <p className="text-xs text-gray-500">{offer.company}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{offer.location || '—'}</td>
                  <td className="px-4 py-3">
                    {offer.contract_type ? <span className="badge badge-gray">{offer.contract_type}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {offer.work_mode ? <span className="badge badge-blue">{offer.work_mode}</span> : '—'}
                  </td>
                  <td className="px-4 py-3"><ScoreBadge score={offer.ai_score} size="sm" /></td>
                  <td className="px-4 py-3"><StatusBadge status={offer.status} size="sm" /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(parseISO(offer.created_at), 'dd/MM/yyyy')}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Aucune offre trouvée. Ajoutez votre première offre !
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {data.page} / {data.pages} — {data.total} offres
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs"
                  disabled={data.page === 1}
                  onClick={() => setFilters({ page: data.page - 1 })}
                >Précédent</button>
                <button
                  className="btn-secondary text-xs"
                  disabled={data.page === data.pages}
                  onClick={() => setFilters({ page: data.page + 1 })}
                >Suivant</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Ajouter une offre"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Création...' : 'Créer'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Titre du poste *"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Architecte Solutions Senior"
              required
            />
            <Input
              label="Entreprise *"
              value={form.company || ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="ACME Corp"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Localisation"
              value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Paris, France"
            />
            <Input
              label="URL de l'offre"
              value={form.source_url || ''}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Type de contrat</label>
              <select
                className="input"
                value={form.contract_type || ''}
                onChange={(e) => setForm({ ...form, contract_type: e.target.value as ContractType || undefined })}
              >
                <option value="">—</option>
                {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mode de travail</label>
              <select
                className="input"
                value={form.work_mode || ''}
                onChange={(e) => setForm({ ...form, work_mode: e.target.value as WorkMode || undefined })}
              >
                <option value="">—</option>
                {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Niveau</label>
              <select
                className="input"
                value={form.seniority_level || ''}
                onChange={(e) => setForm({ ...form, seniority_level: e.target.value as SeniorityLevel || undefined })}
              >
                <option value="">—</option>
                {SENIORITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Salaire min (€)"
              type="number"
              value={form.salary_min || ''}
              onChange={(e) => setForm({ ...form, salary_min: Number(e.target.value) || undefined })}
              placeholder="80000"
            />
            <Input
              label="Salaire max (€)"
              type="number"
              value={form.salary_max || ''}
              onChange={(e) => setForm({ ...form, salary_max: Number(e.target.value) || undefined })}
              placeholder="120000"
            />
          </div>
          <div>
            <label className="label">Stack technique (séparée par des virgules)</label>
            <input
              className="input"
              placeholder="Python, AWS, Kubernetes, PostgreSQL"
              value={(form.tech_stack || []).join(', ')}
              onChange={(e) => setForm({ ...form, tech_stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description du poste..."
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
