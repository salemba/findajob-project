import api from './api'
import type { Alert, AlertsSummary } from '@/types'

export const alertsService = {
  getAlerts: (days_ahead = 7) =>
    api.get<Alert[]>('/alerts/', { params: { days_ahead } }).then((r) => r.data),

  getSummary: () =>
    api.get<AlertsSummary>('/alerts/summary').then((r) => r.data),
}
