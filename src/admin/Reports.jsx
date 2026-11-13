import { useEffect, useState } from 'react'
import { ClipboardList, Download, FileText } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { apiRequest, API_BASE_URL } from '../api'
import './Reports.css'

const STATUSES = ['submitted', 'under_review', 'verified', 'resolved', 'rejected']

function getPhotoUrl(photoReference) {
  if (!photoReference) return ''
  return new URL(photoReference, API_BASE_URL).toString()
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
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

  function exportCsv() {
    const headers = ['Reference', 'Location', 'Category', 'Description', 'Latitude', 'Longitude', 'Submitted', 'Status']
    const rows = (page?.items || []).map((report) => [
      report.public_reference,
      report.location_description,
      report.category.name,
      report.description,
      report.latitude,
      report.longitude,
      new Date(report.reported_at).toISOString(),
      report.review_status.replaceAll('_', ' '),
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `smartclean-waste-reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      setError('Allow pop-ups to export the reports as a PDF.')
      return
    }
    const rows = (page?.items || []).map((report) => `
      <tr>
        <td>${report.public_reference}</td>
        <td>${report.location_description}</td>
        <td>${report.category.name}</td>
        <td>${report.review_status.replaceAll('_', ' ')}</td>
        <td>${new Date(report.reported_at).toLocaleString()}</td>
      </tr>
    `).join('')
    printWindow.document.write(`
      <!doctype html>
      <html><head><title>SmartClean Waste Reports</title>
      <style>
        body { font-family: Arial, sans-serif; color: #17231a; padding: 28px; }
        h1 { color: #14532d; margin-bottom: 4px; }
        p { color: #64748b; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 22px; }
        th, td { border: 1px solid #dbe5dd; padding: 9px; text-align: left; font-size: 11px; }
        th { color: #14532d; background: #f0fdf4; }
      </style></head>
      <body><h1>Mzuzu SmartClean</h1><p>Waste reports · ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>Reference</th><th>Location</th><th>Category</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <section className="admin-reports-page">
      <div className="admin-reports-heading">
        <div>
          <h1>Waste reports</h1>
          <p>Review and manage citizen waste reports.</p>
        </div>
        <div className="admin-reports-heading-actions">
          <span>{page ? `${page.total} reports` : 'Loading'}</span>
          <button type="button" className="reports-export-button" onClick={exportCsv} disabled={!page?.items.length}><Download size={15} /> CSV</button>
          <button type="button" className="reports-export-button reports-export-pdf" onClick={exportPdf} disabled={!page?.items.length}><FileText size={15} /> PDF</button>
        </div>
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
