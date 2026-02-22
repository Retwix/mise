import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MonthPage } from './pages/MonthPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ShiftTypesPage } from './pages/ShiftTypesPage'
import { DispoPage } from './pages/DispoPage'
import { PlanningPage } from './pages/PlanningPage'
import { RequireAuth } from './components/RequireAuth'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/month/:monthId" element={<RequireAuth><MonthPage /></RequireAuth>} />
        <Route path="/employees" element={<RequireAuth><EmployeesPage /></RequireAuth>} />
        <Route path="/shift-types" element={<RequireAuth><ShiftTypesPage /></RequireAuth>} />
        <Route path="/dispo/:token" element={<DispoPage />} />
        <Route path="/planning/:token" element={<PlanningPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
