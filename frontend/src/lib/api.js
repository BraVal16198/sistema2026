const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function getApiUrl() {
  return API_URL
}

export function getAccessToken() {
  try {
    return localStorage.getItem('accessToken') ?? ''
  } catch {
    return ''
  }
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers ?? {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  return response
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(' ')
          : `Error ${response.status}`
    throw new Error(message)
  }
  return data
}
