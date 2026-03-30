/**
 * offersStore.test.ts
 *
 * Tests the Zustand offersStore in isolation by mocking jobOffersService.
 * No React component rendering needed — we call store actions directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import type { JobOffer, PaginatedResponse } from '@/types'

// ── Mock the service BEFORE importing the store ───────────────────────────────
vi.mock('@/services/jobOffers', () => ({
  jobOffersService: {
    list:          vi.fn(),
    get:           vi.fn(),
    create:        vi.fn(),
    update:        vi.fn(),
    delete:        vi.fn(),
    updateStatus:  vi.fn(),
    toggleFavorite: vi.fn(),
    getStats:      vi.fn(),
  },
}))

// ── Lazy import after mock is set up ─────────────────────────────────────────
import { useOffersStore } from '@/stores/offersStore'
import { jobOffersService } from '@/services/jobOffers'

// ─── Typed helpers ────────────────────────────────────────────────────────────

const mockList = vi.mocked(jobOffersService.list)
const mockCreate = vi.mocked(jobOffersService.create)
const mockUpdate = vi.mocked(jobOffersService.update)
const mockDelete = vi.mocked(jobOffersService.delete)

function makeOffer(overrides: Partial<JobOffer> = {}): JobOffer {
  return {
    id: 'aaa-111',
    title: 'Architecte Cloud',
    company: 'Acme',
    source: 'linkedin',
    raw_text: '',
    type: 'CDI' as JobOffer['type'],
    remote_type: 'HYBRID' as JobOffer['remote_type'],
    status: 'NEW' as JobOffer['status'],
    is_favorite: false,
    keywords: [],
    strengths: [],
    warnings: [],
    score_details: {},
    compatibility_score: null,
    notes: null,
    source_url: null,
    location: null,
    contract_duration: null,
    tjm_min: null,
    tjm_max: null,
    salary_min: null,
    salary_max: null,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    found_at: '2024-01-01T00:00:00',
    ...overrides,
  }
}

function makePagedResponse(items: JobOffer[], total?: number): PaginatedResponse<JobOffer> {
  return { items, total: total ?? items.length, page: 1, page_size: 20, pages: 1 }
}

// ─── Reset store between tests ────────────────────────────────────────────────

const INITIAL_STATE = {
  offers: [],
  total: 0,
  selectedOffer: null,
  filters: { page: 1, page_size: 20, order_by: 'created_at', order_desc: true },
  isLoading: false,
  error: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  useOffersStore.setState(INITIAL_STATE)
})

// ─── fetchOffers ──────────────────────────────────────────────────────────────

describe('fetchOffers', () => {
  it('populates offers and total from service response', async () => {
    const offers = [makeOffer({ id: '1' }), makeOffer({ id: '2' })]
    mockList.mockResolvedValue(makePagedResponse(offers))

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    const state = useOffersStore.getState()
    expect(state.offers).toHaveLength(2)
    expect(state.total).toBe(2)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('sets isLoading=true while fetching, then resets it', async () => {
    let loadingDuringFetch = false

    mockList.mockImplementation(async () => {
      loadingDuringFetch = useOffersStore.getState().isLoading
      return makePagedResponse([])
    })

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    expect(loadingDuringFetch).toBe(true)
    expect(useOffersStore.getState().isLoading).toBe(false)
  })

  it('stores error message when service rejects', async () => {
    mockList.mockRejectedValue(new Error('Network error'))

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    const state = useOffersStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeTruthy()
    expect(typeof state.error).toBe('string')
  })

  it('passes current filters to the service', async () => {
    mockList.mockResolvedValue(makePagedResponse([]))
    useOffersStore.setState({ filters: { page: 2, page_size: 10, order_by: 'company', order_desc: false } })

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    expect(mockList).toHaveBeenCalledWith({ page: 2, page_size: 10, order_by: 'company', order_desc: false })
  })
})

// ─── createOffer ──────────────────────────────────────────────────────────────

describe('createOffer', () => {
  it('returns the created offer', async () => {
    const newOffer = makeOffer({ id: 'new-1', title: 'New Offer' })
    mockCreate.mockResolvedValue(newOffer)
    mockList.mockResolvedValue(makePagedResponse([newOffer]))

    let result: JobOffer | undefined
    await act(async () => {
      result = await useOffersStore.getState().createOffer({
        title: 'New Offer',
        company: 'Corp',
        source: 'linkedin',
        type: 'CDI',
        remote_type: 'HYBRID',
        found_at: '2024-01-01T00:00:00',
      } as Parameters<typeof useOffersStore.getState().createOffer>[0])
    })

    expect(result?.id).toBe('new-1')
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('refreshes the offer list after creating', async () => {
    const newOffer = makeOffer()
    mockCreate.mockResolvedValue(newOffer)
    mockList.mockResolvedValue(makePagedResponse([newOffer]))

    await act(async () => {
      await useOffersStore.getState().createOffer({} as any)
    })

    // fetchOffers is called internally, which calls list
    expect(mockList).toHaveBeenCalledOnce()
  })
})

// ─── updateOffer ──────────────────────────────────────────────────────────────

describe('updateOffer', () => {
  it('calls service.update with correct args and refreshes list', async () => {
    const updated = makeOffer({ title: 'Updated' })
    mockUpdate.mockResolvedValue(updated)
    mockList.mockResolvedValue(makePagedResponse([updated]))

    await act(async () => {
      await useOffersStore.getState().updateOffer('aaa-111', { title: 'Updated' })
    })

    expect(mockUpdate).toHaveBeenCalledWith('aaa-111', { title: 'Updated' })
    expect(mockList).toHaveBeenCalledOnce()
  })
})

// ─── deleteOffer ──────────────────────────────────────────────────────────────

describe('deleteOffer', () => {
  it('removes the offer from local state immediately', async () => {
    const offer = makeOffer({ id: 'del-1' })
    useOffersStore.setState({ offers: [offer], total: 1 })
    mockDelete.mockResolvedValue(undefined as any)

    await act(async () => {
      await useOffersStore.getState().deleteOffer('del-1')
    })

    const state = useOffersStore.getState()
    expect(state.offers.find(o => o.id === 'del-1')).toBeUndefined()
    expect(state.total).toBe(0)
  })

  it('calls service.delete with the correct id', async () => {
    useOffersStore.setState({ offers: [makeOffer({ id: 'del-2' })], total: 1 })
    mockDelete.mockResolvedValue(undefined as any)

    await act(async () => {
      await useOffersStore.getState().deleteOffer('del-2')
    })

    expect(mockDelete).toHaveBeenCalledWith('del-2')
  })
})

// ─── setFilter ────────────────────────────────────────────────────────────────

describe('setFilter', () => {
  it('merges new filters into existing ones', () => {
    useOffersStore.setState({ filters: { page: 2, page_size: 20, order_by: 'created_at', order_desc: true } })

    useOffersStore.getState().setFilter({ page_size: 50 })

    const { filters } = useOffersStore.getState()
    expect(filters.page_size).toBe(50)
    expect(filters.order_by).toBe('created_at') // unchanged
  })

  it('resets page to 1 when any filter changes', () => {
    useOffersStore.setState({ filters: { page: 3, page_size: 20, order_by: 'created_at', order_desc: true } })

    useOffersStore.getState().setFilter({ page_size: 50 })

    expect(useOffersStore.getState().filters.page).toBe(1)
  })
})

// ─── resetFilters ─────────────────────────────────────────────────────────────

describe('resetFilters', () => {
  it('restores filters to the default values', () => {
    useOffersStore.setState({
      filters: { page: 5, page_size: 50, order_by: 'company', order_desc: false },
    })

    useOffersStore.getState().resetFilters()

    const { filters } = useOffersStore.getState()
    expect(filters.page).toBe(1)
    expect(filters.page_size).toBe(20)
    expect(filters.order_by).toBe('created_at')
    expect(filters.order_desc).toBe(true)
  })
})

// ─── selectOffer ──────────────────────────────────────────────────────────────

describe('selectOffer', () => {
  it('sets the selectedOffer', () => {
    const offer = makeOffer()
    useOffersStore.getState().selectOffer(offer)
    expect(useOffersStore.getState().selectedOffer?.id).toBe(offer.id)
  })

  it('clears selectedOffer when called with null', () => {
    useOffersStore.setState({ selectedOffer: makeOffer() })
    useOffersStore.getState().selectOffer(null)
    expect(useOffersStore.getState().selectedOffer).toBeNull()
  })
})
