import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import CreateJobPage from './pages/CreateJobPage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
            background: '#1e2645',
            color: '#f0eee8',
            border: '1px solid #2a3454',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#3ecf6a', secondary: '#1e2645' },
          },
          error: {
            iconTheme: { primary: '#ef5350', secondary: '#1e2645' },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<CreateJobPage />} />
        <Route path="/results/:jobId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
