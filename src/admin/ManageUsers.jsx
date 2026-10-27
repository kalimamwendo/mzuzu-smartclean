import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Users, UserRound, LoaderCircle } from 'lucide-react'
import { apiRequest } from '../api'
import { useAuth } from '../AuthContext'
import Toast from '../components/Toast'

export default function ManageUsers() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiRequest('/admin/users?page=1&page_size=100', { token })
      setUsers(result.items)
      setTotal(result.total)
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function updateRole(user, role) {
    if (role === user.role) return
    setSavingId(user.id)
    try {
      const updated = await apiRequest(`/admin/users/${user.id}/role`, {
        method: 'PATCH', token, body: JSON.stringify({ role }),
      })
      setUsers((rows) => rows.map((row) => row.id === updated.id ? updated : row))
      setToast({ type: 'success', message: `${updated.display_name} is now ${role.replace('_', ' ')}.` })
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setSavingId(null)
    }
  }

  return <section className="manage-users-page">
    <Toast toast={toast} onClose={dismissToast} />
    <div className="manage-users-heading"><div><span className="manage-users-eyebrow">ACCESS CONTROL</span><h1>Manage users</h1><p>Review accounts and grant administrator access to trusted team members.</p></div><div className="manage-users-count"><Users size={19} /> {total} accounts</div></div>
    {loading ? <div className="manage-users-loading"><LoaderCircle className="manage-users-spin" /> Loading accounts…</div> : users.length === 0 ? <div className="manage-users-empty">No accounts have been created yet.</div> : <div className="manage-users-table-wrap"><table className="manage-users-table"><thead><tr><th>User</th><th>Joined</th><th>Account</th><th>Role</th><th>Access</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}>
      <td><div className="manage-user-cell"><span className="manage-user-avatar"><UserRound size={18} /></span><span><strong>{user.display_name}</strong><small>{user.email}</small></span></div></td>
      <td>{new Date(user.created_at).toLocaleDateString()}</td><td><span className={`manage-user-status status-${user.account_status}`}>{user.account_status}</span></td>
      <td><span className={`manage-user-role ${user.role === 'admin' ? 'role-admin' : ''}`}>{user.role === 'admin' && <ShieldCheck size={14} />}{user.role.replace('_', ' ')}</span></td>
      <td><select aria-label={`Change role for ${user.display_name}`} value={user.role} disabled={savingId === user.id} onChange={(event) => updateRole(user, event.target.value)}><option value="citizen">Citizen</option><option value="field_officer">Field officer</option><option value="admin">Administrator</option></select></td>
    </tr>)}</tbody></table></div>}
  </section>
}
