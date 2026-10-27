import { BarChart3 } from 'lucide-react'

export default function Analytics() {
  return (
    <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
      <h1 style={{ color: '#166534', marginTop: 0 }}>Waste Analytics</h1>
      <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
        Explore waste-report patterns and spatial clusters identified by DBSCAN.
      </p>

      <div style={{ padding: '35px 15px', textAlign: 'center', background: '#f0fdf4', borderRadius: '12px' }}>
        <BarChart3 size={38} color="#15803d" />
        <h3 style={{ color: '#166534' }}>Spatial and statistical analysis</h3>
        <p style={{ color: '#6b7280' }}>
          Charts will be connected to the actual analysis results after the dataset and DBSCAN outputs are integrated.
        </p>
      </div>
    </section>
  )
}
