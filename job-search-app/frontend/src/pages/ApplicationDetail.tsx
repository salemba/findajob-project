import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, ChevronDown, Plus } from 'lucide-react'
import { applicationsService, jobOffersService } from '@/services'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import toast from 'react-hot-toast'
import type { ApplicationStatus, ApplicationUpdate, InterviewNote } from '@/types'
import { format, parseISO } from 'date-fns'

const ALL_STATUSES: ApplicationStatus[] = [
  'Brouillon', 'Envoyée', 'En cours de traitement', 'Entretien téléphonique',
  'Test technique', 'Entretien 1', 'Entretien 2', 'Entretien 3',
  'Offre reçue', 'Offre acceptée', 'Offre refusée', 'Rejetée', 'Retirée', 'Sans réponse',
]

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editForm, setEditForm] = useState<ApplicationUpdate>({})
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewForm, setInterviewForm] = useState<Partial<InterviewNote>>({})

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsService.get(id!),
    enabled: !!id,
  })

  const { data: offer } = useQuery({
    queryKey: ['job-offer', app?.job_offer_id],
    queryFn: () => jobOffersService.get(app!.job_offer_id),
    enabled: !!app?.job_offer_id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: ApplicationUpdate) => applicationsService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      toast.success('Candidature mise à jour')
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      applicationsService.updateStatus(id!, { status, event_description: `Statut changé en ${status}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      toast.success('Statut mis à jour')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => applicationsService.delete(id!),
    onSuccess: () => {
      toast.success('Candidature supprimée')
      navigate('/applications')
    },
  })

  const addInterviewNote = () => {
    if (!app || !interviewForm.notes) return
    const newNote: InterviewNote = {
      date: new Date().toISOString(),
      notes: interviewForm.notes,
      interviewer: interviewForm.interviewer,
      type: interviewForm.type,
      outcome: interviewForm.outcome,
    }
    updateMutation.mutate({ interview_notes: [...(app.interview_notes || []), newNote] })
    setShowInterviewModal(false)
    setInterviewForm({})
  }

  if (isLoading) return <LoadingSpinner fullPage text="Chargement..." />
  if (!app) return <div className="p-6">Candidature non trouvée</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {offer ? `${offer.title} — ${offer.company}` : 'Candidature'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={app.status} />
              <span className={`badge text-xs ${
                app.priority === 'Critique' ? 'badge-red' :
                app.priority === 'Haute' ? 'badge-orange' :
                app.priority === 'Moyenne' ? 'badge-blue' : 'badge-gray'
              }`}>{app.priority}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status change dropdown */}
          <div className="relative group">
            <button className="btn-secondary text-sm flex items-center gap-1">
              Changer statut <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => statusMutation.mutate(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Supprimer cette candidature ?')) deleteMutation.mutate() }}
            className="btn-danger text-sm"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Détails</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date de candidature"
                type="date"
                defaultValue={app.applied_date || ''}
                onBlur={(e) => e.target.value !== (app.applied_date || '') && updateMutation.mutate({ applied_date: e.target.value || undefined })}
              />
              <Input
                label="Date de relance"
                type="date"
                defaultValue={app.follow_up_date || ''}
                onBlur={(e) => e.target.value !== (app.follow_up_date || '') && updateMutation.mutate({ follow_up_date: e.target.value || undefined })}
              />
              <Input
                label="Prochaine étape"
                type="date"
                defaultValue={app.next_step_date || ''}
                onBlur={(e) => e.target.value !== (app.next_step_date || '') && updateMutation.mutate({ next_step_date: e.target.value || undefined })}
              />
              <Input
                label="Description prochaine étape"
                defaultValue={app.next_step_description || ''}
                onBlur={(e) => e.target.value !== (app.next_step_description || '') && updateMutation.mutate({ next_step_description: e.target.value || undefined })}
              />
              <Input
                label="Recruteur"
                defaultValue={app.recruiter_name || ''}
                onBlur={(e) => e.target.value !== (app.recruiter_name || '') && updateMutation.mutate({ recruiter_name: e.target.value || undefined })}
              />
              <Input
                label="Email recruteur"
                type="email"
                defaultValue={app.recruiter_email || ''}
                onBlur={(e) => e.target.value !== (app.recruiter_email || '') && updateMutation.mutate({ recruiter_email: e.target.value || undefined })}
              />
              <Input
                label="Salaire attendu (€)"
                type="number"
                defaultValue={app.salary_expected?.toString() || ''}
                onBlur={(e) => updateMutation.mutate({ salary_expected: Number(e.target.value) || undefined })}
              />
              <Input
                label="Salaire proposé (€)"
                type="number"
                defaultValue={app.salary_offered?.toString() || ''}
                onBlur={(e) => updateMutation.mutate({ salary_offered: Number(e.target.value) || undefined })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input min-h-[80px]"
                defaultValue={app.notes || ''}
                onBlur={(e) => e.target.value !== (app.notes || '') && updateMutation.mutate({ notes: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Retour / Feedback</label>
              <textarea
                className="input min-h-[80px]"
                defaultValue={app.feedback || ''}
                onBlur={(e) => e.target.value !== (app.feedback || '') && updateMutation.mutate({ feedback: e.target.value })}
              />
            </div>
          </div>

          {/* Interview notes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Notes d'entretien</h2>
              <button onClick={() => setShowInterviewModal(true)} className="btn-secondary text-xs">
                <Plus size={14} /> Ajouter
              </button>
            </div>
            {app.interview_notes?.length ? (
              <div className="space-y-3">
                {app.interview_notes.map((note, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{note.interviewer || 'Entretien'} {note.type && `· ${note.type}`}</span>
                      <span>{format(parseISO(note.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <p className="text-gray-700">{note.notes}</p>
                    {note.outcome && <p className="text-xs text-gray-500 font-medium">Résultat: {note.outcome}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune note d'entretien.</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
          {app.timeline?.length ? (
            <div className="space-y-3">
              {[...app.timeline].reverse().map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{event.event}</p>
                    {event.description && <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(event.date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun événement.</p>
          )}
        </div>
      </div>

      {/* Interview note modal */}
      <Modal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        title="Ajouter une note d'entretien"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowInterviewModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={addInterviewNote} disabled={!interviewForm.notes}>
              Ajouter
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Intervieweur"
              value={interviewForm.interviewer || ''}
              onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
            />
            <Input
              label="Type d'entretien"
              value={interviewForm.type || ''}
              onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value })}
              placeholder="Technique, RH, Manager..."
            />
          </div>
          <div>
            <label className="label">Notes *</label>
            <textarea
              className="input min-h-[100px]"
              value={interviewForm.notes || ''}
              onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
              placeholder="Questions posées, impressions, points clés..."
            />
          </div>
          <Input
            label="Résultat / Outcome"
            value={interviewForm.outcome || ''}
            onChange={(e) => setInterviewForm({ ...interviewForm, outcome: e.target.value })}
            placeholder="Positif, En attente, Refus..."
          />
        </div>
      </Modal>
    </div>
  )
}
