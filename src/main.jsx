import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LegacyApp from './legacy/App.jsx'
import M3Preview from './next/M3Preview.jsx'
import RankingsPage from './next/RankingsPage.jsx'
import NotFound from './next/NotFound.jsx'
import M4Preview from './next/M4Preview.jsx'
import CaseFileContainer from './next/CaseFileContainer.jsx'
import ReportPage from './next/ReportPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/legacy" element={<LegacyApp />} />
        <Route path="/m3-preview" element={<M3Preview />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/m4-preview" element={<M4Preview />} />
        <Route path="/case-file/:bbl" element={<CaseFileContainer />} />
        <Route path="/report/:bbl" element={<ReportPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
