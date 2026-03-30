// ── AlertConfig (backend /api/v1/alerts/) ────────────────────────────────────
export interface AlertConfig {
  id: string
  keywords: string[]
  platforms: string[]
  min_tjm: number | null
  remote_only: boolean
  is_active: boolean
  check_interval_hours: number
  last_checked_at: string | null
  created_at: string
}

export interface AlertConfigCreate {
  keywords?: string[]
  platforms?: string[]
  min_tjm?: number
  remote_only?: boolean
  check_interval_hours?: number
}

export interface AlertConfigUpdate {
  keywords?: string[]
  platforms?: string[]
  min_tjm?: number | null
  remote_only?: boolean
  is_active?: boolean
  check_interval_hours?: number
}

export interface AlertMatch {
  id: string
  title: string
  company: string
  tjm_min?: number | null
  tjm_max?: number | null
  remote_type?: string
  location?: string | null
  created_at: string
}

