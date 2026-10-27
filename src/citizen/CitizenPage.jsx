import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { apiRequest, API_BASE_URL } from '../api'
import Toast from '../components/Toast'
import {
  Leaf, MapPin, ClipboardList, Send, LocateFixed, Camera, Sun, Moon,
  LogOut, UserRound, Menu, X, LayoutDashboard, Clock3, CheckCircle2,
} from 'lucide-react'
import './CitizenPage.css'

const sections = [
  { id: 'report', label: 'Submit a report', icon: MapPin },
  { id: 'reports', label: 'My reports', icon: ClipboardList },
  { id: 'profile', label: 'My profile', icon: UserRound },
]

export default function CitizenPage() {
  const { theme, toggleTheme } = useTheme()
  const { signOut, token, user } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('report')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form, setForm] = useState({ location: '', categoryId: '', description: '' })
  const [coordinates, setCoordinates] = useState(null)
  const [reports, setReports] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [locating, setLocating] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = useCallback((message, type = 'info') => setToast({ message, type }), [])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const rows = await apiRequest('/reports/mine?limit=100', { token })
      setReports(rows)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoadingReports(false)
    }
  }, [token, notify])

  useEffect(() => {
    let active = true
    apiRequest('/categories').then((rows) => { if (active) setCategories(rows) })
      .catch((error) => { if (active) notify(error.message, 'error') })
    loadReports()
    return () => { active = false }
  }, [loadReports, notify])

  function updateField(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))
  }

  function getLocation() {
    if (!navigator.geolocation) return notify('Location services are not supported by this browser.', 'error')
    setLocating(true)
    navigator.geolocation.getCurrentPosition((position) => {
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      setGpsAccuracy(position.coords.accuracy)
      setLocating(false)
      notify('Your location has been captured.', 'success')
    }, () => {
      setLocating(false)
      notify('Could not get your location. Enter the location manually.', 'error')
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!form.location.trim()) return notify('Please enter the location of the waste.', 'error')
    if (!coordinates) return notify('Capture GPS coordinates before submitting the report.', 'error')
    if (!form.categoryId) return notify('Choose a waste category.', 'error')
    if (!photoPreview) return notify('Please take a photo of the waste.', 'error')
    setSubmitting(true)
    try {
      const photoFile = document.getElementById('wastePhoto').files?.[0]
      const photoDataUrl = photoFile ? await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read the selected photo.'))
        reader.readAsDataURL(photoFile)
      }) : null
      const report = await apiRequest('/reports', { method: 'POST', token, body: JSON.stringify({
        category_id: form.categoryId, description: form.description,
        location_description: form.location, latitude: coordinates.latitude,
        longitude: coordinates.longitude, gps_accuracy_m: gpsAccuracy,
        photo_data_url: photoDataUrl,
      }) })
      setForm({ location: '', categoryId: '', description: '' })
      setCoordinates(null)
      setGpsAccuracy(null)
      setPhotoPreview('')
      event.currentTarget.reset()
      await loadReports()
      notify(`Report received. Your reference is ${report.public_reference}.`, 'success')
      setSection('reports')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function selectSection(id) {
    setSection(id)
    setSidebarOpen(false)
  }

  const activeSection = sections.find((item) => item.id === section)
  const ActiveIcon = activeSection?.icon || LayoutDashboard

  return <div className="citizen-workspace">
    <Toast toast={toast} onClose={dismissToast} />
    {sidebarOpen && <button className="citizen-drawer-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`citizen-sidebar ${sidebarOpen ? 'citizen-sidebar-open' : ''}`}>
      <div className="citizen-sidebar-brand"><span className="citizen-brand-icon"><Leaf size={24} /></span><span><strong>SmartClean</strong><small>Mzuzu City</small></span><button className="citizen-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <p className="citizen-sidebar-label">YOUR WORKSPACE</p>
      <nav className="citizen-sidebar-nav" aria-label="Citizen workspace">
        {sections.map(({ id, label, icon: Icon }) => <button key={id} className={`citizen-nav-link ${section === id ? 'active' : ''}`} onClick={() => selectSection(id)}><Icon size={19} /><span>{label}</span>{id === 'reports' && reports.length > 0 && <small>{reports.length}</small>}</button>)}
      </nav>
      <div className="citizen-sidebar-bottom">
        <div className="citizen-sidebar-user"><span className="citizen-user-avatar"><UserRound size={18} /></span><span><strong>{user?.name || 'Citizen'}</strong><small>{user?.email}</small></span></div>
        <button className="citizen-nav-link" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
        <button className="citizen-nav-link citizen-logout" onClick={() => { signOut(); navigate('/') }}><LogOut size={18} /><span>Sign out</span></button>
      </div>
    </aside>

    <div className="citizen-workspace-main">
      <header className="citizen-workspace-topbar"><div className="citizen-topbar-title"><button className="citizen-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><span className="citizen-topbar-icon"><ActiveIcon size={19} /></span><div><small>COMMUNITY WASTE REPORTING</small><h1>{activeSection?.label || 'My workspace'}</h1></div></div><span className="citizen-topbar-greeting">Hello, {user?.name?.split(' ')[0] || 'there'}</span></header>
      <main className="citizen-workspace-content">
        {section === 'report' && <>
          <div className="citizen-welcome-banner"><div><span className="citizen-hero-label">A CLEANER MZUZU STARTS HERE</span><h2>Help keep your community clean.</h2><p>Share a waste location with the city team. Add a clear photo and location so it can be reviewed.</p></div><div className="citizen-banner-icon"><Leaf size={46} /></div></div>
          <div className="citizen-report-layout">
            <section className="citizen-form-card" id="report-form">
              <div className="citizen-section-heading"><span className="citizen-info-icon"><Send size={20} /></span><div><h2>Report a waste site</h2><p>Fields marked with * are required.</p></div></div>
              <form onSubmit={submitReport}>
                <label htmlFor="location">Waste location *</label><input id="location" name="location" value={form.location} onChange={updateField} placeholder="e.g. Mzuzu bus depot area" required />
                <label htmlFor="wastePhoto">Photo of waste *</label><span className="citizen-photo-hint">Take a photo with your camera or choose an image from your device.</span>
                <label className="citizen-photo-picker" htmlFor="wastePhoto"><Camera size={19} /><span>{photoPreview ? 'Change waste photo' : 'Take or choose a photo'}</span><input id="wastePhoto" name="wastePhoto" type="file" accept="image/*" capture="environment" required onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { setPhotoPreview(''); notify('Choose a photo smaller than 5 MB.', 'error'); event.target.value = '' } else if (file) setPhotoPreview(URL.createObjectURL(file)) }} /></label>
                {photoPreview && <img className="citizen-photo-preview" src={photoPreview} alt="Waste report preview" />}
                <button type="button" className="citizen-location-button" onClick={getLocation} disabled={locating}><LocateFixed size={17} />{locating ? 'Getting location…' : 'Use my current GPS location'}</button>
                {coordinates && <p className="citizen-coordinates">Latitude: {coordinates.latitude.toFixed(6)} · Longitude: {coordinates.longitude.toFixed(6)}</p>}
                <label htmlFor="wasteType">Type of waste *</label><select id="wasteType" name="categoryId" value={form.categoryId} onChange={updateField} required><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                <label htmlFor="description">Description *</label><textarea id="description" name="description" value={form.description} onChange={updateField} placeholder="Describe the waste, its size, or nearby landmarks." rows={4} required />
                <button type="submit" className="citizen-submit-button" disabled={submitting}><Send size={18} />{submitting ? 'Submitting…' : 'Submit report'}</button>
              </form>
            </section>
            <aside className="citizen-guidance-card"><span className="citizen-info-icon"><CheckCircle2 size={22} /></span><h2>Make your report useful</h2><ul><li>Include a nearby landmark or street name.</li><li>Take a clear photo that shows the waste.</li><li>Allow location access for accurate GPS coordinates.</li></ul><div className="citizen-guidance-note"><strong>Your report matters</strong><p>Reports help Mzuzu City teams understand where waste collection needs attention.</p></div><button className="citizen-text-button" onClick={() => selectSection('reports')}><ClipboardList size={16} /> View your reports</button></aside>
          </div>
        </>}
        {section === 'reports' && <section className="citizen-reports-section"><div className="citizen-reports-heading"><div><h2>My submitted reports</h2><p>Track the reports you have sent to the Mzuzu SmartClean team.</p></div><span className="citizen-report-count"><ClipboardList size={16} />{reports.length} reports</span></div>
          {loadingReports ? <p className="citizen-loading">Loading your reports…</p> : reports.length === 0 ? <div className="citizen-empty-state"><ClipboardList size={34} /><h3>No reports submitted yet</h3><p>Your submitted reports will appear here after they are saved.</p><button className="citizen-submit-button" onClick={() => selectSection('report')}>Create your first report</button></div> : <div className="citizen-report-list">{reports.map((report) => <article className="citizen-report-item" key={report.id}><div className="citizen-report-main">{report.photo_reference && <img className="citizen-report-photo" src={`${API_BASE_URL.replace(/\/api\/v1$/, '')}${report.photo_reference}`} alt={`Waste at ${report.location_description}`} />}<div className="citizen-report-title"><h3>{report.location_description}</h3><span className="citizen-report-category">{report.category.name}</span></div><p>{report.description}</p><small>Ref: {report.public_reference} · {new Date(report.reported_at).toLocaleString()}</small><small>GPS {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</small></div><span className="citizen-pending-badge"><Clock3 size={13} />{report.review_status.replaceAll('_', ' ')}</span></article>)}</div>}
        </section>}
        {section === 'profile' && <section className="citizen-profile-panel"><div className="citizen-profile-banner"><div className="citizen-profile-avatar"><UserRound size={34} /></div><div><span>SMARTCLEAN ACCOUNT</span><h2>{user?.name || 'Citizen'}</h2><p>{user?.email}</p></div></div><div className="citizen-profile-details"><h3>Account details</h3><div><span>Full name</span><strong>{user?.name || 'Not available'}</strong></div><div><span>Email address</span><strong>{user?.email || 'Not available'}</strong></div><div><span>Account role</span><strong className="citizen-role-badge">{user?.role?.replace('_', ' ') || 'citizen'}</strong></div><div><span>Account status</span><strong>{user?.accountStatus || 'active'}</strong></div><div><span>Member since</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}</strong></div><div><span>Reports submitted</span><strong>{reports.length}</strong></div></div></section>}
      </main>
      <footer className="citizen-workspace-footer"><span><Leaf size={16} />Mzuzu SmartClean</span><span>Working together for a cleaner, healthier city.</span></footer>
    </div>
  </div>
}
