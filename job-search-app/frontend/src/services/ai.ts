import api from './api'
import type { Document, DocumentGenerateRequest } from '@/types'

export const aiService = {
  scoreOffer: (job_offer_id: string, candidate_profile?: Record<string, unknown>) =>
    api.post<{ score: number; details: Record<string, unknown>; tokens_used: number }>(
      '/ai/score-offer',
      { job_offer_id, candidate_profile }
    ).then((r) => r.data),

  generateDocument: (data: DocumentGenerateRequest) =>
    api.post<Document>('/ai/generate-document', data).then((r) => r.data),

  parseOffer: (raw_text: string, source_url?: string, source_platform?: string) =>
    api.post<Record<string, unknown>>('/ai/parse-offer', { raw_text, source_url, source_platform }).then((r) => r.data),

  analyzeCompany: (company_name: string, context?: string) =>
    api.post<Record<string, unknown>>('/ai/analyze-company', { company_name, context }).then((r) => r.data),

  prepareInterview: (job_offer_id: string, application_id?: string, focus_areas?: string[]) =>
    api.post<Record<string, unknown>>('/ai/interview-prep', { job_offer_id, application_id, focus_areas }).then((r) => r.data),

  improveDocument: (doc_id: string, instructions?: string) =>
    api.post<Document>(`/ai/improve-document/${doc_id}`, null, { params: { instructions } }).then((r) => r.data),
}
