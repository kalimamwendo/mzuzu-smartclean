const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

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
    throw new Error(`SmartClean API is unavailable at ${API_BASE_URL}. Start the FastAPI server, then try again.`)
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    throw new Error(typeof detail === 'string' ? detail : 'The request could not be completed.')
  }
  return payload
}

export { API_BASE_URL }
