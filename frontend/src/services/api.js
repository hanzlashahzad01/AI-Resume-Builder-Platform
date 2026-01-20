import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000'),
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let pending = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response && error.response.status === 401 && !original._retry) {
      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await api.post('/api/auth/refresh')
          if (data?.accessToken) {
            localStorage.setItem('accessToken', data.accessToken)
            pending.forEach((cb) => cb(data.accessToken))
            pending = []
          }
        } catch (_) {
          localStorage.removeItem('accessToken')
        } finally {
          isRefreshing = false
        }
      }
      return new Promise((resolve) => {
        pending.push((token) => {
          if (token) original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }
    return Promise.reject(error)
  }
)

export default api
