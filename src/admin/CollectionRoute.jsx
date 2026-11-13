import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import './CollectionRoute.css'

export default function CollectionRoute() {
  const { token } = useAuth()
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadRoute() {
    setLoading(true)
    setError('')
    try {
      setRoute(await apiRequest('/admin/routing/optimized', { token }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoute() }, [token])

  return <section className="collection-route-page">
    <div className="collection-route-heading">
      <div><p className="collection-route-eyebrow">OPERATIONS</p><h1>Optimized collection route</h1><p>Shortest practical order for unresolved reports using their independent stored coordinates.</p></div>
      <button type="button" onClick={loadRoute} disabled={loading}><RefreshCw size={16} />{loading ? 'Calculating…' : 'Recalculate route'}</button>
    </div>
    {error && <p className="collection-route-error" role="alert">{error}</p>}
    {route && <div className="collection-route-summary"><strong>{route.stop_count} stops</strong><span>{route.total_distance_km} km estimated travel distance</span><small>{route.method}</small></div>}
    <div className="collection-route-list">{(route?.stops || []).map((stop) => <article key={stop.report_id}><span>{stop.sequence}</span><div><strong>{stop.location_description}</strong><small>{stop.public_reference} · {stop.category}</small></div></article>)}</div>
  </section>
}
