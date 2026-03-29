import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, LayoutGrid, List, Filter } from 'lucide-react'
import { applicationsService, jobOffersService } from '@/services'
import { useApplicationStore } from '@/stores'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'
import type { ApplicationStatus, ApplicationPriority } from '@/types'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

const KANBAN_COLUMNS: ApplicationStatus[] = [
  'Brouillon', 'Envoyée', 'En cours de traitement',
  'Entretien téléphonique', 'Test technique', 'Entretien 1',
  'Entretien 2', 'Entretien 3', 'Offre reçue',
]

const PRIORITY_COLORS: Record<ApplicationPriority, string> = {
  'Faible': 'bg-gray-100 border-gray-200',
  'Moyenne': 'bg-blue-50 border-blue-200',
  'Haute': 'bg-orange-50 border-orange-200',
  'Critique': 'bg-red-50 border-red-200',
}

export default function ApplicationsPage() {
  const { viewMode, setViewMode, filterStatus, setFilterStatus } = useApplicationStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{ job_offer_id: string; priority: ApplicationPriority }>({
    job_offer_id: '',
    priority: 'Moyenne',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['applications', filterStatus],
    queryFn: () => applicationsService.list({ status: filterStatus || undefined, page_size: 100 }),
  })

  const { data: offersData } = useQuery({
    queryKey: ['job-offers-for-apply'],
    queryFn: () => jobOffersService.list({ page_size: 100, status: 'Nouvelle' }),
  })

  const createMutation = useMutation({
    mutationFn: () => applicationsService.create({ job_offer_id: form.job_offer_id, priority: form.priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      setShowModal(false)
      toast.success('Candidature créée !')
    },
  })

  const applications = data?.items || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidatures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} candidature(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx('px-3 py-2', viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx('px-3 py-2', viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
            >
              <List size={16} />
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Nouvelle candidature
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Chargement..." />
      ) : viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Candidature</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Priorité</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date candidature</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prochaine étape</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/applications/${app.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                      {app.job_offer_id}
                    </Link>
                    {app.recruiter_name && <p className="text-xs text-gray-500">{app.recruiter_name}</p>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={app.status} size="sm" /></td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge text-xs', {
                      'badge-gray': app.priority === 'Faible',
                      'badge-blue': app.priority === 'Moyenne',
                      'badge-orange': app.priority === 'Haute',
                      'badge-red': app.priority === 'Critique',
                    })}>
                      {app.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {app.applied_date ? format(parseISO(app.applied_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {app.next_step_date ? format(parseISO(app.next_step_date), 'dd/MM/yyyy') : '—'}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Aucune candidature. Commencez par postuler à une offre !
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban view */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((columnStatus) => {
            const columnApps = applications.filter((a) => a.status === columnStatus)
            return (
              <div key={columnStatus} className="flex-shrink-0 w-56">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {columnStatus}
                  </span>
                  <span className="badge badge-gray text-xs">{columnApps.length}</span>
                </div>
                <div className="space-y-2">
                  {columnApps.map((app) => (
                    <Link
                      key={app.id}
                      to={`/applications/${app.id}`}
                      className={clsx(
                        'block p-3 rounded-lg border text-sm hover:shadow-md transition-shadow',
                        PRIORITY_COLORS[app.priority]
                      )}
                    >
                      <p className="font-medium text-gray-800 text-xs line-clamp-2">{app.job_offer_id.slice(0, 8)}…</p>
                      {app.recruiter_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{app.recruiter_name}</p>
                      )}
                      {app.applied_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          {format(parseISO(app.applied_date), 'dd/MM/yy')}
                        </p>
                      )}
                    </Link>
                  ))}
                  {columnApps.length === 0 && (
                    <div className="h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
                      Vide
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle candidature"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!form.job_offer_id || createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Offre d'emploi *</label>
            <select
              className="input"
              value={form.job_offer_id}
              onChange={(e) => setForm({ ...form, job_offer_id: e.target.value })}
            >
              <option value="">Sélectionner une offre...</option>
              {offersData?.items.map((o) => (
                <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priorité</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as ApplicationPriority })}
            >
              {(['Faible', 'Moyenne', 'Haute', 'Critique'] as ApplicationPriority[]).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
