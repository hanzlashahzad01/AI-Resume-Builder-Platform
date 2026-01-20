import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function ProtectedRoute({ children, role }) {
  const { user, accessToken } = useAuth()
  if (!accessToken) return <Navigate to="/auth/login" replace />
  if (role && user?.role !== role) return <Navigate to="/dashboard" replace />
  return children
}
