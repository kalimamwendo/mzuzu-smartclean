function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('smartclean_api_url')
    if (custom) return custom.replace(/\/+$/, '')
  }

  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && envUrl.trim() && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
    const trimmed = envUrl.trim().replace(/\/+$/, '')
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
  }

  // Automatic Render fallback: when loaded from a .onrender.com domain, target the companion API service
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.onrender.com')) {
    const renderApiOrigin = window.location.origin.replace('-frontend', '-api')
    return `${renderApiOrigin}/api/v1`
  }

  const fallback = (envUrl || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '')
  return fallback.endsWith('/api/v1') ? fallback : `${fallback}/api/v1`
}

const API_BASE_URL = resolveApiBaseUrl()

export async function apiRequest(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error(`SmartClean API is unavailable at ${API_BASE_URL}. Start the FastAPI server or verify your backend service URL on Render, then try again.`)
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    throw new Error(typeof detail === 'string' ? detail : 'The request could not be completed.')
  }
  return payload
}

export { API_BASE_URL }
