import api from './api'
import type { Document } from '@/types'

export const documentsService = {
  listByOffer: (offerId: string) =>
    api.get<Document[]>(`/documents/${offerId}`).then((r) => r.data),

  download: (docId: string): Promise<Blob> =>
    api.get(`/documents/${docId}/download`, { responseType: 'blob' }).then((r) => r.data as Blob),

  export: (docId: string, format: 'pdf' | 'docx'): Promise<Blob> =>
    api.post(`/documents/${docId}/export`, null, {
      params: { format },
      responseType: 'blob',
    }).then((r) => r.data as Blob),

  validate: (docId: string) =>
    api.patch<Document>(`/documents/${docId}/validate`).then((r) => r.data),

  delete: (docId: string) =>
    api.delete(`/documents/${docId}`),
}

