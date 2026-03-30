import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage    from '@/pages/DashboardPage'
import OffersPage       from '@/pages/OffersPage'
import NewOfferPage     from '@/pages/NewOfferPage'
import OfferDetailPage  from '@/pages/OfferDetailPage'
import KanbanPage       from '@/pages/KanbanPage'
import DocumentsPage    from '@/pages/DocumentsPage'
import AlertsPage       from '@/pages/AlertsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="offers"        element={<OffersPage />} />
          <Route path="offers/new"    element={<NewOfferPage />} />
          <Route path="offers/:id"    element={<OfferDetailPage />} />
          <Route path="kanban"        element={<KanbanPage />} />
          <Route path="documents"     element={<DocumentsPage />} />
          <Route path="alerts"        element={<AlertsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
