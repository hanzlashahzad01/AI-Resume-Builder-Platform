import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, ok: false, message: '' })

  useEffect(() => {
    const token = params.get('token')
    async function run() {
      try {
        const { data } = await api.get('/api/auth/verify', { params: { token } })
        setState({ loading: false, ok: data?.ok, message: data?.ok ? 'Email verified successfully.' : 'Verification failed.' })
        setTimeout(() => navigate('/auth/login'), 1500)
      } catch (err) {
        const msg = err?.response?.data?.message || 'Verification failed'
        setState({ loading: false, ok: false, message: msg })
      }
    }
    if (token) run()
    else setState({ loading: false, ok: false, message: 'Missing token' })
  }, [params, navigate])

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto card p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Verify Email</h1>
        {state.loading ? <p>Verifying…</p> : <p>{state.message}</p>}
      </div>
    </div>
  )
}
