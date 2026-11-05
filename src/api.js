function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const queryApi = urlParams.get('api')
      if (queryApi && queryApi.trim()) {
        const cleaned = queryApi.trim().replace(/\/+$/, '')
        const full = cleaned.endsWith('/api/v1') ? cleaned : `${cleaned}/api/v1`
        window.localStorage.setItem('smartclean_api_url', full)
        return full
      }
    } catch {
      // Ignore URL parsing errors
    }
    const custom = window.localStorage.getItem('smartclean_api_url')
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '')
  }

  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && envUrl.trim() && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
    const trimmed = envUrl.trim().replace(/\/+$/, '')
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
  }

  // Automatic Render fallback: when loaded from a .onrender.com domain, probe the known backend service.
  // The companion service is mzuzu-smartclean-3 regardless of this frontend's numeric suffix.
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.onrender.com')) {
    // Try named-pattern replacement first (works if services follow *-frontend / *-api convention)
    const byName = window.location.origin.replace(/-frontend(\b|$)/, '-api')
    if (byName !== window.location.origin) return `${byName}/api/v1`
    // Fallback: replace the numeric suffix with the known backend service name
    const knownBackend = window.location.origin.replace(
      /mzuzu-smartclean-\d+/,
      'mzuzu-smartclean-3'
    )
    return `${knownBackend}/api/v1`
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
    throw new Error(`SmartClean API is unavailable at ${API_BASE_URL}. Ensure your Render backend service is awake and running.`)
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  
  if (response.status !== 204 && !isJson) {
    throw new Error(`Invalid response from ${API_BASE_URL}. The request reached a static HTML page instead of the backend API. Please configure VITE_API_URL in Render to your backend URL.`)
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    throw new Error(typeof detail === 'string' ? detail : 'The request could not be completed.')
  }
  if (response.status !== 204 && payload === null) {
    throw new Error(`The API at ${API_BASE_URL} returned an empty or unparseable response.`)
  }
  return payload
}

export { API_BASE_URL }
