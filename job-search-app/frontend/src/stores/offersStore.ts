import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { jobOffersService } from '@/services/jobOffers'
import type { JobOfferFilters } from '@/services/jobOffers'
import type { JobOffer, JobOfferCreate, JobOfferUpdate, OfferStatus } from '@/types'

interface OffersState {
  offers: JobOffer[]
  total: number
  selectedOffer: JobOffer | null
  filters: JobOfferFilters
  isLoading: boolean
  error: string | null

  fetchOffers: () => Promise<void>
  createOffer: (data: JobOfferCreate) => Promise<JobOffer>
  updateOffer: (id: string, data: JobOfferUpdate) => Promise<void>
  deleteOffer: (id: string) => Promise<void>
  setFilter: (filters: Partial<JobOfferFilters>) => void
  resetFilters: () => void
  analyzeOffer: (id: string) => Promise<void>
  selectOffer: (offer: JobOffer | null) => void
}

const DEFAULT_FILTERS: JobOfferFilters = {
  page: 1,
  page_size: 20,
  order_by: 'created_at',
  order_desc: true,
}

export const useOffersStore = create<OffersState>()(
  devtools(
    (set, get) => ({
      offers: [],
      total: 0,
      selectedOffer: null,
      filters: DEFAULT_FILTERS,
      isLoading: false,
      error: null,

      fetchOffers: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await jobOffersService.list(get().filters)
          set({ offers: data.items, total: data.total, isLoading: false })
        } catch {
          set({ error: 'Erreur lors du chargement des offres', isLoading: false })
        }
      },

      createOffer: async (data) => {
        const offer = await jobOffersService.create(data)
        await get().fetchOffers()
        return offer
      },

      updateOffer: async (id, data) => {
        await jobOffersService.update(id, data)
        await get().fetchOffers()
      },

      deleteOffer: async (id) => {
        await jobOffersService.delete(id)
        set((s) => ({ offers: s.offers.filter((o) => o.id !== id), total: s.total - 1 }))
      },

      setFilter: (filters) =>
        set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      analyzeOffer: async (id) => {
        const { aiService } = await import('@/services/ai')
        const result = await aiService.analyze(id)
        // Update the offer in the local list with new score
        set((s) => ({
          offers: s.offers.map((o) =>
            o.id === id
              ? { ...o, compatibility_score: result.score, status: result.status as OfferStatus }
              : o
          ),
        }))
      },

      selectOffer: (offer) => set({ selectedOffer: offer }),
    }),
    { name: 'OffersStore' }
  )
)
