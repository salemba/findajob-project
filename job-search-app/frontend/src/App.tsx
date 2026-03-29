import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import JobOffersPage from '@/pages/JobOffers'
import JobOfferDetailPage from '@/pages/JobOfferDetail'
import ApplicationsPage from '@/pages/Applications'
import ApplicationDetailPage from '@/pages/ApplicationDetail'
import DocumentsPage from '@/pages/Documents'
import DocumentDetailPage from '@/pages/DocumentDetail'
import AIToolsPage from '@/pages/AITools'
import AlertsPage from '@/pages/Alerts'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="job-offers" element={<JobOffersPage />} />
          <Route path="job-offers/:id" element={<JobOfferDetailPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id" element={<DocumentDetailPage />} />
          <Route path="ai-tools" element={<AIToolsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
