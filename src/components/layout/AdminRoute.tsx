import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
