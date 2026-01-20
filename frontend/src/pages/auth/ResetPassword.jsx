import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

const schema = z.object({
  password: z.string().min(6),
})

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      await api.post('/api/auth/reset', { token, password: values.password })
      alert('Password reset successfully')
      navigate('/auth/login')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Reset failed'
      alert(msg)
    }
  }

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-semibold mb-6">Reset Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input className="input" placeholder="New password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <button className="btn w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}
