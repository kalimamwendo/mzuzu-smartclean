import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { apiRequest, API_BASE_URL } from '../api'
import Toast from '../components/Toast'
import smartCleanLogo from '../images/log.jpeg'
import {
  Leaf, ClipboardList, Send, LocateFixed, Camera, Sun, Moon,
  LogOut, UserRound, Menu, X, LayoutDashboard, Clock3, CheckCircle2,
} from 'lucide-react'
import './CitizenPage.css'

const LOCATION_OPTIONS = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }

const sections = [
  { id: 'report', label: 'Submit a report', icon: Send },
  { id: 'reports', label: 'My reports', icon: ClipboardList },
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
  const [gpsCapturedAt, setGpsCapturedAt] = useState(null)
  const [gpsCaptureCoordinates, setGpsCaptureCoordinates] = useState(null)
  const [locating, setLocating] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [toast, setToast] = useState(null)
  const [logoutPrompt, setLogoutPrompt] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [submissionConfirmation, setSubmissionConfirmation] = useState('')
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
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return notify('Location access requires HTTPS. Open the secure SmartClean address and try again.', 'info')
    }
    setLocating(true)
    let bestAccuracy = Number.POSITIVE_INFINITY
    let bestPosition = null
    let watchId
    let retryCount = 0
    const finish = () => {
      window.clearTimeout(timeoutId)
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
      setLocating(false)
    }
    const finishWithBestPosition = () => {
      if (!bestPosition) return
      const { latitude, longitude, accuracy } = bestPosition.coords
      setCoordinates({ latitude, longitude })
      setGpsAccuracy(accuracy)
      setGpsCaptureCoordinates({ latitude, longitude })
      setGpsCapturedAt(new Date(bestPosition.timestamp).toISOString())
      finish()
    }
    const timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finishWithBestPosition()
        return
      }
      setCoordinates(null)
      setGpsAccuracy(null)
      finish()
    }, 15000)
    const handleError = (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setCoordinates(null)
        setGpsAccuracy(null)
        setGpsCapturedAt(null)
        setGpsCaptureCoordinates(null)
        return finish('Location permission was denied. Allow location access in the browser address-bar settings, then try again.', 'info')
      }
      if (retryCount < 2) {
        retryCount += 1
        window.setTimeout(() => {
          watchId = navigator.geolocation.watchPosition(handlePosition, handleError, LOCATION_OPTIONS)
        }, 1000)
        return
      }
      setCoordinates(null)
      setGpsAccuracy(null)
      setGpsCaptureCoordinates(null)
      setGpsCapturedAt(null)
      finish()
    }
    const handlePosition = (position) => {
      const { latitude, longitude, accuracy } = position.coords
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy >= bestAccuracy) return
      bestAccuracy = accuracy
      bestPosition = position
      setCoordinates({ latitude, longitude })
      setGpsAccuracy(accuracy)
      setGpsCaptureCoordinates({ latitude, longitude })
      setGpsCapturedAt(new Date(position.timestamp).toISOString())
      finishWithBestPosition()
    }
    watchId = navigator.geolocation.watchPosition(handlePosition, handleError, LOCATION_OPTIONS)
  }

  async function submitReport(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!form.location.trim()) return notify('Please enter the location of the waste.', 'info')
    if (!coordinates || !Number.isFinite(gpsAccuracy) || !gpsCaptureCoordinates || !gpsCapturedAt) return notify('Capture a GPS location before submitting.', 'info')
    if (!form.categoryId) return notify('Choose a waste category.', 'info')
    if (!photoPreview) return notify('Please take a photo of the waste.', 'info')
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
        longitude: coordinates.longitude, gps_capture_latitude: gpsCaptureCoordinates.latitude,
        gps_capture_longitude: gpsCaptureCoordinates.longitude, gps_captured_at: gpsCapturedAt,
        gps_accuracy_m: gpsAccuracy, manually_adjusted: false,
        photo_data_url: photoDataUrl,
      }) })
      setForm({ location: '', categoryId: '', description: '' })
      setCoordinates(null)
      setGpsAccuracy(null)
      setGpsCaptureCoordinates(null)
      setGpsCapturedAt(null)
      setPhotoPreview('')
      formElement.reset()
      await loadReports()
      setSubmissionConfirmation(`Report sent successfully. Reference: ${report.public_reference}.`)
      notify('Your report was sent successfully.', 'success')
      setSection('reports')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function selectSection(id) {
    setSection(id)
    if (id !== 'reports') setSubmissionConfirmation('')
    setSidebarOpen(false)
  }

  const activeSection = sections.find((item) => item.id === section)
  const ActiveIcon = activeSection?.icon || LayoutDashboard
  const citizenName = user?.email === 'citizen@smartclean.mw' ? 'Citizen' : user?.name || 'Citizen'

  return <div className="citizen-workspace">
    <Toast toast={toast} onClose={dismissToast} />
    {sidebarOpen && <button className="citizen-drawer-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`citizen-sidebar ${sidebarOpen ? 'citizen-sidebar-open' : ''}`}>
      <div className="citizen-sidebar-brand"><span className="citizen-brand-icon"><img src={smartCleanLogo} alt="" /></span><span><strong>SmartClean</strong><small>Mzuzu City</small></span><button className="citizen-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <p className="citizen-sidebar-label">YOUR WORKSPACE</p>
      <nav className="citizen-sidebar-nav" aria-label="Citizen workspace">
        {sections.map(({ id, label, icon: Icon }) => <button key={id} className={`citizen-nav-link ${section === id ? 'active' : ''}`} onClick={() => selectSection(id)}><Icon size={19} /><span>{label}</span>{id === 'reports' && reports.length > 0 && <small>{reports.length}</small>}</button>)}
      </nav>
      <div className="citizen-sidebar-bottom">
      </div>
    </aside>

    <div className="citizen-workspace-main">
      <header className="citizen-workspace-topbar"><div className="citizen-topbar-title"><button className="citizen-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><span className="citizen-topbar-icon"><ActiveIcon size={19} /></span><div><small>COMMUNITY WASTE REPORTING</small><h1>{activeSection?.label || 'My workspace'}</h1></div></div><div className="citizen-profile-menu"><button type="button" className="citizen-profile-trigger" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="citizen-profile-trigger-avatar"><UserRound size={18} /></span><span className="citizen-topbar-greeting">Hello, {citizenName.split(' ')[0]}</span></button>{profileOpen && <div className="citizen-profile-dropdown" role="menu"><div className="citizen-profile-dropdown-header"><span className="citizen-profile-dropdown-avatar"><UserRound size={22} /></span><div><strong>{citizenName}</strong><small>{user?.email}</small></div></div><div className="citizen-profile-dropdown-details"><span>Account role</span><strong>{user?.role?.replace('_', ' ') || 'citizen'}</strong><span>Account status</span><strong>{user?.accountStatus || 'active'}</strong><span>Member since</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}</strong><span>Reports submitted</span><strong>{reports.length}</strong></div><button type="button" onClick={toggleTheme}><span>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</button><button type="button" className="citizen-profile-dropdown-signout" onClick={() => setLogoutPrompt(true)}><span><LogOut size={16} /></span>Sign out</button></div>}</div></header>
      <main className="citizen-workspace-content">
        {section === 'report' && <>
          <div className="citizen-welcome-banner"><div><span className="citizen-hero-label">A CLEANER MZUZU STARTS HERE</span><h2>Help keep your community clean.</h2><p>Share a waste location with the city team. Add a clear photo and location so it can be reviewed.</p></div><div className="citizen-banner-icon"><Leaf size={46} /></div></div>
          <div className="citizen-report-layout">
            <section className="citizen-form-card" id="report-form">
              <div className="citizen-section-heading"><span className="citizen-info-icon"><Send size={20} /></span><div><h2>Report a waste site</h2><p>Fields marked with * are required.</p></div></div>
              <form onSubmit={submitReport}>
                <label htmlFor="location">Waste location *</label><input id="location" name="location" value={form.location} onChange={updateField} placeholder="e.g. Mzuzu bus depot area" minLength={2} required />
                <label htmlFor="wastePhoto">Photo of waste *</label><span className="citizen-photo-hint">Take a photo with your camera or choose an image from your device.</span>
                <label className="citizen-photo-picker" htmlFor="wastePhoto"><Camera size={19} /><span>{photoPreview ? 'Change waste photo' : 'Take or choose a photo'}</span><input id="wastePhoto" name="wastePhoto" type="file" accept="image/*" capture="environment" required onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { setPhotoPreview(''); notify('Choose a photo smaller than 5 MB.', 'error'); event.target.value = '' } else if (file) setPhotoPreview(URL.createObjectURL(file)) }} /></label>
                {photoPreview && <img className="citizen-photo-preview" src={photoPreview} alt="Waste report preview" />}
                <button type="button" className="citizen-location-button" onClick={getLocation} disabled={locating}><LocateFixed size={17} />{locating ? 'Getting location…' : 'Use my current GPS location'}</button>
                <label htmlFor="wasteType">Type of waste *</label><select id="wasteType" name="categoryId" value={form.categoryId} onChange={updateField} required><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                <label htmlFor="description">Description *</label><textarea id="description" name="description" value={form.description} onChange={updateField} placeholder="Describe the waste, its size, or nearby landmarks." rows={4} minLength={5} required />
                <button type="submit" className="citizen-submit-button" disabled={submitting}><Send size={18} />{submitting ? 'Submitting…' : 'Submit report'}</button>
              </form>
            </section>
            <aside className="citizen-guidance-card"><span className="citizen-info-icon"><CheckCircle2 size={22} /></span><h2>Make your report useful</h2><ul><li>Include a nearby landmark or street name.</li><li>Take a clear photo that shows the waste.</li><li>Allow location access for accurate GPS coordinates.</li></ul><div className="citizen-guidance-note"><strong>Your report matters</strong><p>Reports help Mzuzu City teams understand where waste collection needs attention.</p></div><button className="citizen-text-button" onClick={() => selectSection('reports')}><ClipboardList size={16} /> View your reports</button></aside>
          </div>
        </>}
        {section === 'reports' && <section className="citizen-reports-section">{submissionConfirmation && <div className="citizen-submission-confirmation" role="status"><CheckCircle2 size={20} /><span>{submissionConfirmation}</span><button type="button" onClick={() => setSubmissionConfirmation('')} aria-label="Dismiss confirmation">×</button></div>}<div className="citizen-reports-heading"><div><h2>My submitted reports</h2><p>Track the reports you have sent to the Mzuzu SmartClean team.</p></div><span className="citizen-report-count"><ClipboardList size={16} />{reports.length} reports</span></div>
          {loadingReports ? <p className="citizen-loading">Loading your reports…</p> : reports.length === 0 ? <div className="citizen-empty-state"><ClipboardList size={34} /><h3>No reports submitted yet</h3><p>Your submitted reports will appear here after they are saved.</p><button className="citizen-submit-button" onClick={() => selectSection('report')}>Create your first report</button></div> : <div className="citizen-report-list">{reports.map((report) => <article className="citizen-report-item" key={report.id}><div className="citizen-report-main">{report.photo_reference && <img className="citizen-report-photo" src={`${API_BASE_URL.replace(/\/api\/v1$/, '')}${report.photo_reference}`} alt={`Waste at ${report.location_description}`} />}<div className="citizen-report-title"><h3>{report.location_description}</h3><span className="citizen-report-category">{report.category.name}</span></div><p>{report.description}</p><small>Ref: {report.public_reference} · {new Date(report.reported_at).toLocaleString()}</small></div><span className="citizen-pending-badge"><Clock3 size={13} />{report.review_status.replaceAll('_', ' ')}</span></article>)}</div>}
        </section>}
      </main>
      <footer className="citizen-workspace-footer"><span><Leaf size={16} />Mzuzu SmartClean</span><span>Working together for a cleaner, healthier city.</span></footer>
    </div>
    {logoutPrompt && <div className="citizen-logout-dialog-backdrop" role="presentation"><div className="citizen-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="citizen-logout-title"><h2 id="citizen-logout-title">Sign out of SmartClean?</h2><p>You will need to sign in again to access your reports.</p><div className="citizen-logout-actions"><button type="button" onClick={() => setLogoutPrompt(false)}>Cancel</button><button type="button" onClick={() => { signOut(); navigate('/') }}>Sign out</button></div></div></div>}
  </div>
}
