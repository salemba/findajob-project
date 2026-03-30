import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail
    let message: string
    if (Array.isArray(detail)) {
      // Pydantic v2 returns an array of {loc, msg, type, input, ctx} objects
      message = detail
        .map((e: { msg?: string; loc?: (string | number)[] }) => {
          const field = e.loc?.slice(1).join('.')
          return field ? `${field}: ${e.msg}` : (e.msg ?? 'Erreur de validation')
        })
        .join(' | ')
    } else {
      message =
        detail ||
        error.response?.data?.message ||
        error.message ||
        'Une erreur est survenue'
    }
    toast.error(message)
    return Promise.reject(error)
  }
)

export default api
