import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ApplicationStatus } from '@/types'

interface ApplicationState {
  filterStatus: ApplicationStatus | null
  filterJobOfferId: string | null
  viewMode: 'list' | 'kanban'
  setFilterStatus: (status: ApplicationStatus | null) => void
  setFilterJobOfferId: (id: string | null) => void
  setViewMode: (mode: 'list' | 'kanban') => void
}

export const useApplicationStore = create<ApplicationState>()(
  devtools(
    (set) => ({
      filterStatus: null,
      filterJobOfferId: null,
      viewMode: 'kanban',
      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterJobOfferId: (id) => set({ filterJobOfferId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    { name: 'ApplicationStore' }
  )
)
