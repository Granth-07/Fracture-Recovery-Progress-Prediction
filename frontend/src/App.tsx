import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { PatientList } from './pages/PatientList'
import { PatientDetail } from './pages/PatientDetail'
import { CheckIn } from './pages/CheckIn'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PatientList />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/checkin" element={<CheckIn />} />
          <Route
            path="*"
            element={
              <main className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <p className="text-6xl mb-4">404</p>
                <p>Page not found.</p>
              </main>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
