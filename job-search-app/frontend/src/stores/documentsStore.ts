import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { documentsService } from '@/services/documents'
import { aiService } from '@/services/ai'
import type { Document } from '@/types'

interface DocumentsState {
  /** Documents indexed by job_offer_id */
  byOffer: Record<string, Document[]>
  isGenerating: boolean
  error: string | null

  fetchByOffer: (offerId: string) => Promise<void>
  generateCV: (offerId: string) => Promise<Document>
  generateCoverLetter: (offerId: string) => Promise<Document>
  exportDocument: (docId: string, format: 'pdf' | 'docx') => Promise<Blob>
  validateDocument: (docId: string, offerId: string) => Promise<void>
  deleteDocument: (docId: string, offerId: string) => Promise<void>
  regenerate: (docId: string, offerId: string) => Promise<void>
}

export const useDocumentsStore = create<DocumentsState>()(
  devtools(
    (set, get) => ({
      byOffer: {},
      isGenerating: false,
      error: null,

      fetchByOffer: async (offerId) => {
        const docs = await documentsService.listByOffer(offerId)
        set((s) => ({ byOffer: { ...s.byOffer, [offerId]: docs } }))
      },

      generateCV: async (offerId) => {
        set({ isGenerating: true })
        try {
          const doc = await aiService.generateCV(offerId)
          await get().fetchByOffer(offerId)
          return doc
        } finally {
          set({ isGenerating: false })
        }
      },

      generateCoverLetter: async (offerId) => {
        set({ isGenerating: true })
        try {
          const doc = await aiService.generateCoverLetter(offerId)
          await get().fetchByOffer(offerId)
          return doc
        } finally {
          set({ isGenerating: false })
        }
      },

      exportDocument: (docId, format) =>
        documentsService.export(docId, format),

      validateDocument: async (docId, offerId) => {
        await documentsService.validate(docId)
        await get().fetchByOffer(offerId)
      },

      deleteDocument: async (docId, offerId) => {
        await documentsService.delete(docId)
        await get().fetchByOffer(offerId)
      },

      regenerate: async (docId, offerId) => {
        set({ isGenerating: true })
        try {
          await aiService.regenerate(docId)
          await get().fetchByOffer(offerId)
        } finally {
          set({ isGenerating: false })
        }
      },
    }),
    { name: 'DocumentsStore' }
  )
)
