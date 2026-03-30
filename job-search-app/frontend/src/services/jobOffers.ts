import api from './api'
import type {
  JobOffer, JobOfferCreate, JobOfferUpdate, JobOfferStats,
  PaginatedResponse, OfferStatus,
} from '@/types'

export interface JobOfferFilters {
  page?: number
  page_size?: number
  status?: OfferStatus
  type?: string
  remote_type?: string
  search?: string
  order_by?: string
  order_desc?: boolean
  is_favorite?: boolean
}

export const jobOffersService = {
  list: (filters: JobOfferFilters = {}) =>
    api.get<PaginatedResponse<JobOffer>>('/job-offers/', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<JobOffer>(`/job-offers/${id}`).then((r) => r.data),

  create: (data: JobOfferCreate) =>
    api.post<JobOffer>('/job-offers/', data).then((r) => r.data),

  update: (id: string, data: JobOfferUpdate) =>
    api.put<JobOffer>(`/job-offers/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/job-offers/${id}`),

  updateStatus: (id: string, status: OfferStatus) =>
    api.patch<JobOffer>(`/job-offers/${id}/status`, { status }).then((r) => r.data),

  toggleFavorite: (id: string) =>
    api.patch<JobOffer>(`/job-offers/${id}/favorite`).then((r) => r.data),

  getStats: () =>
    api.get<JobOfferStats>('/job-offers/stats').then((r) => r.data),
}
