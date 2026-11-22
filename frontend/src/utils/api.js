import axios from 'axios'

// /api is proxied by vite in dev
// VITE_ vars end up in the browser, no secrets
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// dynamic import keeps demo code out of normal builds
export const DEMO_MODE = import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO_MODE === 'true'

if (DEMO_MODE) {
  api.defaults.adapter = async (config) => {
    const { default: demoAdapter } = await import('../demo/demoAdapter')
    return demoAdapter(config)
  }
}

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 with a token = login expired, guests just get the error
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

// request never reached the backend
export const isBackendUnavailable = (error) => {
  if (!error.response) return true
  const status = error.response.status
  // vite proxy gives an empty 500 when backend is down
  return status === 502 || status === 503 || status === 504 ||
    (status === 500 && !error.response.data)
}

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (isBackendUnavailable(error)) {
    return 'Cannot reach the server. The backend API is not running or not connected.'
  }
  return error.response?.data?.error || fallback
}

export default api
