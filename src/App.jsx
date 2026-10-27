import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ThemeProvider } from './ThemeContext'
import LandingPage from './LandingPage.jsx'
import CitizenPage from './citizen/CitizenPage.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import Reports from './admin/Reports.jsx'
import Analytics from './admin/Analytics.jsx'
import Profile from './admin/Profile.jsx'
import ManageUsers from './admin/ManageUsers.jsx'

function RequireRole({ role, children }) {
  const { user } = useAuth()
  return user?.role === role ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/citizen" element={<RequireRole role="citizen"><CitizenPage /></RequireRole>} />
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<AdminDashboard />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
              <Route path="users" element={<ManageUsers />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
