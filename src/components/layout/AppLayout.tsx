import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'
import OfflineBanner from './OfflineBanner'
import FloatingTimer from '../focus/FloatingTimer'
import { useAuth } from '../../store/useAuth'
import { usePomodoroEngine } from '../../hooks/usePomodoroEngine'

export default function AppLayout() {
  const user = useAuth((s) => s.user)

  usePomodoroEngine()

  const handleLogout = () => {
    void useAuth.getState().logout()
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />
      <Sidebar />
      <div className="pb-20 lg:pl-64 lg:pb-8">
        <header className="flex items-center justify-between gap-2 px-4 pt-4 lg:hidden">
          <span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">Study Dashboard</span>
          <div className="flex min-w-0 shrink items-center gap-2">
            <span className="max-w-24 truncate text-sm font-medium text-gray-600 dark:text-gray-400">{user?.login}</span>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              Выйти
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <FloatingTimer />
    </div>
  )
}
