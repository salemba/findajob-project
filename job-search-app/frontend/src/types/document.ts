export type DocumentType = 'CV' | 'Lettre de motivation' | 'Portfolio' | 'Certificat' | 'Lettre de recommandation' | 'Autre'
export type DocumentFormat = 'pdf' | 'docx' | 'html' | 'markdown' | 'txt'
export type DocumentStatus = 'Brouillon' | 'En génération' | 'Prêt' | 'Envoyé' | 'Archivé'

export interface Document {
  id: string
  job_offer_id: string | null
  application_id: string | null
  document_type: DocumentType
  format: DocumentFormat
  status: DocumentStatus
  title: string
  content: string | null
  content_html: string | null
  ai_prompt_used: string | null
  ai_model_used: string | null
  ai_tokens_used: number | null
  version: number
  file_path: string | null
  file_size_bytes: number | null
  created_at: string
  updated_at: string
}

export interface DocumentListItem {
  id: string
  job_offer_id: string | null
  application_id: string | null
  document_type: DocumentType
  format: DocumentFormat
  status: DocumentStatus
  title: string
  version: number
  ai_tokens_used: number | null
  created_at: string
}

export interface DocumentCreate {
  job_offer_id?: string
  application_id?: string
  document_type: DocumentType
  format?: DocumentFormat
  title: string
  content?: string
}

export type DocumentUpdate = Partial<{
  title: string
  content: string
  status: DocumentStatus
  format: DocumentFormat
}>

export interface DocumentGenerateRequest {
  job_offer_id: string
  application_id?: string
  document_type: DocumentType
  format?: DocumentFormat
  custom_instructions?: string
  candidate_profile?: Record<string, unknown>
  language?: 'fr' | 'en'
}
