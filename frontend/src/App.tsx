import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard as HospitalDashboard } from './pages/hospital/Dashboard'
import { Forecast } from './pages/hospital/Forecast'
import { Sensors } from './pages/hospital/Sensors'
import { Historical } from './pages/hospital/Historical'
import { Dashboard as InsuranceDashboard } from './pages/insurance/Dashboard'
import { Monitor } from './pages/insurance/Monitor'
import { Events } from './pages/insurance/Events'
import { Simulate } from './pages/insurance/Simulate'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/hospital/dashboard" replace />} />
          <Route path="hospital">
            <Route index element={<Navigate to="/hospital/dashboard" replace />} />
            <Route path="dashboard" element={<HospitalDashboard />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="sensors" element={<Sensors />} />
            <Route path="historical" element={<Historical />} />
          </Route>
          <Route path="insurance">
            <Route index element={<Navigate to="/insurance/dashboard" replace />} />
            <Route path="dashboard" element={<InsuranceDashboard />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="events" element={<Events />} />
            <Route path="simulate" element={<Simulate />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App