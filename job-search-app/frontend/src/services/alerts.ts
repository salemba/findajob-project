import api from './api'
import type { AlertConfig, AlertConfigCreate, AlertConfigUpdate, AlertMatch } from '@/types'

export const alertsService = {
  list: () =>
    api.get<AlertConfig[]>('/alerts/').then((r) => r.data),

  create: (data: AlertConfigCreate) =>
    api.post<AlertConfig>('/alerts/', data).then((r) => r.data),

  update: (id: string, data: AlertConfigUpdate) =>
    api.put<AlertConfig>(`/alerts/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/alerts/${id}`),

  run: (id: string) =>
    api.post<AlertMatch[]>(`/alerts/${id}/run`).then((r) => r.data),
}
