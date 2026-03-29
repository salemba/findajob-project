export type ApplicationStatus =
  | 'Brouillon'
  | 'Envoyée'
  | 'En cours de traitement'
  | 'Entretien téléphonique'
  | 'Test technique'
  | 'Entretien 1'
  | 'Entretien 2'
  | 'Entretien 3'
  | 'Offre reçue'
  | 'Offre acceptée'
  | 'Offre refusée'
  | 'Rejetée'
  | 'Retirée'
  | 'Sans réponse'

export type ApplicationPriority = 'Faible' | 'Moyenne' | 'Haute' | 'Critique'

export interface TimelineEvent {
  date: string
  event: string
  description?: string
  icon?: string
}

export interface InterviewNote {
  date: string
  interviewer?: string
  type?: string
  notes: string
  outcome?: string
}

export interface Application {
  id: string
  job_offer_id: string
  status: ApplicationStatus
  priority: ApplicationPriority
  applied_date: string | null
  follow_up_date: string | null
  next_step_date: string | null
  next_step_description: string | null
  cover_letter_sent: boolean
  cv_version: string | null
  application_method: string | null
  recruiter_name: string | null
  recruiter_email: string | null
  recruiter_phone: string | null
  recruiter_linkedin: string | null
  salary_expected: number | null
  salary_offered: number | null
  notes: string | null
  feedback: string | null
  interview_notes: InterviewNote[]
  timeline: TimelineEvent[]
  created_at: string
  updated_at: string
}

export interface ApplicationListItem {
  id: string
  job_offer_id: string
  status: ApplicationStatus
  priority: ApplicationPriority
  applied_date: string | null
  follow_up_date: string | null
  next_step_date: string | null
  recruiter_name: string | null
  created_at: string
}

export interface ApplicationCreate {
  job_offer_id: string
  status?: ApplicationStatus
  priority?: ApplicationPriority
  applied_date?: string
  follow_up_date?: string
  next_step_date?: string
  next_step_description?: string
  cover_letter_sent?: boolean
  cv_version?: string
  application_method?: string
  recruiter_name?: string
  recruiter_email?: string
  recruiter_phone?: string
  recruiter_linkedin?: string
  salary_expected?: number
  notes?: string
}

export type ApplicationUpdate = Partial<ApplicationCreate & {
  salary_offered?: number
  feedback?: string
  interview_notes?: InterviewNote[]
  timeline?: TimelineEvent[]
}>

export interface ApplicationStatusUpdate {
  status: ApplicationStatus
  notes?: string
  event_description?: string
}
