import axios from 'axios'

// Base URL of the backend REST API.
// Defaults to "/api", which the Vite dev server proxies to the backend
// (see vite.config.js). Set VITE_API_BASE_URL to point at a deployed backend.
// Note: every VITE_* variable is bundled into the browser code, so it must
// never contain a secret. Only a public URL belongs here.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Demo mode answers requests in the browser with sample data instead of
// calling the backend. Turn it on with "npm run demo" or VITE_DEMO_MODE=true.
// The dynamic import keeps the demo code out of normal production builds.
export const DEMO_MODE = import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO_MODE === 'true'

if (DEMO_MODE) {
  api.defaults.adapter = async (config) => {
    const { default: demoAdapter } = await import('../demo/demoAdapter')
    return demoAdapter(config)
  }
}

// Attach the JWT (if the user is logged in) to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle expired or invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 on a request that carried a token = the login has expired.
    // A guest (no token) just gets the error, without being sent to the login page.
    const hadToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// True when the request never reached the backend (server not running,
// network down, or the dev proxy could not connect).
export const isBackendUnavailable = (error) => {
  if (!error.response) return true
  const status = error.response.status
  // The Vite dev proxy answers 500 with an empty body when the backend is down
  return status === 502 || status === 503 || status === 504 ||
    (status === 500 && !error.response.data)
}

// Turns an axios error into a message that can be shown to the user
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (isBackendUnavailable(error)) {
    return 'Cannot reach the server. The backend API is not running or not connected.'
  }
  return error.response?.data?.error || fallback
}

export default api
