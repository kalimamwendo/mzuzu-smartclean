import { useEffect, useState } from 'react'
import { ClipboardList, Clock3, CheckCircle2, MapPinned } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import SummaryCard from '../components/SummaryCard'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/admin/reports?page=1&page_size=100', { token })
      .then(setPage)
      .catch((requestError) => setError(requestError.message))
  }, [token])

  const reports = page?.items || []
  const counts = reports.reduce((result, report) => {
    result[report.review_status] = (result[report.review_status] || 0) + 1
    return result
  }, {})
  const summary = [
    { title: 'Total Reports', value: page ? String(page.total) : '—', icon: ClipboardList, description: 'Reports in the database', color: 'green' },
    { title: 'Pending Reports', value: page ? String(counts.submitted || 0) : '—', icon: Clock3, description: 'Currently submitted', color: 'orange' },
    { title: 'Resolved Reports', value: page ? String(counts.resolved || 0) : '—', icon: CheckCircle2, description: 'Marked resolved', color: 'blue' },
    { title: 'Waste Hotspots', value: '—', icon: MapPinned, description: 'Analysis is not connected yet', color: 'purple' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Monitor reports saved in the SmartClean database for Mzuzu City.</p>
        </div>
        <div className="dashboard-date"><span className="dashboard-status-dot" />{error ? 'API unavailable' : page ? 'Live database' : 'Loading reports'}</div>
      </div>
      <section className="summary-grid" aria-label="Waste report summary">
        {summary.map((item) => <SummaryCard key={item.title} {...item} />)}
      </section>
      {error && <p className="dashboard-subtitle" role="alert">{error}</p>}
      <section className="dashboard-notice">
        <div className="notice-icon"><MapPinned size={22} /></div>
        <div><h2>Waste hotspot analysis</h2><p>Hotspot results will appear after the verified study boundary and DBSCAN analysis are connected.</p></div>
      </section>
      <section className="dashboard-placeholder-grid">
        <article className="dashboard-placeholder">
          <h2>Recent reports</h2>
          {reports.length ? reports.slice(0, 5).map((report) => <p key={report.id}>{report.public_reference} · {report.location_description} · {report.review_status.replaceAll('_', ' ')}</p>) : <p>{error || (page ? 'No saved reports yet.' : 'Loading reports...')}</p>}
        </article>
        <article className="dashboard-placeholder">
          <h2>Reports by status</h2>
          <div className="placeholder-status-list">
            <div><span className="status-dot pending" />Submitted<strong>{page ? counts.submitted || 0 : '—'}</strong></div>
            <div><span className="status-dot progress" />Under review<strong>{page ? counts.under_review || 0 : '—'}</strong></div>
            <div><span className="status-dot resolved" />Resolved<strong>{page ? counts.resolved || 0 : '—'}</strong></div>
          </div>
          <p className="placeholder-footnote">Counts reflect the first 100 loaded reports.</p>
        </article>
      </section>
    </div>
  )
}
