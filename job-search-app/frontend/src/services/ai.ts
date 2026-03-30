import api from './api'
import type { Document, AnalyzeResult } from '@/types'

export const aiService = {
  analyze: (job_offer_id: string) =>
    api.post<AnalyzeResult>('/ai/analyze', { job_offer_id }).then((r) => r.data),

  generateCV: (job_offer_id: string) =>
    api.post<Document>('/ai/generate-cv', { job_offer_id }).then((r) => r.data),

  generateCoverLetter: (job_offer_id: string) =>
    api.post<Document>('/ai/generate-cover-letter', { job_offer_id }).then((r) => r.data),

  regenerate: (doc_id: string) =>
    api.post<Document>(`/ai/regenerate/${doc_id}`).then((r) => r.data),
}

