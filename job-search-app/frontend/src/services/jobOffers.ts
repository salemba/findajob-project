import api from './api'
import type {
  JobOffer,
  JobOfferListItem,
  JobOfferCreate,
  JobOfferUpdate,
  PaginatedResponse,
} from '@/types'

export interface JobOfferFilters {
  page?: number
  page_size?: number
  status?: string
  company?: string
  search?: string
  work_mode?: string
  contract_type?: string
  ai_score_gte?: number
  order_by?: string
  order_desc?: boolean
}

export const jobOffersService = {
  list: (filters: JobOfferFilters = {}) =>
    api.get<PaginatedResponse<JobOfferListItem>>('/job-offers/', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<JobOffer>(`/job-offers/${id}`).then((r) => r.data),

  create: (data: JobOfferCreate) =>
    api.post<JobOffer>('/job-offers/', data).then((r) => r.data),

  update: (id: string, data: JobOfferUpdate) =>
    api.patch<JobOffer>(`/job-offers/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/job-offers/${id}`),

  score: (id: string) =>
    api.post<JobOffer>(`/job-offers/${id}/score`).then((r) => r.data),

  getStats: () =>
    api.get<{ total: number; by_status: Record<string, number>; average_ai_score: number | null }>(
      '/job-offers/stats'
    ).then((r) => r.data),
}
