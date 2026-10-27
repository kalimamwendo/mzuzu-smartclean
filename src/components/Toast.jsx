import { useEffect } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import './Toast.css'

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(onClose, 5000)
    return () => window.clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null
  const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'success' ? CheckCircle2 : Info
  return <div className={`app-toast app-toast-${toast.type || 'info'}`} role={toast.type === 'error' ? 'alert' : 'status'}>
    <Icon size={20} /><span>{toast.message}</span>
    <button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={17} /></button>
  </div>
}
