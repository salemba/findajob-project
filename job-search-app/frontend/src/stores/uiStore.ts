import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { ReactNode } from 'react'

export type ModalType =
  | 'create-offer'
  | 'analyze-offer'
  | 'generate-doc'
  | 'export-doc'
  | 'create-alert'
  | 'edit-alert'
  | null

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  timestamp: number
}

interface UIState {
  sidebarOpen: boolean
  activeModal: ModalType
  modalData: Record<string, unknown> | null
  notifications: Notification[]

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        activeModal: null,
        modalData: null,
        notifications: [],

        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
        closeModal: () => set({ activeModal: null, modalData: null }),
        addNotification: (n) =>
          set((s) => ({
            notifications: [
              ...s.notifications,
              { ...n, id: crypto.randomUUID(), timestamp: Date.now() },
            ],
          })),
        removeNotification: (id) =>
          set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      }),
      {
        name: 'ui-store',
        partialize: (s) => ({ sidebarOpen: s.sidebarOpen }),
      }
    ),
    { name: 'UIStore' }
  )
)
