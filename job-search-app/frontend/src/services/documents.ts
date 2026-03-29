import api from './api'
import type {
  Document,
  DocumentListItem,
  DocumentCreate,
  DocumentUpdate,
  PaginatedResponse,
} from '@/types'

export const documentsService = {
  list: (params: { page?: number; job_offer_id?: string; application_id?: string; document_type?: string } = {}) =>
    api.get<PaginatedResponse<DocumentListItem>>('/documents/', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Document>(`/documents/${id}`).then((r) => r.data),

  create: (data: DocumentCreate) =>
    api.post<Document>('/documents/', data).then((r) => r.data),

  update: (id: string, data: DocumentUpdate) =>
    api.patch<Document>(`/documents/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/documents/${id}`),

  exportDocument: (id: string, format: string) =>
    api.post(`/documents/${id}/export`, { document_id: id, format }, { responseType: 'blob' }).then((r) => r.data),
}
