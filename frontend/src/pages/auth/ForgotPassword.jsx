import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../../services/api'

const schema = z.object({
  email: z.string().email(),
})

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post('/api/auth/forgot', values)
      if (data?.reset?.url) alert('Reset link (dev): ' + data.reset.url)
      alert('If the email exists, a reset link has been sent')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Request failed'
      alert(msg)
    }
  }

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-semibold mb-6">Forgot Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input className="input" placeholder="Email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <button className="btn w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
