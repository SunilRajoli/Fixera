import axios from 'axios'

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
function mapKeys(o: unknown): unknown {
  if (o === null || o === undefined) return o
  if (Array.isArray(o)) return o.map(mapKeys)
  if (typeof o === 'object' && o.constructor === Object) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      out[toCamel(k)] = mapKeys(v)
    }
    return out
  }
  return o
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fixera_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'data' in res.data) {
      res.data.data = mapKeys(res.data.data) as typeof res.data.data
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fixera_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
