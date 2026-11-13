
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
  Menu,
  X,
  LogOut,
  Bell,
  Users,
  Route,
  ChevronDown,
} from 'lucide-react'
import Toast from '../components/Toast'
import smartCleanLogo from '../images/log.jpeg'
import './AdminLayout.css'

function AdminLayout() {
  const { theme, toggleTheme } = useTheme()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutPrompt, setLogoutPrompt] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
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
    { label: 'Collection Route', path: '/admin/collection-route', icon: Route },
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
          <div className="sidebar-logo"><img src={smartCleanLogo} alt="" /></div>

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
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={19} />
            </button>
            {notificationsOpen && (
              <div className="admin-notification-popover" role="status">
                <strong>Notifications</strong>
                <p>You are all caught up. New account and report alerts will appear here.</p>
              </div>
            )}

            <div className="topbar-divider" />

            <div className="admin-profile-menu">
              <button
                type="button"
                className="admin-identity"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <div className="admin-avatar">{admin.initials}</div>
                <div className="admin-identity-text">
                  <strong>{user?.name || admin.name}</strong>
                  <span>{admin.role}</span>
                </div>
                <ChevronDown size={16} className={profileOpen ? 'profile-chevron profile-chevron-open' : 'profile-chevron'} />
              </button>
              {profileOpen && (
                <div className="admin-profile-dropdown" role="menu">
                  <div className="profile-dropdown-header">
                    <div className="admin-avatar">{admin.initials}</div>
                    <div>
                      <strong>{user?.name || admin.name}</strong>
                      <span>{user?.email || 'Administrator account'}</span>
                    </div>
                  </div>
                  <div className="profile-dropdown-details">
                    <span>Role</span>
                    <strong>{admin.role}</strong>
                    <span>Account status</span>
                    <strong>{user?.accountStatus || 'Active'}</strong>
                  </div>
                  <button
                    type="button"
                    className="profile-dropdown-action"
                    onClick={toggleTheme}
                    role="menuitem"
                  >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown-action profile-dropdown-logout"
                    onClick={() => setLogoutPrompt(true)}
                    role="menuitem"
                  >
                    <LogOut size={17} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {logoutPrompt && (
          <div className="logout-dialog-backdrop" role="presentation">
            <div className="logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title">
              <h2 id="logout-dialog-title">Sign out of SmartClean?</h2>
              <p>You will need to sign in again to access the administrator workspace.</p>
              <div className="logout-dialog-actions">
                <button type="button" className="logout-cancel" onClick={() => setLogoutPrompt(false)}>Cancel</button>
                <button type="button" className="logout-confirm" onClick={() => { signOut(); navigate('/') }}>Sign out</button>
              </div>
            </div>
          </div>
        )}

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
