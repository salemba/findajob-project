export interface Alert {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  application_id?: string
  job_offer_title?: string
  company?: string
  due_date?: string
}

export interface AlertsSummary {
  high: number
  medium: number
  low: number
  total: number
}
