import { UserRound, ShieldCheck } from 'lucide-react'

export default function Profile() {
  return (
    <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
      <h1 style={{ color: '#166534', marginTop: 0 }}>Administrator Profile</h1>
      <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
        View the administrator profile for the SmartClean demonstration.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '28px', padding: '22px', background: '#f0fdf4', borderRadius: '14px' }}>
        <div style={{ width: '65px', height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', borderRadius: '50%' }}>
          <UserRound size={32} color="#166534" />
        </div>

        <div>
          <h2 style={{ margin: '0 0 7px', color: '#166534' }}>System Administrator</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>SmartClean administrator (demo)</p>
          <p style={{ margin: '8px 0 0', color: '#15803d', fontSize: '13px' }}>
            <ShieldCheck size={15} style={{ verticalAlign: 'middle' }} /> Demonstration profile — not authenticated
          </p>
        </div>
      </div>
    </section>
  )
}
