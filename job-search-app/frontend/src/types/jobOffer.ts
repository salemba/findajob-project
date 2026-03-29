export type ContractType = 'CDI' | 'CDD' | 'Freelance' | 'Intérim' | 'Alternance' | 'Stage' | 'Autre'
export type WorkMode = 'Présentiel' | 'Télétravail' | 'Hybride'
export type JobOfferStatus = 'Nouvelle' | 'Sauvegardée' | 'Candidatée' | 'Ignorée' | 'Expirée'
export type SeniorityLevel = 'Junior' | 'Confirmé' | 'Senior' | 'Lead' | 'Principal' | 'Architecte' | 'Directeur'

export interface JobOffer {
  id: string
  title: string
  company: string
  location: string | null
  description: string | null
  requirements: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  contract_type: ContractType | null
  work_mode: WorkMode | null
  seniority_level: SeniorityLevel | null
  status: JobOfferStatus
  source_url: string | null
  source_platform: string | null
  posting_date: string | null
  expiry_date: string | null
  tech_stack: string[]
  domains: string[]
  ai_score: number | null
  ai_score_details: AiScoreDetails | null
  notes: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface AiScoreDetails {
  technical_match?: number
  experience_match?: number
  domain_match?: number
  salary_match?: number
  location_match?: number
  overall_comment?: string
  strengths?: string[]
  weaknesses?: string[]
  missing_skills?: string[]
  recommendation?: string
  scores?: Record<string, number>
  total?: number
}

export interface JobOfferListItem {
  id: string
  title: string
  company: string
  location: string | null
  contract_type: ContractType | null
  work_mode: WorkMode | null
  status: JobOfferStatus
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  tech_stack: string[]
  domains: string[]
  ai_score: number | null
  posting_date: string | null
  created_at: string
}

export interface JobOfferCreate {
  title: string
  company: string
  location?: string
  description?: string
  requirements?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  contract_type?: ContractType
  work_mode?: WorkMode
  seniority_level?: SeniorityLevel
  status?: JobOfferStatus
  source_url?: string
  source_platform?: string
  posting_date?: string
  expiry_date?: string
  tech_stack?: string[]
  domains?: string[]
  notes?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
}

export type JobOfferUpdate = Partial<JobOfferCreate>

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
