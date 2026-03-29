import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { JobOfferListItem, JobOfferFilters } from '@/services/jobOffers'

interface JobOfferState {
  filters: JobOfferFilters
  selectedId: string | null
  setFilters: (filters: Partial<JobOfferFilters>) => void
  resetFilters: () => void
  setSelectedId: (id: string | null) => void
}

const DEFAULT_FILTERS: JobOfferFilters = {
  page: 1,
  page_size: 20,
  order_by: 'created_at',
  order_desc: true,
}

export const useJobOfferStore = create<JobOfferState>()(
  devtools(
    (set) => ({
      filters: DEFAULT_FILTERS,
      selectedId: null,
      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters, page: 1 } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      setSelectedId: (id) => set({ selectedId: id }),
    }),
    { name: 'JobOfferStore' }
  )
)
