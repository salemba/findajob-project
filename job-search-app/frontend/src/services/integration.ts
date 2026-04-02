import axios from 'axios'

// Separate instance — integration routes are at /api/integration/*, not /api/v1/*
const api = axios.create({ baseURL: '/api', timeout: 15_000 })

export interface SchedulerStatus {
  paused: boolean
  jobs: { id: string; paused: boolean; next_run: string | null }[]
}

const HEADERS = {
  'X-Integration-Key': import.meta.env.VITE_INTEGRATION_KEY ?? 'claude-code-integration-key-dev-2025',
}

export const integrationService = {
  schedulerStatus: (): Promise<SchedulerStatus> =>
    api
      .get<SchedulerStatus>('/integration/scout/scheduler-status', { headers: HEADERS })
      .then((r) => r.data),

  pauseScheduler: (): Promise<SchedulerStatus> =>
    api
      .post<SchedulerStatus>('/integration/scout/pause', null, { headers: HEADERS })
      .then((r) => r.data),

  resumeScheduler: (): Promise<SchedulerStatus> =>
    api
      .post<SchedulerStatus>('/integration/scout/resume', null, { headers: HEADERS })
      .then((r) => r.data),

  runScoutNow: (): Promise<{ status: string; message: string }> =>
    api
      .post('/integration/scout/run-now', null, { headers: HEADERS })
      .then((r) => r.data),
}
