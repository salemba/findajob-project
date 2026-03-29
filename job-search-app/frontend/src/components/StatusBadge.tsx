import clsx from 'clsx'
import type { JobOfferStatus, ApplicationStatus, DocumentStatus } from '@/types'

type Status = JobOfferStatus | ApplicationStatus | DocumentStatus | string

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Job offer statuses
  'Nouvelle': { label: 'Nouvelle', className: 'badge-blue' },
  'Sauvegardée': { label: 'Sauvegardée', className: 'badge-purple' },
  'Candidatée': { label: 'Candidatée', className: 'badge-green' },
  'Ignorée': { label: 'Ignorée', className: 'badge-gray' },
  'Expirée': { label: 'Expirée', className: 'badge-red' },
  // Application statuses
  'Brouillon': { label: 'Brouillon', className: 'badge-gray' },
  'Envoyée': { label: 'Envoyée', className: 'badge-blue' },
  'En cours de traitement': { label: 'En traitement', className: 'badge-yellow' },
  'Entretien téléphonique': { label: 'Tél.', className: 'badge-purple' },
  'Test technique': { label: 'Test tech.', className: 'badge-orange' },
  'Entretien 1': { label: 'Entretien 1', className: 'badge-purple' },
  'Entretien 2': { label: 'Entretien 2', className: 'badge-purple' },
  'Entretien 3': { label: 'Entretien 3', className: 'badge-purple' },
  'Offre reçue': { label: 'Offre reçue', className: 'badge-green' },
  'Offre acceptée': { label: 'Acceptée ✓', className: 'badge-green' },
  'Offre refusée': { label: 'Refusée', className: 'badge-red' },
  'Rejetée': { label: 'Rejetée', className: 'badge-red' },
  'Retirée': { label: 'Retirée', className: 'badge-gray' },
  'Sans réponse': { label: 'Sans réponse', className: 'badge-gray' },
  // Document statuses
  'En génération': { label: 'Génération...', className: 'badge-yellow' },
  'Prêt': { label: 'Prêt', className: 'badge-green' },
  'Envoyé': { label: 'Envoyé', className: 'badge-blue' },
  'Archivé': { label: 'Archivé', className: 'badge-gray' },
}

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge-gray' }
  return (
    <span className={clsx(config.className, size === 'sm' && 'text-[11px] px-2 py-0.5')}>
      {config.label}
    </span>
  )
}
