import api from './api'
import type {
  Application,
  ApplicationListItem,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationStatusUpdate,
  PaginatedResponse,
} from '@/types'

export const applicationsService = {
  list: (params: { page?: number; page_size?: number; status?: string; job_offer_id?: string } = {}) =>
    api.get<PaginatedResponse<ApplicationListItem>>('/applications/', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Application>(`/applications/${id}`).then((r) => r.data),

  create: (data: ApplicationCreate) =>
    api.post<Application>('/applications/', data).then((r) => r.data),

  update: (id: string, data: ApplicationUpdate) =>
    api.patch<Application>(`/applications/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, data: ApplicationStatusUpdate) =>
    api.patch<Application>(`/applications/${id}/status`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/applications/${id}`),

  getPipeline: () =>
    api.get<{ pipeline: Record<string, number> }>('/applications/pipeline').then((r) => r.data),
}
