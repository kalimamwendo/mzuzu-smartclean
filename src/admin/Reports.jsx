import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { apiRequest, API_BASE_URL } from '../api'
import './Reports.css'

const STATUSES = ['submitted', 'under_review', 'verified', 'resolved', 'rejected']

function getPhotoUrl(photoReference) {
  if (!photoReference) return ''
  return new URL(photoReference, API_BASE_URL).toString()
}

export default function Reports() {
  const { token } = useAuth()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')

  async function loadReports() {
    try {
      setPage(await apiRequest('/admin/reports?page=1&page_size=100', { token }))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  useEffect(() => { loadReports() }, [token])

  async function updateStatus(reportId, nextStatus) {
    setSavingId(reportId)
    try {
      await apiRequest(`/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: nextStatus }),
      })
      await loadReports()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingId('')
    }
  }

  return (
    <section className="admin-reports-page">
      <div className="admin-reports-heading">
        <div>
          <h1>Waste reports</h1>
          <p>Review reports saved in the SmartClean database.</p>
        </div>
        <span>{page ? `${page.total} reports` : 'Loading'}</span>
      </div>
      {error && <p role="alert" className="admin-reports-error">{error}</p>}
      {!error && page?.items.length === 0 && <div className="admin-reports-empty"><ClipboardList size={36} /><h2>No reports yet</h2><p>Reports submitted by citizens will appear here.</p></div>}
      {!!page?.items.length && (
        <div className="admin-reports-table-wrap">
          <table className="admin-reports-table">
            <thead><tr><th>Reference / location</th><th>Category and details</th><th>Photo</th><th>Coordinates</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>{page.items.map((report) => (
              <tr key={report.id}>
                <td><strong>{report.public_reference}</strong><br />{report.location_description}</td>
                <td><strong>{report.category.name}</strong><br />{report.description}</td>
                <td>{report.photo_reference ? <a className="admin-report-photo-link" href={getPhotoUrl(report.photo_reference)} target="_blank" rel="noreferrer"><img className="admin-report-photo" src={getPhotoUrl(report.photo_reference)} alt={`Waste reported at ${report.location_description}`} /></a> : <span className="admin-report-no-photo">No photo</span>}</td>
                <td>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</td>
                <td>{new Date(report.reported_at).toLocaleString()}</td>
                <td><select aria-label={`Change status for ${report.public_reference}`} value={report.review_status} disabled={savingId === report.id} onChange={(event) => updateStatus(report.id, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
