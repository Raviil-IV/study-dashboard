import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function ProtectedRoute() {
  const status = useAuth((s) => s.status)
  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">Загрузка…</div>
  }
  if (status === 'guest') return <Navigate to="/login" replace />
  return <Outlet />
}
