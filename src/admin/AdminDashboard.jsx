import { useEffect, useState } from 'react'
import { ClipboardList, Clock3, CheckCircle2, MapPinned, AlertTriangle } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import SummaryCard from '../components/SummaryCard'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [page, setPage] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/admin/reports?page=1&page_size=100', { token })
      .then(setPage)
      .catch((requestError) => setError(requestError.message))
  }, [token])

  useEffect(() => {
    apiRequest('/admin/analytics', { token })
      .then(setAnalytics)
      .catch(() => setAnalytics(null)) // non-fatal — hotspot card will show fallback
  }, [token])

  const reports = page?.items || []
  const counts = reports.reduce((result, report) => {
    result[report.review_status] = (result[report.review_status] || 0) + 1
    return result
  }, {})

  const hotspotCount = analytics ? String(analytics.total_hotspots) : '—'
  const summary = [
    { title: 'Total Reports',   value: page      ? String(page.total)             : '—', icon: ClipboardList, description: 'Reports in the database',  color: 'green'  },
    { title: 'Pending Reports', value: page      ? String(counts.submitted || 0)  : '—', icon: Clock3,        description: 'Currently submitted',       color: 'orange' },
    { title: 'Resolved Reports',value: page      ? String(counts.resolved  || 0)  : '—', icon: CheckCircle2,  description: 'Marked resolved',           color: 'blue'   },
    { title: 'Waste Hotspots',  value: hotspotCount,                                      icon: MapPinned,     description: analytics ? `DBSCAN clusters detected (${analytics.min_samples} reports within ${analytics.eps_km} km)` : 'Loading hotspot analysis…', color: 'purple' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Monitor waste reports and response activity across Mzuzu City.</p>
        </div>
        <div className="dashboard-date">REPORT OVERVIEW</div>
      </div>

      {/* Summary cards row */}
      <section className="summary-grid" aria-label="Waste report summary">
        {summary.map((item) => <SummaryCard key={item.title} {...item} />)}
      </section>

      {error && <p className="dashboard-subtitle" role="alert">{error}</p>}

      {/* Hotspot cards */}
      <section>
        <div className="dashboard-section-header">
          <MapPinned size={18} />
          <h2>Waste Hotspot Analysis</h2>
          <span className="dashboard-badge">DBSCAN · {analytics?.eps_km ?? 0.05} km · {analytics?.min_samples ?? 4} reports min</span>
        </div>

        {!analytics && !error && (
          <p className="dashboard-subtitle" style={{ marginTop: 10 }}>Loading hotspot data…</p>
        )}

        {analytics && analytics.total_hotspots === 0 && (
          <div className="dashboard-notice">
            <div className="notice-icon"><AlertTriangle size={22} /></div>
            <div>
              <h2>No hotspots detected yet</h2>
              <p>Independent waste-report coordinates are clustered using the configured DBSCAN distance and minimum sample settings. Submit more reports to start seeing clusters.</p>
            </div>
          </div>
        )}

        {analytics && analytics.total_hotspots > 0 && (
          <div className="hotspot-grid">
            {analytics.hotspots.map((hotspot) => (
              <article key={hotspot.cluster} className="hotspot-card">
                <div className="hotspot-card-header">
                  <span className="hotspot-badge">Hotspot {hotspot.cluster + 1}</span>
                  <span className="hotspot-count">{hotspot.number_of_reports} reports</span>
                </div>
                <div className="hotspot-coords">
                  <MapPinned size={13} />
                  {hotspot.average_latitude.toFixed(5)}, {hotspot.average_longitude.toFixed(5)}
                </div>
                <ul className="hotspot-categories">
                  {Object.entries(hotspot.categories).map(([cat, count]) => (
                    <li key={cat}>
                      <span className="hotspot-cat-dot" />
                      {cat} <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Bottom panels */}
      <section className="dashboard-placeholder-grid">
        <article className="dashboard-placeholder">
          <h2>Recent reports</h2>
          {reports.length
            ? reports.slice(0, 5).map((report) => (
                <p key={report.id}>
                  {report.public_reference} · {report.location_description} · {report.review_status.replaceAll('_', ' ')}
                </p>
              ))
            : <p>{error || (page ? 'No saved reports yet.' : 'Loading reports...')}</p>}
        </article>
        <article className="dashboard-placeholder">
          <h2>Reports by status</h2>
          <div className="placeholder-status-list">
            <div><span className="status-dot pending" />Submitted   <strong>{page ? counts.submitted    || 0 : '—'}</strong></div>
            <div><span className="status-dot progress" />Under review<strong>{page ? counts.under_review || 0 : '—'}</strong></div>
            <div><span className="status-dot resolved" />Resolved    <strong>{page ? counts.resolved     || 0 : '—'}</strong></div>
          </div>
          <p className="placeholder-footnote">Counts reflect the first 100 loaded reports.</p>
        </article>
      </section>
    </div>
  )
}
