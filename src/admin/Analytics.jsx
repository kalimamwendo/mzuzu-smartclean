import { useEffect, useMemo, useState } from 'react'
import { Fragment } from 'react'
import { Circle, CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { BarChart3, MapPinned, Radio, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import 'leaflet/dist/leaflet.css'
import './Analytics.css'

const DEFAULT_CENTER = [-11.465, 34.02]
const CHART_COLORS = ['#15803d', '#22c55e', '#86efac', '#166534', '#4ade80', '#bbf7d0']

function MapViewControls({ boundary, center }) {
  const map = useMap()
  function fitCity() {
    const coordinates = boundary?.features?.flatMap((feature) => {
      const pairs = []
      function collect(value) {
        if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') pairs.push([value[1], value[0]])
        else if (Array.isArray(value)) value.forEach(collect)
      }
      collect(feature.geometry.coordinates)
      return pairs
    }) || []
    const bounds = coordinates.length ? coordinates : null
    if (bounds) map.fitBounds(bounds)
    else map.setView(center, 13)
  }
  return <div className="analytics-map-controls">
    <button type="button" onClick={fitCity}>Fit Mzuzu</button>
    <button type="button" onClick={() => map.setView(center, 13)}>Reset view</button>
  </div>
}

function SummaryCard({ icon: Icon, label, value, detail }) {
  return <article className="analytics-summary-card">
    <span className="analytics-summary-icon"><Icon size={20} /></span>
    <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
  </article>
}

export default function Analytics() {
  const { token } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [boundary, setBoundary] = useState(null)
  const [visibleLayers, setVisibleLayers] = useState({ boundary: true, reports: true, hotspots: true, noise: true })
  const [mapExpanded, setMapExpanded] = useState(false)

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) setError('Analytics is taking too long to load. Check that the backend is running, then refresh the page.')
    }, 10000)
    apiRequest('/admin/analytics', { token })
      .then((result) => { if (active) setAnalytics(result) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => window.clearTimeout(timeout))
    return () => { active = false; window.clearTimeout(timeout) }
  }, [token])

  useEffect(() => {
    const boundaryUrl = 'https://services.arcgis.com/uHAHKfH1Z5ye1Oe0/ArcGIS/rest/services/Malawi_REDD_paper_data/FeatureServer/0/query?where=ADM2_EN%20LIKE%20%27%25Mzuzu%25%27&outFields=ADM2_EN,ADM2_PCODE&returnGeometry=true&outSR=4326&f=geojson'
    fetch(boundaryUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Mzuzu boundary could not be loaded.')
        return response.json()
      })
      .then((geojson) => setBoundary(geojson))
      .catch(() => setBoundary(null))
  }, [])

  const mapCenter = useMemo(() => {
    const point = analytics?.points?.[0]
    return point ? [point.latitude, point.longitude] : DEFAULT_CENTER
  }, [analytics])
  const categoryData = useMemo(() => Object.entries(analytics?.category_counts || {}).map(([name, count]) => ({ name, count })), [analytics])
  const hotspotData = useMemo(() => (analytics?.hotspots || []).map((hotspot) => ({ name: `Hotspot ${hotspot.cluster + 1}`, reports: hotspot.number_of_reports })), [analytics])
  const heatmapData = useMemo(() => {
    const categories = [...new Set((analytics?.hotspots || []).flatMap((hotspot) => Object.keys(hotspot.categories)))]
    return (analytics?.hotspots || []).map((hotspot) => categories.reduce((row, category) => ({ ...row, name: `Hotspot ${hotspot.cluster + 1}`, [category]: hotspot.categories[category] || 0 }), {}))
  }, [analytics])

  return <section className="analytics-page">
    <div className="analytics-heading">
      <div><p className="analytics-eyebrow">DATA INSIGHTS</p><h1>Analytics & Hotspots</h1><p>Live DBSCAN analysis of citizen waste reports in Mzuzu City.</p></div>
      <span className="analytics-method">DBSCAN · 200 m · 3 reports</span>
    </div>
    {error && <p className="analytics-error" role="alert">{error}</p>}
    {!analytics && !error && <p className="analytics-loading">Loading analysis...</p>}
    {analytics && <>
      <div className="analytics-summary-grid">
        <SummaryCard icon={BarChart3} label="Total reports" value={analytics.total_reports} detail="Reports analysed" />
        <SummaryCard icon={MapPinned} label="Waste hotspots" value={analytics.total_hotspots} detail="Detected clusters" />
        <SummaryCard icon={Radio} label="Isolated reports" value={analytics.isolated_reports} detail="Outside clusters" />
        <SummaryCard icon={TrendingUp} label="Clustered reports" value={`${analytics.clustered_percentage}%`} detail="Of all reports" />
      </div>
      <div className="analytics-content-grid">
        <article className={`analytics-panel analytics-map-panel ${mapExpanded ? 'analytics-map-expanded' : ''}`}>
          <div className="analytics-panel-heading"><div><h2>Mzuzu SmartClean Waste Hotspot Map</h2><p>OpenStreetMap street data with live citizen reports and DBSCAN hotspots.</p></div><button className="analytics-map-expand" type="button" onClick={() => setMapExpanded((expanded) => !expanded)}>{mapExpanded ? 'Exit fullscreen' : 'Open fullscreen'}</button></div>
          <div className="analytics-map-tools">
            <label><input type="checkbox" checked={visibleLayers.boundary} onChange={(event) => setVisibleLayers({ ...visibleLayers, boundary: event.target.checked })} /> City boundary</label>
            <label><input type="checkbox" checked={visibleLayers.reports} onChange={(event) => setVisibleLayers({ ...visibleLayers, reports: event.target.checked })} /> Waste reports</label>
            <label><input type="checkbox" checked={visibleLayers.hotspots} onChange={(event) => setVisibleLayers({ ...visibleLayers, hotspots: event.target.checked })} /> DBSCAN hotspots</label>
            <label><input type="checkbox" checked={visibleLayers.noise} onChange={(event) => setVisibleLayers({ ...visibleLayers, noise: event.target.checked })} /> Isolated reports</label>
          </div>
          <div className="analytics-map-shell">
          <MapContainer className="analytics-map" center={mapCenter} zoom={13} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {visibleLayers.boundary && boundary && <GeoJSON data={boundary} style={{ color: '#ff0000', weight: 6, opacity: 1, fillColor: '#ffff00', fillOpacity: 0.08, lineCap: 'round', lineJoin: 'round' }} onEachFeature={(feature, layer) => { layer.bindTooltip('Mzuzu City Administrative Boundary', { sticky: true }); layer.on({ mouseover: () => layer.setStyle({ color: '#00ffff', weight: 9, fillOpacity: 0.15 }), mouseout: () => layer.setStyle({ color: '#ff0000', weight: 6, fillOpacity: 0.08 }) }) }} />}
            {visibleLayers.reports && analytics.points.filter((point) => point.cluster !== -1).map((point) => <CircleMarker key={point.report_id} center={[point.latitude, point.longitude]} radius={7} pathOptions={{ color: '#15803d', weight: 2, fillColor: '#15803d', fillOpacity: 0.9 }}>
              <Tooltip sticky>{point.location_description}</Tooltip>
              <Popup><strong>Mzuzu SmartClean Waste Report</strong><br /><b>Submitted place:</b> {point.location_description}<br /><b>Report:</b> {point.public_reference}<br /><b>Category:</b> {point.category}<br /><b>DBSCAN cluster:</b> {point.cluster}<br /><b>Latitude:</b> {point.latitude.toFixed(6)}<br /><b>Longitude:</b> {point.longitude.toFixed(6)}</Popup>
            </CircleMarker>)}
            {visibleLayers.noise && analytics.points.filter((point) => point.cluster === -1).map((point) => <CircleMarker key={point.report_id} center={[point.latitude, point.longitude]} radius={6} pathOptions={{ color: point.boundary_status === 'outside' ? '#dc2626' : '#6b7280', weight: 2, fillColor: point.boundary_status === 'outside' ? '#dc2626' : '#6b7280', fillOpacity: 0.8 }}>
              <Tooltip sticky>{point.location_description}</Tooltip>
              <Popup><strong>{point.boundary_status === 'outside' ? 'Report outside Mzuzu boundary' : 'Isolated Waste Report'}</strong><br /><b>Submitted place:</b> {point.location_description}<br /><b>Report:</b> {point.public_reference}<br /><b>Category:</b> {point.category}<br /><b>DBSCAN:</b> Noise (-1)</Popup>
            </CircleMarker>)}
            {visibleLayers.hotspots && analytics.hotspots.map((hotspot) => <Fragment key={`hotspot-${hotspot.cluster}`}>
              <Circle center={[hotspot.average_latitude, hotspot.average_longitude]} radius={150} pathOptions={{ color: '#0066ff', weight: 3, fillColor: '#0066ff', fillOpacity: 0.08 }} />
              <CircleMarker center={[hotspot.average_latitude, hotspot.average_longitude]} radius={10} pathOptions={{ color: '#0066ff', weight: 3, fillColor: '#0066ff', fillOpacity: 0.95 }}>
                <Tooltip sticky>{`DBSCAN Hotspot ${hotspot.cluster} - ${hotspot.number_of_reports} reports`}</Tooltip>
                <Popup><strong>DBSCAN Waste Hotspot {hotspot.cluster}</strong><br /><b>Number of reports:</b> {hotspot.number_of_reports}<br /><b>Centre:</b> {hotspot.average_latitude.toFixed(6)}, {hotspot.average_longitude.toFixed(6)}<br /><b>Categories:</b> {Object.entries(hotspot.categories).map(([category, count]) => `${category}: ${count}`).join(', ')}</Popup>
              </CircleMarker>
            </Fragment>)}
            <MapViewControls boundary={boundary} center={mapCenter} />
          </MapContainer>
          <div className="analytics-map-legend"><strong>MZUZU SMARTCLEAN</strong><b>Waste Hotspot Map</b><hr /><span><i className="legend-boundary" /> Mzuzu City Boundary</span><span><i className="legend-dot legend-green" /> Waste report inside boundary</span><span><i className="legend-dot legend-red" /> Waste report outside boundary</span><span><i className="legend-dot legend-blue" /> DBSCAN hotspot</span><span><i className="legend-dot legend-gray" /> Isolated / noise report</span><small>Street names: OpenStreetMap</small></div>
          </div>
        </article>
      </div>
      <article className="analytics-panel category-panel">
        <h2>Notebook analysis plots</h2>
        <div className="analytics-plot-grid">
          <div className="analytics-plot"><h3>Waste Report Categories</h3>{categoryData.length ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={categoryData} dataKey="count" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{categoryData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><ChartTooltip /><Legend /></PieChart></ResponsiveContainer> : <p className="analytics-muted">No category data.</p>}</div>
          <div className="analytics-plot"><h3>Reports per Hotspot</h3>{hotspotData.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={hotspotData} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={80} /><ChartTooltip /><Bar dataKey="reports" fill="#15803d" label={{ position: 'right' }} /></BarChart></ResponsiveContainer> : <p className="analytics-muted">No hotspots detected yet.</p>}</div>
          <div className="analytics-plot"><h3>Geographical Hotspot Distribution</h3>{analytics.points.length ? <ResponsiveContainer width="100%" height={240}><ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 5 }}><CartesianGrid /><XAxis type="number" dataKey="longitude" name="Longitude" /><YAxis type="number" dataKey="latitude" name="Latitude" /><ChartTooltip cursor={{ strokeDasharray: '3 3' }} /><Legend /><Scatter name="Reports" data={analytics.points} fill="#dc2626">{analytics.points.map((point) => <Cell key={point.report_id} fill={point.cluster === -1 ? '#9ca3af' : CHART_COLORS[point.cluster % CHART_COLORS.length]} />)}</Scatter></ScatterChart></ResponsiveContainer> : <p className="analytics-muted">No report coordinates.</p>}</div>
          <div className="analytics-plot"><h3>Waste Types by Hotspot</h3>{heatmapData.length ? <div className="analytics-heatmap">{heatmapData.map((row) => <div className="analytics-heatmap-row" key={row.name}><strong>{row.name}</strong>{Object.entries(row).filter(([key]) => key !== 'name').map(([category, count]) => <span key={category} title={`${category}: ${count}`} style={{ opacity: count ? 0.3 + count / Math.max(1, analytics.total_reports) : 0.08 }}>{count}</span>)}</div>)}<small>Each cell shows the category count for that hotspot.</small></div> : <p className="analytics-muted">No hotspot categories yet.</p>}</div>
        </div>
      </article>
    </>}
  </section>
}
