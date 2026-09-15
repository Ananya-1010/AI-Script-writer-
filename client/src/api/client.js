import axios from 'axios'

/**
 * One place for auth headers, correlation IDs, and error normalisation, so no
 * component ever handles a raw axios error (spec 3.7).
 */
const TOKEN_KEY = 'asw.accessToken'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 60000
})

api.interceptors.request.use((request) => {
  const token = tokenStore.get()
  if (token) request.headers.Authorization = `Bearer ${token}`
  request.headers['X-Request-Id'] = `req_${crypto.randomUUID().slice(0, 12)}`
  return request
})

/**
 * Every failure reaches the UI in the same shape, so screens can render a
 * plain-language message, a reason category and a retry action instead of a
 * stack trace or a raw provider error (spec 8.3).
 */
export class ApiError extends Error {
  constructor ({ code, message, requestId, correlationId, retryable }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.requestId = requestId
    this.correlationId = correlationId
    this.retryable = retryable
  }
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const envelope = error.response?.data?.error

    if (envelope) {
      // An expired session is the one error the client acts on itself.
      if (envelope.code === 'AUTH_ERROR') tokenStore.clear()
      return Promise.reject(new ApiError(envelope))
    }

    // No envelope means we never reached the API: offline, CORS, or a timeout.
    return Promise.reject(new ApiError({
      code: error.code === 'ECONNABORTED' ? 'LLM_TIMEOUT' : 'GENERATION_FAILED',
      message: 'We could not reach the server. Check your connection and try again.',
      retryable: true
    }))
  }
)
