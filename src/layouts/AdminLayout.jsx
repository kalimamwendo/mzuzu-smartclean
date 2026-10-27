
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import { useCallback, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import {
  Leaf,
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesCombined,
  UserRound,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  Users,
} from 'lucide-react'
import Toast from '../components/Toast'
import './AdminLayout.css'

function AdminLayout() {
  const { theme, toggleTheme } = useTheme()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const admin = {
    name: user?.name || 'Administrator',
    role: 'Administrator',
    initials: (user?.name || 'AD').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
  }

  const navigation = [
    {
      label: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: 'Waste Reports',
      path: '/admin/reports',
      icon: ClipboardList,
    },
    {
      label: 'Analytics & Hotspots',
      path: '/admin/analytics',
      icon: ChartNoAxesCombined,
    },
    {
      label: 'My Profile',
      path: '/admin/profile',
      icon: UserRound,
    },
    { label: 'Manage Users', path: '/admin/users', icon: Users },
  ]

  return (
    <div className="admin-layout">
      <Toast toast={toast} onClose={dismissToast} />
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Leaf size={26} />
          </div>

          <div className="sidebar-brand-text">
            <h2>SmartClean</h2>
            <p>Mzuzu City</p>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-navigation" aria-label="Admin navigation">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.path === '/admin' && (
                  <ChevronRight size={16} className="sidebar-chevron" />
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-environment">
            <Leaf size={20} />
            <div>
              <strong>Cleaner Mzuzu</strong>
              <p>Working for a better city</p>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={() => { signOut(); navigate('/') }}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="topbar-label">ADMINISTRATION</p>
              <h1>Waste Management</h1>
            </div>
          </div>

          <div className="topbar-right">
            <button
              className="notification-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setToast({ type: 'info', message: 'You are all caught up. New account and report alerts will appear here.' })}
            >
              <Bell size={19} />
            </button>

            <div className="topbar-divider" />

            <div className="admin-identity">
              <div className="admin-avatar">{admin.initials}</div>
              <button
  type="button"
  className="theme-toggle"
  onClick={toggleTheme}
  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
  <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
</button>
              <div className="admin-identity-text">
                <strong>{user?.name || admin.name}</strong>
                <span>{admin.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>Mzuzu SmartClean</span>
          <span>Waste reporting and hotspot analysis</span>
        </footer>
      </div>
    </div>
  )
}

export default AdminLayout
